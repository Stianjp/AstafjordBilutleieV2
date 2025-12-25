import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("locations")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ locations: data });
}

export async function PUT(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const updates = payload.locations || [];

  const results = [];
  for (const update of updates) {
    const { data, error } = await supabaseService
      .from("locations")
      .update({
        delivery_fee: update.delivery_fee,
        pickup_fee: update.pickup_fee
      })
      .eq("id", update.id)
      .select("*")
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    results.push(data);
  }

  return Response.json({ locations: results });
}
