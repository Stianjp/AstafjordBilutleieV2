import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";
import { normalizeInsuranceFields } from "../../../../lib/kmService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("cars")
    .select("*, locations:current_location_id(*), third_party:third_party_id(*)")
    .order("model", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { cars: data },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  if (payload.owned_by_third_party && !payload.third_party_id) {
    return Response.json({ error: "Velg tredjepart for bilen." }, { status: 400 });
  }

  const currentKm = Number(payload.current_km || 0);
  if (!Number.isFinite(currentKm) || currentKm < 0) {
    return Response.json({ error: "Ugyldig kilometerstand" }, { status: 400 });
  }

  const insuranceFields = normalizeInsuranceFields({
    annualLimit: payload.insurance_annual_km_limit,
    currentKm,
    trackingYear: payload.insurance_tracking_year,
    yearStartKm: payload.insurance_year_start_km,
    alertSentYear: payload.insurance_alert_sent_year
  });

  const { data, error } = await supabaseService
    .from("cars")
    .insert({
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
      current_km: currentKm,
      insurance_annual_km_limit: insuranceFields.insurance_annual_km_limit,
      insurance_tracking_year: insuranceFields.insurance_tracking_year,
      insurance_year_start_km: insuranceFields.insurance_year_start_km,
      insurance_alert_sent_year: insuranceFields.insurance_alert_sent_year,
      active: payload.active ?? true
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ car: data });
}
