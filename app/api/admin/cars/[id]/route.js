import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  if (payload.owned_by_third_party && !payload.third_party_id) {
    return Response.json({ error: "Velg tredjepart for bilen." }, { status: 400 });
  }
  const { data, error } = await supabaseService
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
      current_km: payload.current_km,
      active: payload.active
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ car: data });
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
