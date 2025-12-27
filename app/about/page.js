"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { translations, getLanguageValue } from "../../lib/i18n";

export default function AboutPage() {
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
        <h1 className="font-display text-4xl">{t.about.title}</h1>
        <p className="mt-4 text-ink/70">{t.about.intro}</p>

        <div className="mt-8 space-y-6">
          <div>
            <h2 className="font-display text-2xl">{t.about.whatWeStandFor}</h2>
            <div className="mt-4 space-y-4 text-ink/70">
              <div>
                <p className="font-medium text-ink">{t.about.qualityTitle}</p>
                <p>{t.about.qualityText}</p>
              </div>
              <div>
                <p className="font-medium text-ink">{t.about.localTitle}</p>
                <p>{t.about.localText}</p>
              </div>
              <div>
                <p className="font-medium text-ink">{t.about.flexibilityTitle}</p>
                <p>{t.about.flexibilityText}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl">{t.about.visionTitle}</h2>
            <p className="mt-2 text-ink/70">{t.about.visionText}</p>
          </div>

          <div>
            <h2 className="font-display text-2xl">{t.about.historyTitle}</h2>
            <p className="mt-2 text-ink/70">{t.about.historyText}</p>
          </div>

          <div>
            <h2 className="font-display text-2xl">{t.about.contactTitle}</h2>
            <p className="mt-2 text-ink/70">{t.about.contactText}</p>
          </div>

          <div className="rounded-2xl bg-white/70 p-5 text-ink/70">
            <p>{t.about.thankYou}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
