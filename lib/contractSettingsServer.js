import { supabaseService } from "./serverSupabase";
import { buildContractContent, resolveContractLanguage } from "./contractSettings";

const CACHE_TTL_MS = 60_000;
const cache = new Map();

export function clearContractSettingsCache() {
  cache.clear();
}

export async function getContractContent(language = "no") {
  const lang = resolveContractLanguage(language);
  const now = Date.now();
  const cached = cache.get(lang);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  const { data, error } = await supabaseService
    .from("contract_settings")
    .select("*")
    .eq("language", lang)
    .maybeSingle();

  if (error) {
    console.error("Failed to load contract settings", { language: lang, error: error.message });
  }

  const merged = buildContractContent(lang, data || null);
  cache.set(lang, { value: merged, timestamp: now });
  return merged;
}
