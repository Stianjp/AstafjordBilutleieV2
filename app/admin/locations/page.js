"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [message, setMessage] = useState("");

  const loadLocations = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch("/api/admin/locations", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente lokasjoner.");
      return;
    }

    setLocations(dataResponse.locations || []);
  };

  const saveLocations = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch("/api/admin/locations", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ locations })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre.");
    } else {
      setMessage("Lagret.");
      setLocations(dataResponse.locations || []);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-5xl px-6 pb-16 pt-6">
        <h1 className="font-display text-3xl">Admin: lokasjoner</h1>
        {message && <p className="mt-3 text-sm text-coral">{message}</p>}
        <div className="mt-6 grid gap-4">
          {locations.map((loc, index) => (
            <div key={loc.id} className="gradient-card rounded-2xl p-4 shadow-card">
              <p className="font-medium">{loc.name}</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-ink/60">Delivery fee</label>
                  <input
                    type="number"
                    value={loc.delivery_fee}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setLocations((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, delivery_fee: value } : item
                        )
                      );
                    }}
                    className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-ink/60">Pickup fee</label>
                  <input
                    type="number"
                    value={loc.pickup_fee}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setLocations((prev) =>
                        prev.map((item, idx) =>
                          idx === index ? { ...item, pickup_fee: value } : item
                        )
                      );
                    }}
                    className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={saveLocations}
          className="mt-6 rounded-full bg-ink px-5 py-2 text-sm uppercase tracking-wide text-white"
        >
          Lagre endringer
        </button>
      </section>
    </main>
  );
}
