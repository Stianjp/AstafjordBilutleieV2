import { supabaseService } from "../../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../../lib/auth";

export async function PUT(request, { params }) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const code = payload.code ? payload.code.trim().toUpperCase() : "";
  const type = payload.type;
  const value = Number(payload.value);
  const minimumDays = payload.minimum_days == null ? 0 : Number(payload.minimum_days);
  const allowedTypes = new Set(["percent", "amount", "monthly_fixed"]);
  if (!code) {
    return Response.json({ error: "Mangler kode" }, { status: 400 });
  }
  if (!allowedTypes.has(type)) {
    return Response.json({ error: "Ugyldig rabatttype" }, { status: 400 });
  }
  if (!Number.isFinite(value) || value < 0) {
    return Response.json({ error: "Ugyldig verdi" }, { status: 400 });
  }
  if (!Number.isFinite(minimumDays) || minimumDays < 0) {
    return Response.json({ error: "Ugyldig antall dager" }, { status: 400 });
  }
  if (type === "monthly_fixed" && minimumDays < 1) {
    return Response.json({ error: "Mnd fastpris krever minimum 1 dag" }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from("discount_codes")
    .update({
      code,
      type,
      value,
      minimum_days: minimumDays,
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
