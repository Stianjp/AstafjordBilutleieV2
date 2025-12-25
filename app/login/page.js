"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
    } else {
      router.push("/admin");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 pb-16 pt-8 md:flex-row">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.3em] text-tide">Astafjord</p>
          <h1 className="font-display text-4xl">Admin innlogging</h1>
          <p className="mt-3 text-ink/70">
            Kun administratorer har tilgang til dashbordet.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="gradient-card flex-1 rounded-3xl p-6 shadow-card">
          <div className="mt-4">
            <label className="text-sm">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              required
            />
          </div>
          <div className="mt-4">
            <label className="text-sm">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              required
            />
          </div>
          {message && <p className="mt-4 text-sm text-coral">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-tide px-4 py-3 text-sm uppercase tracking-wide text-white"
          >
            {loading ? "Logger inn..." : "Logg inn"}
          </button>
        </form>
      </section>
    </main>
  );
}
