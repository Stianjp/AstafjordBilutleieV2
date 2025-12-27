"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { translations, getLanguageValue } from "../../lib/i18n";

export default function HowToBookPage() {
  const [language, setLanguage] = useState("no");

  useEffect(() => {
    const stored = getLanguageValue(window.localStorage.getItem("lang"));
    setLanguage(stored);
    const handleLang = () => {
      const next = getLanguageValue(window.localStorage.getItem("lang"));
      setLanguage(next);
    };
    window.addEventListener("languagechange", handleLang);
    return () => window.removeEventListener("languagechange", handleLang);
  }, []);

  const t = translations[language];

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-6">
        <h1 className="font-display text-4xl">{t.howToBook.title} {t.howToBook.car} {t.howToBook.withUs}</h1>

        <div className="mt-8 grid gap-6">
          <div className="gradient-card rounded-3xl p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-ink/60">{t.howToBook.step1}</p>
            <p className="mt-2 text-lg">{t.howToBook.fillForm} <Link className="text-tide" href="/#booking">{t.howToBook.here}</Link>.</p>
          </div>
          <div className="gradient-card rounded-3xl p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-ink/60">{t.howToBook.step2}</p>
            <p className="mt-2 text-lg">{t.howToBook.approvalProcess}</p>
          </div>
          <div className="gradient-card rounded-3xl p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-ink/60">{t.howToBook.step3}</p>
            <p className="mt-2 text-lg">{t.howToBook.emailConfirmation}</p>
          </div>
          <div className="gradient-card rounded-3xl p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-ink/60">{t.howToBook.step4}</p>
            <p className="mt-2 text-lg">{t.howToBook.invoiceAndPickup}</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-ink px-6 py-8 text-white">
          <p className="text-2xl font-display">{t.howToBook.easier} <span className="text-coral">{t.howToBook.itDoesntGet}</span></p>
        </div>
      </section>
    </main>
  );
}
