import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";

export async function PUT(request, { params }) {
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
    .update({
      name,
      company_name: companyName || null,
      email,
      phone,
      active: payload.active ?? true
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ third_party: data });
}

export async function DELETE(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { data: inUse, error: inUseError } = await supabaseService
    .from("cars")
    .select("id")
    .eq("third_party_id", params.id)
    .limit(1);

  if (inUseError) {
    return Response.json({ error: inUseError.message }, { status: 500 });
  }

  if ((inUse || []).length > 0) {
    return Response.json(
      { error: "Kan ikke slette tredjepart som er koblet til bil(er)." },
      { status: 400 }
    );
  }

  const { error } = await supabaseService
    .from("third_parties")
    .delete()
    .eq("id", params.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
