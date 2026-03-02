import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";
import {
  calculateMileageMetrics,
  getCarByIdForKm,
  resolveKmPayload,
  syncBookingKmFromMileage,
  updateCarKmAndInsurance,
  upsertBookingMileageLog
} from "../../../../lib/kmService";

const EXTRA_KM_RATE = 2.5;

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("mileage_logs")
    .select("*, cars(model, reg_number)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ logs: data });
}

export async function POST(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  if ((!payload.booking_id && !payload.car_id) || payload.km_end == null) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  let booking = null;
  let existingBookingLog = null;
  if (payload.booking_id) {
    const { data: bookingData, error: bookingError } = await supabaseService
      .from("bookings")
      .select("id, car_id, included_km, start_km, end_km")
      .eq("id", payload.booking_id)
      .single();

    if (bookingError) {
      return Response.json({ error: bookingError.message }, { status: 500 });
    }
    booking = bookingData;

    const { data: existingLog } = await supabaseService
      .from("mileage_logs")
      .select("id, km_start, km_end")
      .eq("booking_id", payload.booking_id)
      .maybeSingle();
    existingBookingLog = existingLog || null;
  }

  const carId = payload.car_id || booking.car_id;
  let car;
  try {
    car = await getCarByIdForKm({ supabase: supabaseService, carId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  let km;
  try {
    km = resolveKmPayload({
      authoritativeKm: car.current_km,
      requestedStartKm: payload.km_start,
      requestedEndKm: payload.km_end,
      previousStartKm: existingBookingLog?.km_start ?? null,
      previousEndKm: existingBookingLog?.km_end ?? null,
      overrideReason: payload.override_reason || payload.km_override_reason,
      requireEndKm: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const includedKm = booking ? booking.included_km : null;
  let log = null;

  try {
    if (booking?.id) {
      log = await upsertBookingMileageLog({
        supabase: supabaseService,
        bookingId: booking.id,
        carId,
        startKm: km.startKm,
        endKm: km.endKm,
        includedKm,
        reason: payload.reason || null,
        overrideReason: km.overrideReason,
        source: payload.source || "manual",
        extraKmRate: EXTRA_KM_RATE
      });

      await syncBookingKmFromMileage({
        supabase: supabaseService,
        bookingId: booking.id,
        startKm: km.startKm,
        endKm: km.endKm
      });
    } else {
      const metrics = calculateMileageMetrics({
        startKm: km.startKm,
        endKm: km.endKm,
        includedKm: null,
        extraKmRate: EXTRA_KM_RATE
      });
      const { data: inserted, error: insertError } = await supabaseService
        .from("mileage_logs")
        .insert({
          booking_id: null,
          car_id: carId,
          km_start: km.startKm,
          km_end: km.endKm,
          driven_km: metrics.drivenKm,
          extra_km: metrics.extraKm,
          extra_cost: metrics.extraCost,
          reason: payload.reason || null,
          override_reason: km.overrideReason,
          source: payload.source || "manual"
        })
        .select("*, cars(model, reg_number)")
        .single();
      if (insertError) {
        throw new Error(insertError.message);
      }
      log = inserted;
    }

    const currentKm = Number(car.current_km || 0);
    if (km.endKm != null && (km.endChanged || Number(km.endKm) > currentKm)) {
      await updateCarKmAndInsurance({
        supabase: supabaseService,
        car,
        nextKm: km.endKm
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ mileage: log, included_km: includedKm });
}
