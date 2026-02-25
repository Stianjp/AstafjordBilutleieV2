import { supabaseService } from "../../../lib/serverSupabase";
import {
  calculateDays,
  calculateFinalPrice,
  calculateIncludedKm,
  calculateFees,
  isValidLeadTime
} from "../../../lib/pricing";
import { sendBookingEmails } from "../../../lib/email";

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const resolveDiscount = async ({ code, totalBeforeDiscount, basePrice, days }) => {
  if (!code) return { discountAmount: 0, discountCode: null, discountCodeId: null };
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { discountAmount: 0, discountCode: null, discountCodeId: null };

  const { data: discount, error } = await supabaseService
    .from("discount_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !discount) {
    return { discountAmount: 0, discountCode: null, discountCodeId: null, error: "Ugyldig rabattkode" };
  }

  if (!discount.active) {
    return { discountAmount: 0, discountCode: null, discountCodeId: null, error: "Rabattkode er deaktivert" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startsAt = parseDateOnly(discount.starts_at);
  const endsAt = parseDateOnly(discount.ends_at);

  if (startsAt && startsAt > today) {
    return { discountAmount: 0, discountCode: null, discountCodeId: null, error: "Rabattkode er ikke aktiv enda" };
  }
  if (endsAt && endsAt < today) {
    return { discountAmount: 0, discountCode: null, discountCodeId: null, error: "Rabattkode er utløpt" };
  }
  if (discount.usage_limit != null && discount.used_count >= discount.usage_limit) {
    return { discountAmount: 0, discountCode: null, discountCodeId: null, error: "Rabattkode er brukt opp" };
  }

  const minimumDays = Number(discount.minimum_days || 0);
  const safeTotalBeforeDiscount = Number(totalBeforeDiscount || 0);
  const safeBasePrice = Number(basePrice || 0);
  const safeDays = Number(days || 0);
  let discountAmount = 0;
  let adjustedBasePrice = null;

  if (discount.type === "monthly_fixed") {
    if (safeDays < minimumDays) {
      return {
        discountAmount: 0,
        adjustedBasePrice: null,
        minimumDays,
        discountCode: null,
        discountCodeId: null,
        usedCount: 0
      };
    }

    const monthlyPrice = Number(discount.value || 0);
    const equivalentDailyPrice = monthlyPrice / 30;
    adjustedBasePrice = equivalentDailyPrice * safeDays;
    const baseDiscountAmount = Math.max(0, safeBasePrice - adjustedBasePrice);
    discountAmount = Math.max(0, Math.min(safeTotalBeforeDiscount, baseDiscountAmount));
  } else if (discount.type === "percent") {
    discountAmount = (safeTotalBeforeDiscount * Number(discount.value)) / 100;
    discountAmount = Math.max(0, Math.min(safeTotalBeforeDiscount, discountAmount));
  } else {
    discountAmount = Number(discount.value);
    discountAmount = Math.max(0, Math.min(safeTotalBeforeDiscount, discountAmount));
  }

  return {
    discountAmount,
    adjustedBasePrice,
    minimumDays,
    discountCode: discount.code,
    discountCodeId: discount.id,
    usedCount: discount.used_count || 0
  };
};

export async function POST(request) {
  const payload = await request.json();
  const childSeatRequired = payload.child_seat_required === true;
  const deductibleReductionSelected = payload.deductible_reduction_selected === true;

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

  const { data: addOns, error: addOnsError } = await supabaseService
    .from("add_ons")
    .select("key, fee, active")
    .in("key", ["child_seat", "deductible_reduction"])
    .eq("active", true);

  if (addOnsError) {
    return Response.json({ error: addOnsError.message }, { status: 500 });
  }

  const addOnMap = new Map((addOns || []).map((item) => [item.key, Number(item.fee || 0)]));
  const childSeatActive = addOnMap.has("child_seat");
  const deductibleReductionActive = addOnMap.has("deductible_reduction");

  if (childSeatRequired && !childSeatActive) {
    return Response.json({ error: "Barnestol er ikke tilgjengelig for denne bestillingen" }, { status: 400 });
  }

  if (deductibleReductionSelected && !deductibleReductionActive) {
    return Response.json({ error: "Egenandelsreduksjon er ikke tilgjengelig for denne bestillingen" }, { status: 400 });
  }

  const childSeatUnitFee = childSeatActive ? addOnMap.get("child_seat") : 0;
  const deductibleReductionDailyFee = deductibleReductionActive
    ? addOnMap.get("deductible_reduction")
    : 0;
  const childSeatFee = childSeatRequired ? childSeatUnitFee : 0;
  const deductibleReductionFee = deductibleReductionSelected
    ? deductibleReductionDailyFee * days
    : 0;

  const { data: car, error: carError } = await supabaseService
    .from("cars")
    .select("*, third_party:third_party_id(*)")
    .eq("id", payload.car_id)
    .single();

  if (carError || !car) {
    return Response.json({ error: "Fant ikke bil" }, { status: 404 });
  }

  if (!car.active) {
    return Response.json({ error: "Bilen er ikke tilgjengelig" }, { status: 400 });
  }

  let thirdParty = car.third_party || null;
  if (car.owned_by_third_party && !thirdParty && car.third_party_id) {
    const { data: thirdPartyData } = await supabaseService
      .from("third_parties")
      .select("*")
      .eq("id", car.third_party_id)
      .maybeSingle();
    thirdParty = thirdPartyData || null;
  }

  const { data: conflicts, error: conflictError } = await supabaseService
    .from("bookings")
    .select("id")
    .eq("car_id", car.id)
    .in("status", ["pending", "approved"])
    .lte("start_date", payload.end_date)
    .gte("end_date", payload.start_date);

  if (conflictError) {
    return Response.json({ error: conflictError.message }, { status: 500 });
  }

  if (conflicts.length > 0) {
    return Response.json({ error: "Bilen er ikke ledig i valgt periode" }, { status: 409 });
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
  const totalBeforeDiscount = basePrice + deliveryFee + pickupFee;
  const discountResult = await resolveDiscount({
    code: payload.discount_code,
    totalBeforeDiscount,
    basePrice,
    days
  });
  if (discountResult.error) {
    return Response.json({ error: discountResult.error }, { status: 400 });
  }
  const subtotalAfterDiscount = discountResult.adjustedBasePrice != null
    ? Number(discountResult.adjustedBasePrice) + deliveryFee + pickupFee
    : totalBeforeDiscount - discountResult.discountAmount;
  const actualDiscountAmount = Math.max(0, totalBeforeDiscount - subtotalAfterDiscount);
  const calculatedPrice = subtotalAfterDiscount
    + childSeatFee
    + deductibleReductionFee;

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
      start_time: payload.start_time || null,
      end_date: payload.end_date,
      end_time: payload.end_time || null,
      days,
      included_km: calculateIncludedKm(days),
      delivery_fee: deliveryFee,
      pickup_fee: pickupFee,
      child_seat_required: childSeatRequired,
      child_seat_fee: childSeatFee,
      deductible_reduction_selected: deductibleReductionSelected,
      deductible_reduction_fee: deductibleReductionFee,
      customer_comment: payload.customer_comment || null,
      discount_code_id: discountResult.discountCodeId,
      discount_code: discountResult.discountCode,
      discount_amount: actualDiscountAmount,
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
    car: { ...car, third_party: thirdParty },
    pickup: pickupLocation,
    delivery: deliveryLocation,
    thirdParty
  });

  if (discountResult.discountCodeId) {
    await supabaseService
      .from("discount_codes")
      .update({ used_count: discountResult.usedCount + 1 })
      .eq("id", discountResult.discountCodeId);
  }

  return Response.json({ booking });
}
