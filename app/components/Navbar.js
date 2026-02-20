"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { translations, getLanguageValue } from "../../lib/i18n";

export default function Navbar({ showBrand = true }) {
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [language, setLanguage] = useState("no");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdminHost, setIsAdminHost] = useState(false);
  const isAdminRoute = pathname === "/login" || pathname?.startsWith("/admin");
  const isAdminContext = isAdminRoute || isAdminHost;

  useEffect(() => {
    let isMounted = true;
    const currentHost = window.location.hostname.toLowerCase();
    if (currentHost === "admin.astafjordbilutleie.no") {
      setIsAdminHost(true);
    }
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

  const activeLanguage = isAdminContext ? "no" : language;
  const t = translations[activeLanguage];

  const toggleLanguage = () => {
    const next = language === "no" ? "en" : "no";
    setLanguage(next);
    window.localStorage.setItem("lang", next);
    window.dispatchEvent(new Event("languagechange"));
  };

  return (
    <header className="border-b border-ink/15 bg-white/60 px-6 py-5 backdrop-blur-sm">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between">
        {showBrand ? (
          <Link href={isAdminContext ? "/admin" : "/"} className="flex items-center gap-3 font-display text-2xl">
            Astafjord Bilutleie
          </Link>
        ) : (
          <div aria-hidden className="h-8 w-40" />
        )}
        <div className="hidden items-center gap-4 text-sm md:flex">
          {isAdminContext ? (
            <Link href="/admin" className="hover:text-tide">Dashboard</Link>
          ) : (
            <>
              <Link href="/" className="hover:text-tide">{t.nav.home}</Link>
              <Link href="/about" className="hover:text-tide">{t.nav.about}</Link>
              <Link href="/how-to-book" className="hover:text-tide">{t.nav.how}</Link>
              <Link href="/#booking" className="hover:text-tide">{t.nav.booking}</Link>
              <button
                className="rounded-full border border-ink px-3 py-1 text-[10px] uppercase tracking-[0.2em]"
                onClick={toggleLanguage}
              >
                {language === "no" ? "EN" : "NO"}
              </button>
            </>
          )}
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
        <div className="relative md:hidden">
          <button
            className="rounded-full border border-ink px-4 py-2 text-xs uppercase tracking-wide"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            Mer
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-ink/10 bg-white/90 p-3 shadow-card">
              <div className="grid gap-2 text-sm">
                {isAdminContext ? (
                  <Link href="/admin" className="hover:text-tide" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/about" className="hover:text-tide" onClick={() => setMenuOpen(false)}>
                      {t.nav.about}
                    </Link>
                    <Link href="/how-to-book" className="hover:text-tide" onClick={() => setMenuOpen(false)}>
                      {t.nav.how}
                    </Link>
                    <button
                      className="text-left hover:text-tide"
                      onClick={() => {
                        toggleLanguage();
                        setMenuOpen(false);
                      }}
                    >
                      {language === "no" ? "English" : "Norsk"}
                    </button>
                  </>
                )}
                {session ? (
                  <button
                    className="text-left text-coral"
                    onClick={() => {
                      supabase.auth.signOut();
                      setMenuOpen(false);
                    }}
                  >
                    {t.nav.logout}
                  </button>
                ) : (
                  <Link href="/login" className="hover:text-tide" onClick={() => setMenuOpen(false)}>
                    {t.nav.login}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
