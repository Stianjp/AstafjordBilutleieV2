import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";
import { sendBookingDecisionEmail } from "../../../../../lib/email";
import { calculateDays, calculateFinalPrice, calculateIncludedKm, calculateFees } from "../../../../../lib/pricing";

export async function PATCH(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const status = payload.status;
  if (!status || !["approved", "rejected", "cancelled"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: booking, error } = await supabaseService
    .from("bookings")
    .update({ status })
    .eq("id", params.id)
    .select("*, customers(*), cars(*)")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await sendBookingDecisionEmail({
    customer: booking.customers,
    booking,
    status
  });

  return Response.json({ booking });
}

export async function GET(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("bookings")
    .select("*, customers(*), cars(*), pickup:pickup_location_id(*), delivery:delivery_location_id(*)")
    .eq("id", params.id)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ booking: data });
}

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();

  const { data: booking, error: bookingError } = await supabaseService
    .from("bookings")
    .select("*, cars(*)")
    .eq("id", params.id)
    .single();

  if (bookingError) {
    return Response.json({ error: bookingError.message }, { status: 500 });
  }

  const uniqueLocationIds = Array.from(
    new Set([payload.pickup_location_id, payload.delivery_location_id])
  );
  const { data: locations, error: locationError } = await supabaseService
    .from("locations")
    .select("*")
    .in("id", uniqueLocationIds);

  if (locationError || locations.length !== uniqueLocationIds.length) {
    return Response.json({ error: "Fant ikke lokasjon" }, { status: 404 });
  }

  const pickupLocation = locations.find((loc) => loc.id === payload.pickup_location_id);
  const deliveryLocation = locations.find((loc) => loc.id === payload.delivery_location_id);

  const days = payload.days ? Number(payload.days) : calculateDays(payload.start_date, payload.end_date);
  if (!days || days <= 0) {
    return Response.json({ error: "Ugyldig antall dager" }, { status: 400 });
  }

  let { deliveryFee, pickupFee } = calculateFees(pickupLocation, deliveryLocation);
  if (booking.cars.current_location_id === pickupLocation.id) {
    deliveryFee = 0;
  }

  const basePrice = calculateFinalPrice(days, Number(booking.cars.daily_price), Number(booking.cars.monthly_price_cap));
  const calculatedPrice = payload.calculated_price != null
    ? Number(payload.calculated_price)
    : basePrice + deliveryFee + pickupFee;

  const { data: updated, error: updateError } = await supabaseService
    .from("bookings")
    .update({
      pickup_location_id: payload.pickup_location_id,
      delivery_location_id: payload.delivery_location_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      days,
      included_km: calculateIncludedKm(days),
      delivery_fee: deliveryFee,
      pickup_fee: pickupFee,
      calculated_price: calculatedPrice
    })
    .eq("id", params.id)
    .select("*, customers(*), cars(*), pickup:pickup_location_id(*), delivery:delivery_location_id(*)")
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ booking: updated });
}
