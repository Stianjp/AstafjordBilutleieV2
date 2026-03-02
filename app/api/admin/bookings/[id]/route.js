import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";
import { sendBookingDecisionEmail } from "../../../../../lib/email";
import { calculateDays, calculateFinalPrice, calculateIncludedKm, calculateFees } from "../../../../../lib/pricing";
import { resolveKmPayload, updateCarKmAndInsurance, upsertBookingMileageLog } from "../../../../../lib/kmService";

export async function PATCH(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const status = payload.status;
  if (!status || !["approved", "rejected", "cancelled", "completed"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: booking, error } = await supabaseService
    .from("bookings")
    .update({ status })
    .eq("id", params.id)
    .select("*, customers(*), cars(*, third_party:third_party_id(*)), pickup:pickup_location_id(*), delivery:delivery_location_id(*)")
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
    .select("*, customers(*), cars(*, third_party:third_party_id(*)), pickup:pickup_location_id(*), delivery:delivery_location_id(*)")
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
    .select("*, cars(*, third_party:third_party_id(*)), customers(*)")
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

  const nextCarId = payload.car_id || booking.car_id;
  let selectedCar = booking.cars;
  if (payload.car_id && payload.car_id !== booking.car_id) {
    const { data: carData, error: carError } = await supabaseService
      .from("cars")
      .select("*")
      .eq("id", payload.car_id)
      .single();
    if (carError) {
      return Response.json({ error: carError.message }, { status: 500 });
    }
    selectedCar = carData;
  }

  let kmPayload;
  try {
    kmPayload = resolveKmPayload({
      authoritativeKm: selectedCar.current_km,
      requestedStartKm: payload.start_km ?? booking.start_km ?? null,
      requestedEndKm: payload.end_km ?? booking.end_km ?? null,
      previousStartKm: booking.start_km ?? null,
      previousEndKm: booking.end_km ?? null,
      overrideReason: payload.km_override_reason,
      requireEndKm: false
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingEndDate = new Date(payload.end_date || booking.end_date);
  const shouldComplete = kmPayload.endKm != null && bookingEndDate < today;
  const statusUpdate = shouldComplete ? "completed" : booking.status;

  const basePrice = calculateFinalPrice(days, Number(selectedCar.daily_price), Number(selectedCar.monthly_price_cap));
  const nextChildSeatRequired = payload.child_seat_required ?? booking.child_seat_required ?? false;
  const nextChildSeatFee = nextChildSeatRequired
    ? Number(payload.child_seat_fee ?? booking.child_seat_fee ?? 300)
    : 0;
  const nextDeductibleReductionSelected =
    payload.deductible_reduction_selected ?? booking.deductible_reduction_selected ?? false;
  const nextDeductibleReductionFee = nextDeductibleReductionSelected
    ? Number(payload.deductible_reduction_fee ?? booking.deductible_reduction_fee ?? (days * 200))
    : 0;
  const calculatedPrice = payload.calculated_price != null
    ? Number(payload.calculated_price)
    : basePrice + deliveryFee + pickupFee + nextChildSeatFee + nextDeductibleReductionFee;

  const { data: updated, error: updateError } = await supabaseService
    .from("bookings")
    .update({
      car_id: nextCarId,
      pickup_location_id: payload.pickup_location_id,
      delivery_location_id: payload.delivery_location_id,
      start_date: payload.start_date,
      start_time: payload.start_time || null,
      end_date: payload.end_date,
      end_time: payload.end_time || null,
      days,
      included_km: calculateIncludedKm(days),
      delivery_fee: deliveryFee,
      pickup_fee: pickupFee,
      calculated_price: calculatedPrice,
      customer_comment: payload.customer_comment ?? booking.customer_comment ?? null,
      child_seat_required: nextChildSeatRequired,
      child_seat_fee: nextChildSeatFee,
      deductible_reduction_selected: nextDeductibleReductionSelected,
      deductible_reduction_fee: nextDeductibleReductionFee,
      admin_note_1: payload.admin_note_1 ?? booking.admin_note_1 ?? null,
      admin_note_2: payload.admin_note_2 ?? booking.admin_note_2 ?? null,
      start_km: kmPayload.startKm,
      end_km: kmPayload.endKm,
      status: statusUpdate
    })
    .eq("id", params.id)
    .select("*, customers(*), cars(*, third_party:third_party_id(*)), pickup:pickup_location_id(*), delivery:delivery_location_id(*)")
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  if (payload.customer) {
    await supabaseService
      .from("customers")
      .update({
        first_name: payload.customer.first_name ?? booking.customers?.first_name ?? null,
        last_name: payload.customer.last_name ?? booking.customers?.last_name ?? null,
        email: payload.customer.email ?? booking.customers?.email ?? null,
        phone: payload.customer.phone ?? booking.customers?.phone ?? null,
        address_line_1: payload.customer.address_line_1 ?? booking.customers?.address_line_1 ?? null,
        address_line_2: payload.customer.address_line_2 ?? booking.customers?.address_line_2 ?? null,
        postal_code: payload.customer.postal_code ?? booking.customers?.postal_code ?? null,
        region: payload.customer.region ?? booking.customers?.region ?? null
      })
      .eq("id", updated.customer_id);
  }

  try {
    await upsertBookingMileageLog({
      supabase: supabaseService,
      bookingId: updated.id,
      carId: nextCarId,
      startKm: kmPayload.startKm,
      endKm: kmPayload.endKm,
      includedKm: updated.included_km,
      reason: payload.km_reason || null,
      overrideReason: kmPayload.overrideReason,
      source: "booking"
    });

    const currentKm = Number(selectedCar.current_km || 0);
    if (kmPayload.endKm != null && (kmPayload.endChanged || Number(kmPayload.endKm) > currentKm)) {
      await updateCarKmAndInsurance({
        supabase: supabaseService,
        car: selectedCar,
        nextKm: kmPayload.endKm
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { data: refreshed, error: refreshError } = await supabaseService
    .from("bookings")
    .select("*, customers(*), cars(*, third_party:third_party_id(*)), pickup:pickup_location_id(*), delivery:delivery_location_id(*)")
    .eq("id", params.id)
    .single();

  if (refreshError) {
    return Response.json({ booking: updated });
  }

  return Response.json({ booking: refreshed });
}

export async function DELETE(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { error } = await supabaseService.from("bookings").delete().eq("id", params.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
