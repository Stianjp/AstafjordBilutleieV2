"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/cars", label: "Biler" },
  { href: "/admin/customers", label: "Kunder" },
  { href: "/admin/contract", label: "Kontrakt" },
  { href: "/admin/locations", label: "Lokasjoner" },
  { href: "/admin/third-parties", label: "Tredjeparter" },
  { href: "/admin/add-ons", label: "Tilleggsutstyr" },
  { href: "/admin/discount-codes", label: "Rabattkoder" },
  { href: "/admin/mileage", label: "Kjørebok" }
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          router.replace("/login");
          return;
        }
        const response = await fetch("/api/admin/session", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }
        if (active) {
          setChecking(false);
        }
      } catch {
        router.replace("/login");
      }
    };

    verifySession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession?.access_token) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (checking) {
    return (
      <main className="min-h-screen px-6 py-10">
        <p className="mx-auto w-full max-w-6xl text-sm text-ink/70">Sjekker innlogging...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-sand lg:flex">
      <aside className="border-b border-ink/10 bg-white/70 p-4 backdrop-blur-sm lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
        <div className="lg:sticky lg:top-0 lg:pt-2">
          <p className="px-2 text-xs uppercase tracking-[0.25em] text-ink/60">Admin</p>
          <h1 className="px-2 font-display text-2xl">Astafjord</h1>
          <nav className="mt-5 grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    active ? "bg-ink text-white" : "text-ink/80 hover:bg-ink/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={signOut}
            className="mt-6 rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide text-ink/70 hover:bg-ink/5"
          >
            Logg ut
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
