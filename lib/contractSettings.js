import { translations } from "./i18n";

export const resolveContractLanguage = (language) => (language === "en" ? "en" : "no");

const splitLines = (value, fallback = []) => {
  if (typeof value !== "string") return fallback;
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : fallback;
};

const normalizeText = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const buildContractContent = (language, settingsRow) => {
  const lang = resolveContractLanguage(language);
  const base = translations[lang].contract;

  return {
    ...base,
    intro: normalizeText(settingsRow?.intro, base.intro),
    responsibility: normalizeText(settingsRow?.responsibility, base.responsibility),
    obligationsTitle: normalizeText(settingsRow?.obligations_title, base.obligationsTitle),
    obligations: splitLines(settingsRow?.obligations_lines, base.obligations || []),
    deductibleReductionTitle: normalizeText(
      settingsRow?.deductible_reduction_title,
      base.deductibleReductionTitle
    ),
    deductibleReductionExceptionsIntro: normalizeText(
      settingsRow?.deductible_reduction_exceptions_intro,
      base.deductibleReductionExceptionsIntro
    ),
    deductibleReductionExceptions: splitLines(
      settingsRow?.deductible_reduction_exception_lines,
      base.deductibleReductionExceptions || []
    ),
    cancellationPolicyTitle: normalizeText(
      settingsRow?.cancellation_policy_title,
      base.cancellationPolicyTitle
    ),
    cancellationPolicyText: normalizeText(
      settingsRow?.cancellation_policy_text,
      base.cancellationPolicyText
    ),
    termsTitle: normalizeText(settingsRow?.terms_title, base.termsTitle),
    terms: splitLines(settingsRow?.terms_lines, base.terms || [])
  };
};

export const contractContentToEditableForm = (contract) => ({
  intro: contract?.intro || "",
  responsibility: contract?.responsibility || "",
  obligations_title: contract?.obligationsTitle || "",
  obligations_lines: (contract?.obligations || []).join("\n"),
  deductible_reduction_title: contract?.deductibleReductionTitle || "",
  deductible_reduction_exceptions_intro: contract?.deductibleReductionExceptionsIntro || "",
  deductible_reduction_exception_lines: (contract?.deductibleReductionExceptions || []).join("\n"),
  cancellation_policy_title: contract?.cancellationPolicyTitle || "",
  cancellation_policy_text: contract?.cancellationPolicyText || "",
  terms_title: contract?.termsTitle || "",
  terms_lines: (contract?.terms || []).join("\n")
});

export const sanitizeContractSettingsPayload = (payload = {}) => ({
  intro: String(payload.intro || "").trim(),
  responsibility: String(payload.responsibility || "").trim(),
  obligations_title: String(payload.obligations_title || "").trim(),
  obligations_lines: String(payload.obligations_lines || "").trim(),
  deductible_reduction_title: String(payload.deductible_reduction_title || "").trim(),
  deductible_reduction_exceptions_intro: String(payload.deductible_reduction_exceptions_intro || "").trim(),
  deductible_reduction_exception_lines: String(payload.deductible_reduction_exception_lines || "").trim(),
  cancellation_policy_title: String(payload.cancellation_policy_title || "").trim(),
  cancellation_policy_text: String(payload.cancellation_policy_text || "").trim(),
  terms_title: String(payload.terms_title || "").trim(),
  terms_lines: String(payload.terms_lines || "").trim()
});
