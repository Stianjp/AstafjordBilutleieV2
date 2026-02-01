import { supabaseService } from "../../../lib/serverSupabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabaseService
    .from("add_ons")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { add_ons: data },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
