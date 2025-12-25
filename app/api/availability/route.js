import { supabaseService } from "../../../lib/serverSupabase";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!startDate || !endDate) {
    return Response.json({ unavailable: [] });
  }

  const { data, error } = await supabaseService
    .from("bookings")
    .select("car_id")
    .in("status", ["pending", "approved"])
    .lte("start_date", endDate)
    .gte("end_date", startDate);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const unavailable = Array.from(new Set(data.map((item) => item.car_id)));
  return Response.json({ unavailable });
}
