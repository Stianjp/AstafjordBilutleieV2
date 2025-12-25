import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";

const EXTRA_KM_RATE = 2.5;

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  if (!payload.car_id || payload.km_start == null || payload.km_end == null) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  if (payload.km_end < payload.km_start) {
    return Response.json({ error: "Ugyldig kilometerstand" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseService
    .from("mileage_logs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }

  const bookingId = payload.booking_id || existing.booking_id;
  let includedKm = null;
  if (bookingId) {
    const { data: booking } = await supabaseService
      .from("bookings")
      .select("included_km")
      .eq("id", bookingId)
      .single();
    includedKm = booking?.included_km ?? null;
  }

  const drivenKm = Number(payload.km_end) - Number(payload.km_start);
  const extraKm = includedKm != null ? Math.max(0, drivenKm - includedKm) : null;
  const extraCost = extraKm != null ? extraKm * EXTRA_KM_RATE : null;

  const { data: updated, error: updateError } = await supabaseService
    .from("mileage_logs")
    .update({
      booking_id: bookingId || null,
      car_id: payload.car_id,
      km_start: payload.km_start,
      km_end: payload.km_end,
      driven_km: drivenKm,
      extra_km: extraKm,
      extra_cost: extraCost,
      reason: payload.reason || null
    })
    .eq("id", params.id)
    .select("*, cars(model, reg_number)")
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  await supabaseService
    .from("cars")
    .update({ current_km: payload.km_end })
    .eq("id", payload.car_id);

  return Response.json({ log: updated });
}
