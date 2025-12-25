import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = supabaseService
    .from("bookings")
    .select(
      "*, customers(*), cars(*), pickup:pickup_location_id(*), delivery:delivery_location_id(*)"
    )
    .order("start_date", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ bookings: data });
}
