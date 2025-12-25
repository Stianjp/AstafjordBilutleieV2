import { supabaseService } from "../../../lib/serverSupabase";
import {
  calculateDays,
  calculateFinalPrice,
  calculateIncludedKm,
  calculateFees,
  isValidLeadTime
} from "../../../lib/pricing";
import { sendBookingEmails } from "../../../lib/email";

export async function POST(request) {
  const payload = await request.json();

  const requiredFields = [
    "car_id",
    "pickup_location_id",
    "delivery_location_id",
    "start_date",
    "end_date",
    "terms_accepted",
    "customer"
  ];

  for (const field of requiredFields) {
    if (!payload[field]) {
      return Response.json({ error: `Missing ${field}` }, { status: 400 });
    }
  }

  if (!payload.customer.email || !payload.customer.first_name || !payload.customer.last_name || !payload.customer.phone) {
    return Response.json({ error: "Missing customer info" }, { status: 400 });
  }

  if (!payload.customer.age_confirmed) {
    return Response.json({ error: "Kunde maa vaere minst 23 ar" }, { status: 400 });
  }

  if (!payload.terms_accepted) {
    return Response.json({ error: "Terms must be accepted" }, { status: 400 });
  }

  if (!isValidLeadTime(payload.start_date)) {
    return Response.json({ error: "Minimum 1 dag ledetid" }, { status: 400 });
  }

  const days = calculateDays(payload.start_date, payload.end_date);
  if (days <= 0) {
    return Response.json({ error: "Ugyldig dato" }, { status: 400 });
  }

  const { data: car, error: carError } = await supabaseService
    .from("cars")
    .select("*")
    .eq("id", payload.car_id)
    .single();

  if (carError || !car) {
    return Response.json({ error: "Fant ikke bil" }, { status: 404 });
  }

  if (!car.active) {
    return Response.json({ error: "Bilen er ikke tilgjengelig" }, { status: 400 });
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

  let { deliveryFee, pickupFee } = calculateFees(pickupLocation, deliveryLocation);

  if (car.current_location_id === pickupLocation.id) {
    deliveryFee = 0;
  }

  const dailyPrice = Number(car.daily_price);
  const monthlyCap = Number(car.monthly_price_cap);
  const basePrice = calculateFinalPrice(days, dailyPrice, monthlyCap);
  const calculatedPrice = basePrice + deliveryFee + pickupFee;

  const { data: existingCustomer } = await supabaseService
    .from("customers")
    .select("*")
    .eq("email", payload.customer.email)
    .maybeSingle();

  let customer = existingCustomer;

  if (!customer) {
    const { data: newCustomer, error: customerError } = await supabaseService
      .from("customers")
      .insert({
        type: payload.customer.type || "private",
        first_name: payload.customer.first_name,
        last_name: payload.customer.last_name,
        email: payload.customer.email,
        phone: payload.customer.phone,
        org_number: payload.customer.org_number || null,
        invoice_method: payload.customer.invoice_method || null,
        invoice_email: payload.customer.invoice_email || null
      })
      .select("*")
      .single();

    if (customerError) {
      return Response.json({ error: customerError.message }, { status: 500 });
    }

    customer = newCustomer;
  } else {
    const { data: updatedCustomer } = await supabaseService
      .from("customers")
      .update({
        type: payload.customer.type || customer.type,
        first_name: payload.customer.first_name,
        last_name: payload.customer.last_name,
        phone: payload.customer.phone,
        org_number: payload.customer.org_number || null,
        invoice_method: payload.customer.invoice_method || null,
        invoice_email: payload.customer.invoice_email || null
      })
      .eq("id", customer.id)
      .select("*")
      .single();

    if (updatedCustomer) {
      customer = updatedCustomer;
    }
  }

  const { data: booking, error: bookingError } = await supabaseService
    .from("bookings")
    .insert({
      car_id: car.id,
      customer_id: customer.id,
      pickup_location_id: pickupLocation.id,
      delivery_location_id: deliveryLocation.id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      days,
      included_km: calculateIncludedKm(days),
      delivery_fee: deliveryFee,
      pickup_fee: pickupFee,
      calculated_price: calculatedPrice,
      status: "pending",
      terms_accepted: payload.terms_accepted
    })
    .select("*")
    .single();

  if (bookingError) {
    return Response.json({ error: bookingError.message }, { status: 500 });
  }

  await sendBookingEmails({
    customer,
    booking,
    car,
    pickup: pickupLocation,
    delivery: deliveryLocation
  });

  return Response.json({ booking });
}
