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
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(
    { codes: data },
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
    .insert({
      code,
      type,
      value,
      minimum_days: minimumDays,
      active: payload.active ?? true,
      starts_at: payload.starts_at || null,
      ends_at: payload.ends_at || null,
      usage_limit: payload.usage_limit ?? null
    })
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ code: data });
}
