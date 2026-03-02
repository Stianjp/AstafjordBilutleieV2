import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";
import {
  getCarByIdForKm,
  normalizeInsuranceFields,
  updateCarKmAndInsurance
} from "../../../../../lib/kmService";

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  if (payload.owned_by_third_party && !payload.third_party_id) {
    return Response.json({ error: "Velg tredjepart for bilen." }, { status: 400 });
  }

  let existingCar;
  try {
    existingCar = await getCarByIdForKm({ supabase: supabaseService, carId: params.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  const nextCurrentKm = Number(payload.current_km);
  if (!Number.isFinite(nextCurrentKm) || nextCurrentKm < 0) {
    return Response.json({ error: "Ugyldig kilometerstand" }, { status: 400 });
  }

  const kmChangeReason = String(payload.km_change_reason || "").trim();
  const kmChanged = Number(existingCar.current_km || 0) !== nextCurrentKm;
  if (kmChanged && !kmChangeReason) {
    return Response.json({ error: "Begrunnelse kreves ved manuell km-endring." }, { status: 400 });
  }

  const insuranceFields = normalizeInsuranceFields({
    annualLimit: payload.insurance_annual_km_limit,
    currentKm: nextCurrentKm,
    trackingYear: payload.insurance_tracking_year,
    yearStartKm: payload.insurance_year_start_km,
    alertSentYear: payload.insurance_alert_sent_year
  });

  const { data: updatedBaseCar, error: updateError } = await supabaseService
    .from("cars")
    .update({
      reg_number: payload.reg_number,
      model: payload.model,
      image_url: payload.image_url || null,
      seats: payload.seats,
      transmission: payload.transmission,
      fuel: payload.fuel,
      daily_price: payload.daily_price,
      monthly_price_cap: payload.monthly_price_cap,
      current_location_id: payload.current_location_id,
      has_navigation: payload.has_navigation ?? true,
      owned_by_third_party: payload.owned_by_third_party ?? false,
      third_party_id: payload.owned_by_third_party ? payload.third_party_id || null : null,
      insurance_annual_km_limit: insuranceFields.insurance_annual_km_limit,
      insurance_tracking_year: insuranceFields.insurance_tracking_year,
      insurance_year_start_km: insuranceFields.insurance_year_start_km,
      insurance_alert_sent_year: insuranceFields.insurance_alert_sent_year,
      active: payload.active
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  let finalCar = updatedBaseCar;
  if (kmChanged) {
    const currentCarForKm = {
      ...existingCar,
      insurance_annual_km_limit: insuranceFields.insurance_annual_km_limit,
      insurance_tracking_year: insuranceFields.insurance_tracking_year,
      insurance_year_start_km: insuranceFields.insurance_year_start_km,
      insurance_alert_sent_year: insuranceFields.insurance_alert_sent_year
    };

    try {
      const { error: logError } = await supabaseService
        .from("mileage_logs")
        .insert({
          booking_id: null,
          car_id: params.id,
          km_start: Number(existingCar.current_km || 0),
          km_end: nextCurrentKm,
          driven_km: nextCurrentKm - Number(existingCar.current_km || 0),
          extra_km: null,
          extra_cost: null,
          reason: "Manuell km-justering i biler",
          override_reason: kmChangeReason,
          source: "car_adjustment"
        });
      if (logError) {
        throw new Error(logError.message);
      }

      const kmUpdate = await updateCarKmAndInsurance({
        supabase: supabaseService,
        car: currentCarForKm,
        nextKm: nextCurrentKm
      });
      const { data: refreshed } = await supabaseService
        .from("cars")
        .select("*")
        .eq("id", params.id)
        .single();
      finalCar = refreshed || {
        ...updatedBaseCar,
        current_km: kmUpdate.car.current_km,
        insurance_alert_sent_year: kmUpdate.car.insurance_alert_sent_year
      };
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { data: sameKmUpdated } = await supabaseService
      .from("cars")
      .update({ current_km: nextCurrentKm })
      .eq("id", params.id)
      .select("*")
      .single();
    if (sameKmUpdated) {
      finalCar = sameKmUpdated;
    }
  }

  return Response.json({ car: finalCar });
}

export async function DELETE(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { error } = await supabaseService.from("cars").delete().eq("id", params.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
