import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data, error } = await supabaseService
    .from("third_parties")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { third_parties: data },
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
  const name = payload.name ? payload.name.trim() : "";
  const companyName = payload.company_name ? payload.company_name.trim() : "";
  const email = payload.email ? payload.email.trim() : "";
  const phone = payload.phone ? payload.phone.trim() : "";

  if (!name || !email || !phone) {
    return Response.json({ error: "Mangler felter" }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from("third_parties")
    .insert({
      name,
      company_name: companyName || null,
      email,
      phone,
      active: payload.active ?? true
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ third_party: data });
}
