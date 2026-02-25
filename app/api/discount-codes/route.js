import { supabaseService } from "../../../lib/serverSupabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const codeParam = searchParams.get("code");
  const daysParam = searchParams.get("days");
  const days = daysParam == null ? null : Number(daysParam);
  const code = codeParam ? codeParam.trim().toUpperCase() : "";

  if (!code) {
    return Response.json({ valid: false, message: "Mangler rabattkode" }, { status: 400 });
  }

  const { data: discount, error } = await supabaseService
    .from("discount_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error || !discount) {
    return Response.json({ valid: false, message: "Ugyldig rabattkode" }, { status: 404 });
  }

  if (!discount.active) {
    return Response.json({ valid: false, message: "Rabattkode er deaktivert" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startsAt = parseDateOnly(discount.starts_at);
  const endsAt = parseDateOnly(discount.ends_at);

  if (startsAt && startsAt > today) {
    return Response.json({ valid: false, message: "Rabattkode er ikke aktiv enda" }, { status: 400 });
  }
  if (endsAt && endsAt < today) {
    return Response.json({ valid: false, message: "Rabattkode er utløpt" }, { status: 400 });
  }
  if (discount.usage_limit != null && discount.used_count >= discount.usage_limit) {
    return Response.json({ valid: false, message: "Rabattkode er brukt opp" }, { status: 400 });
  }

  const minimumDays = Number(discount.minimum_days || 0);
  const eligible = days == null || Number.isNaN(days) ? true : days >= minimumDays;
  const equivalentDailyPrice = discount.type === "monthly_fixed"
    ? Number(discount.value || 0) / 30
    : null;

  return Response.json(
    {
      valid: true,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      minimum_days: minimumDays,
      eligible,
      message: eligible ? null : `Rabattkoden gjelder fra ${minimumDays} dager`,
      equivalent_daily_price: equivalentDailyPrice
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
