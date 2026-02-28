import { supabaseService } from "../../../../lib/serverSupabase";
import { getUserFromRequest, isAdminEmail } from "../../../../lib/auth";
import {
  buildContractContent,
  contractContentToEditableForm,
  resolveContractLanguage,
  sanitizeContractSettingsPayload
} from "../../../../lib/contractSettings";
import { clearContractSettingsCache } from "../../../../lib/contractSettingsServer";

const requiredFields = [
  "intro",
  "responsibility",
  "obligations_title",
  "obligations_lines",
  "deductible_reduction_title",
  "deductible_reduction_exceptions_intro",
  "deductible_reduction_exception_lines",
  "cancellation_policy_title",
  "cancellation_policy_text",
  "terms_title",
  "terms_lines"
];

export async function GET(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const language = resolveContractLanguage(searchParams.get("lang"));

  const { data, error } = await supabaseService
    .from("contract_settings")
    .select("*")
    .eq("language", language)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const contract = buildContractContent(language, data || null);
  return Response.json({
    language,
    settings: contractContentToEditableForm(contract),
    updated_at: data?.updated_at || null
  });
}

export async function PUT(request) {
  const { user } = await getUserFromRequest(request);
  if (!user || !isAdminEmail(user.email)) {
    return Response.json({ error: "Admin required" }, { status: 403 });
  }

  const payload = await request.json();
  const language = resolveContractLanguage(payload.language);
  const cleaned = sanitizeContractSettingsPayload(payload);

  for (const field of requiredFields) {
    if (!cleaned[field]) {
      return Response.json({ error: `Missing ${field}` }, { status: 400 });
    }
  }

  const { data, error } = await supabaseService
    .from("contract_settings")
    .upsert(
      {
        language,
        ...cleaned,
        updated_at: new Date().toISOString(),
        updated_by: user.email || null
      },
      {
        onConflict: "language"
      }
    )
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  clearContractSettingsCache();

  return Response.json({
    language,
    settings: contractContentToEditableForm(buildContractContent(language, data)),
    updated_at: data.updated_at
  });
}
