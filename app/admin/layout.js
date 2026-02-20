"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function AdminLayout({ children }) {
  const router = useRouter();
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

  if (checking) {
    return (
      <main className="min-h-screen px-6 py-10">
        <p className="mx-auto w-full max-w-6xl text-sm text-ink/70">Sjekker innlogging...</p>
      </main>
    );
  }

  return children;
}
