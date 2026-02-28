import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();

  if (!payload.first_name || !payload.last_name || !payload.email || !payload.phone) {
    return Response.json({ error: "Fornavn, etternavn, e-post og telefon er obligatorisk." }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from("customers")
    .update({
      type: payload.type || "private",
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone: payload.phone,
      address_line_1: payload.address_line_1 || null,
      address_line_2: payload.address_line_2 || null,
      postal_code: payload.postal_code || null,
      region: payload.region || null,
      org_number: payload.org_number || null,
      invoice_method: payload.invoice_method || null,
      invoice_email: payload.invoice_email || null
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ customer: data });
}
