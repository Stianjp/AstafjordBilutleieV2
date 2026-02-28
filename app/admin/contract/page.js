"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { buildContractContent } from "../../../lib/contractSettings";

const emptyForm = {
  intro: "",
  responsibility: "",
  obligations_title: "",
  obligations_lines: "",
  deductible_reduction_title: "",
  deductible_reduction_exceptions_intro: "",
  deductible_reduction_exception_lines: "",
  cancellation_policy_title: "",
  cancellation_policy_text: "",
  terms_title: "",
  terms_lines: ""
};

export default function AdminContractPage() {
  const [language, setLanguage] = useState("no");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [previewThirdParty, setPreviewThirdParty] = useState(false);

  const contractPreview = useMemo(() => buildContractContent(language, form), [language, form]);
  const previewDailyDeductibleFee = 200;

  const loadSettings = async (lang = "no") => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch(`/api/admin/contract-settings?lang=${lang}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataResponse = await response.json();

    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente kontraktinnstillinger.");
      return;
    }

    setForm(dataResponse.settings || emptyForm);
    setUpdatedAt(dataResponse.updated_at || null);
    setMessage("");
  };

  useEffect(() => {
    loadSettings(language);
  }, [language]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch("/api/admin/contract-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        language,
        ...form
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre kontraktinnstillinger.");
      return;
    }

    setForm(dataResponse.settings || emptyForm);
    setUpdatedAt(dataResponse.updated_at || null);
    setMessage("Lagret.");
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="font-display text-3xl">Admin: kontrakt</h1>
      <p className="mt-2 text-sm text-ink/70">
        Her kan du redigere statisk kontrakttekst. Felter som fylles automatisk (navn, e-post, adresse, dato, pris osv.)
        er alltid låst av systemet.
      </p>
      {updatedAt && (
        <p className="mt-1 text-xs text-ink/60">Sist oppdatert: {new Date(updatedAt).toLocaleString("nb-NO")}</p>
      )}
      {message && <p className="mt-3 text-sm text-coral">{message}</p>}

      <form onSubmit={handleSubmit} className="mt-6 rounded-3xl bg-white/70 p-6 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Sprak
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
            >
              <option value="no">Norsk</option>
              <option value="en">Engelsk</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="text-sm">
            Intro (uten tredjepart)
            <textarea
              rows={3}
              value={form.intro}
              onChange={(event) => setForm({ ...form, intro: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Ansvarstekst
            <textarea
              rows={3}
              value={form.responsibility}
              onChange={(event) => setForm({ ...form, responsibility: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Tittel: leietaker plikter
            <input
              value={form.obligations_title}
              onChange={(event) => setForm({ ...form, obligations_title: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Leietaker plikter (en linje per punkt)
            <textarea
              rows={8}
              value={form.obligations_lines}
              onChange={(event) => setForm({ ...form, obligations_lines: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Tittel: egenandelsreduksjon
            <input
              value={form.deductible_reduction_title}
              onChange={(event) => setForm({ ...form, deductible_reduction_title: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Intro: unntak fra egenandelsreduksjon
            <textarea
              rows={4}
              value={form.deductible_reduction_exceptions_intro}
              onChange={(event) => setForm({ ...form, deductible_reduction_exceptions_intro: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Unntakspunkter (en linje per punkt)
            <textarea
              rows={7}
              value={form.deductible_reduction_exception_lines}
              onChange={(event) => setForm({ ...form, deductible_reduction_exception_lines: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Tittel: avbestilling
            <input
              value={form.cancellation_policy_title}
              onChange={(event) => setForm({ ...form, cancellation_policy_title: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Avbestillingstekst
            <textarea
              rows={4}
              value={form.cancellation_policy_text}
              onChange={(event) => setForm({ ...form, cancellation_policy_text: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Tittel: bruksvilkar
            <input
              value={form.terms_title}
              onChange={(event) => setForm({ ...form, terms_title: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>

          <label className="text-sm">
            Bruksvilkar (en linje per punkt)
            <textarea
              rows={7}
              value={form.terms_lines}
              onChange={(event) => setForm({ ...form, terms_lines: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-6 rounded-full bg-ink px-5 py-2 text-sm uppercase tracking-wide text-white"
        >
          Lagre kontraktinnstillinger
        </button>

        <div className="mt-8 rounded-3xl border border-ink/10 bg-white/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">Forhandsvisning</h2>
            <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-ink/70">
              <input
                type="checkbox"
                checked={previewThirdParty}
                onChange={(event) => setPreviewThirdParty(event.target.checked)}
              />
              Simuler tredjepart
            </label>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            Dynamiske felt (kunde, dato, pris, bil, lokasjon) fylles automatisk ved booking.
          </p>

          <div className="mt-4 space-y-2 rounded-2xl bg-white/90 p-4 text-sm">
            <p>
              {previewThirdParty
                ? contractPreview.introThirdParty
                  .replace("{thirdParty}", "Fagerli")
                  .replace("{phone}", "+47 41474514")
                : contractPreview.intro}
            </p>
            <p>{contractPreview.name}: Stian Test</p>
            <p>{contractPreview.email}: stianjp@hotmail.com</p>
            <p>{contractPreview.phone}: 98055169</p>
            <p>{contractPreview.address1}: Eksempelveien 1</p>
            <p>{contractPreview.postalCode}: 9357</p>
            <p>{contractPreview.region}: Tennevoll</p>
            {previewThirdParty ? <p>{contractPreview.onBehalfOf}: Fagerli</p> : null}
            <p>{contractPreview.pickup}: Lavangen</p>
            <p>{contractPreview.delivery}: Lavangen</p>
            <p>{contractPreview.start}: 2026-03-10 {contractPreview.timePrefix} 10:00</p>
            <p>{contractPreview.end}: 2026-03-12 {contractPreview.timePrefix} 18:00</p>
            <p>{contractPreview.period}: 3 dager</p>
            <p>{contractPreview.deductibleReductionChoice}: {contractPreview.yes}</p>
            <p><strong>{contractPreview.total}: 3200 NOK</strong></p>
            <p>{contractPreview.freeKm}: 200 km</p>
            <p>{contractPreview.extraKm}</p>
            <p>{contractPreview.responsibility}</p>
          </div>

          <div className="mt-4 rounded-2xl bg-white/90 p-4 text-xs">
            <p>{contractPreview.obligationsTitle}</p>
            {contractPreview.obligations.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-2">{contractPreview.deductibleReductionTitle}</p>
            <p>{contractPreview.deductibleReductionInfo.replace("{fee}", String(previewDailyDeductibleFee))}</p>
            <p>{contractPreview.deductibleReductionAccepted.replace("{fee}", String(previewDailyDeductibleFee))}</p>
            <p>{contractPreview.deductibleReductionExceptionsIntro}</p>
            {contractPreview.deductibleReductionExceptions.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-2">{contractPreview.cancellationPolicyTitle}</p>
            <p>{contractPreview.cancellationPolicyText}</p>
            <p className="mt-2">{contractPreview.termsTitle}</p>
            {contractPreview.terms.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}
