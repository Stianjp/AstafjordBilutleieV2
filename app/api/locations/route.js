import { supabaseService } from "../../../lib/serverSupabase";

export async function GET() {
  const { data, error } = await supabaseService
    .from("locations")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ locations: data });
}
