import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("cars")
    .select("*, locations:current_location_id(*)")
    .order("model", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ cars: data });
}

export async function POST(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const { data, error } = await supabaseService
    .from("cars")
    .insert({
      reg_number: payload.reg_number,
      model: payload.model,
      seats: payload.seats,
      transmission: payload.transmission,
      fuel: payload.fuel,
      daily_price: payload.daily_price,
      monthly_price_cap: payload.monthly_price_cap,
      current_location_id: payload.current_location_id,
      current_km: payload.current_km || 0,
      active: payload.active ?? true
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ car: data });
}
