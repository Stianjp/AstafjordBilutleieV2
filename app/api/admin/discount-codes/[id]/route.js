import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const code = payload.code ? payload.code.trim().toUpperCase() : "";
  if (!code) {
    return Response.json({ error: "Mangler kode" }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from("discount_codes")
    .update({
      code,
      type: payload.type,
      value: payload.value,
      active: payload.active ?? true,
      starts_at: payload.starts_at || null,
      ends_at: payload.ends_at || null,
      usage_limit: payload.usage_limit ?? null
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ code: data });
}

export async function DELETE(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { error } = await supabaseService.from("discount_codes").delete().eq("id", params.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
