import { supabaseService } from "../../../lib/serverSupabase";

export async function GET() {
  const { data, error } = await supabaseService
    .from("cars")
    .select("*, locations:current_location_id (id, name)")
    .eq("active", true)
    .order("model", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ cars: data });
}
