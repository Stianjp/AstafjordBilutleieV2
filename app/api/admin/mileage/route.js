import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

const EXTRA_KM_RATE = 2.5;

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("mileage_logs")
    .select("*, cars(model, reg_number)")
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
  if ((!payload.booking_id && !payload.car_id) || payload.km_start == null || payload.km_end == null) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  if (payload.km_end < payload.km_start) {
    return Response.json({ error: "Ugyldig kilometerstand" }, { status: 400 });
  }

  let booking = null;
  if (payload.booking_id) {
    const { data: bookingData, error: bookingError } = await supabaseService
      .from("bookings")
      .select("*, cars(*)")
      .eq("id", payload.booking_id)
      .single();

    if (bookingError) {
      return Response.json({ error: bookingError.message }, { status: 500 });
    }
    booking = bookingData;
  }

  const drivenKm = payload.km_end - payload.km_start;
  const includedKm = booking ? booking.included_km : null;
  const extraKm = booking ? Math.max(0, drivenKm - booking.included_km) : null;
  const extraCost = booking ? extraKm * EXTRA_KM_RATE : null;
  const carId = payload.car_id || booking.car_id;

  const { data: log, error } = await supabaseService
    .from("mileage_logs")
    .insert({
      booking_id: booking?.id || null,
      car_id: carId,
      km_start: payload.km_start,
      km_end: payload.km_end,
      driven_km: drivenKm,
      extra_km: extraKm,
      extra_cost: extraCost,
      reason: payload.reason || null
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await supabaseService
    .from("cars")
    .update({ current_km: payload.km_end })
    .eq("id", carId);

  return Response.json({ mileage: log, included_km: includedKm });
}
