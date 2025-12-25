import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

const EXTRA_KM_RATE = 2.5;

export async function POST(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  if (!payload.booking_id || payload.km_start == null || payload.km_end == null) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  if (payload.km_end < payload.km_start) {
    return Response.json({ error: "Ugyldig kilometerstand" }, { status: 400 });
  }

  const { data: booking, error: bookingError } = await supabaseService
    .from("bookings")
    .select("*, cars(*)")
    .eq("id", payload.booking_id)
    .single();

  if (bookingError) {
    return Response.json({ error: bookingError.message }, { status: 500 });
  }

  const drivenKm = payload.km_end - payload.km_start;
  const extraKm = Math.max(0, drivenKm - booking.included_km);
  const extraCost = extraKm * EXTRA_KM_RATE;

  const { data: log, error } = await supabaseService
    .from("mileage_logs")
    .insert({
      booking_id: booking.id,
      car_id: booking.car_id,
      km_start: payload.km_start,
      km_end: payload.km_end,
      driven_km: drivenKm,
      extra_km: extraKm,
      extra_cost: extraCost
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await supabaseService
    .from("cars")
    .update({ current_km: payload.km_end })
    .eq("id", booking.car_id);

  return Response.json({ mileage: log });
}
