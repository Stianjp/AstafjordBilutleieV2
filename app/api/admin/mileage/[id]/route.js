import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";
import {
  calculateMileageMetrics,
  getCarByIdForKm,
  resolveKmPayload,
  syncBookingKmFromMileage,
  updateCarKmAndInsurance
} from "../../../../../lib/kmService";

const EXTRA_KM_RATE = 2.5;

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();

  const { data: existing, error: existingError } = await supabaseService
    .from("mileage_logs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }

  const carId = payload.car_id || existing.car_id;
  const bookingId = payload.booking_id ?? existing.booking_id;
  let includedKm = null;
  let booking = null;
  if (bookingId) {
    const { data: bookingData } = await supabaseService
      .from("bookings")
      .select("id, included_km")
      .eq("id", bookingId)
      .single();
    booking = bookingData || null;
    includedKm = bookingData?.included_km ?? null;
  }

  let car;
  try {
    car = await getCarByIdForKm({ supabase: supabaseService, carId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  const requestedStartKm = payload.km_start ?? existing.km_start ?? null;
  const requestedEndKm = payload.km_end ?? existing.km_end ?? null;

  let km;
  try {
    km = resolveKmPayload({
      authoritativeKm: car.current_km,
      requestedStartKm,
      requestedEndKm,
      previousStartKm: existing.km_start,
      previousEndKm: existing.km_end,
      overrideReason: payload.override_reason || payload.km_override_reason || existing.override_reason || "",
      requireEndKm: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const metrics = calculateMileageMetrics({
    startKm: km.startKm,
    endKm: km.endKm,
    includedKm,
    extraKmRate: EXTRA_KM_RATE
  });

  const { data: updated, error: updateError } = await supabaseService
    .from("mileage_logs")
    .update({
      booking_id: bookingId || null,
      car_id: carId,
      km_start: km.startKm,
      km_end: km.endKm,
      driven_km: metrics.drivenKm,
      extra_km: metrics.extraKm,
      extra_cost: metrics.extraCost,
      reason: payload.reason ?? existing.reason ?? null,
      override_reason: km.overrideReason ?? existing.override_reason ?? null,
      source: payload.source || existing.source || "manual",
      updated_at: new Date().toISOString()
    })
    .eq("id", params.id)
    .select("*, cars(model, reg_number)")
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  try {
    if (booking?.id) {
      await syncBookingKmFromMileage({
        supabase: supabaseService,
        bookingId: booking.id,
        startKm: km.startKm,
        endKm: km.endKm
      });
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

  return Response.json({ log: updated });
}
