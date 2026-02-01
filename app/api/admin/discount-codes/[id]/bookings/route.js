import { supabaseService } from "../../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("bookings")
    .select("*, customers(*), cars(*)")
    .eq("discount_code_id", params.id)
    .order("start_date", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { bookings: data },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
