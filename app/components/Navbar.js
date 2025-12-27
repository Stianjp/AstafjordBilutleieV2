"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { translations, getLanguageValue } from "../../lib/i18n";

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [language, setLanguage] = useState("no");

  useEffect(() => {
    let isMounted = true;
    const stored = getLanguageValue(window.localStorage.getItem("lang"));
    setLanguage(stored);

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const t = translations[language];

  const toggleLanguage = () => {
    const next = language === "no" ? "en" : "no";
    setLanguage(next);
    window.localStorage.setItem("lang", next);
    window.dispatchEvent(new Event("languagechange"));
  };

  return (
    <header className="px-6 py-5">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="font-display text-2xl">
          Astafjord Bilutleie
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-tide">{t.nav.home}</Link>
          <Link href="/about" className="hover:text-tide">{t.nav.about}</Link>
          <Link href="/how-to-book" className="hover:text-tide">{t.nav.how}</Link>
          <Link href="/#booking" className="hover:text-tide">{t.nav.booking}</Link>
          <Link href="/admin" className="hover:text-tide">{t.nav.admin}</Link>
          <button
            className="rounded-full border border-ink px-3 py-1 text-[10px] uppercase tracking-[0.2em]"
            onClick={toggleLanguage}
          >
            {language === "no" ? "EN" : "NO"}
          </button>
          {session ? (
            <button
              className="rounded-full border border-ink px-4 py-1 text-xs uppercase tracking-wide"
              onClick={() => supabase.auth.signOut()}
            >
              {t.nav.logout}
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-ink px-4 py-1 text-xs uppercase tracking-wide"
            >
              {t.nav.login}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
