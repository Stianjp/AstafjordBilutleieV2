"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminMileagePage() {
  const [bookingId, setBookingId] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [message, setMessage] = useState("");

  const submitLog = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch("/api/admin/mileage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        booking_id: bookingId,
        km_start: Number(kmStart),
        km_end: Number(kmEnd)
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre kilometer.");
    } else {
      setMessage(`Registrert. Ekstra km: ${dataResponse.mileage.extra_km}, kostnad: ${dataResponse.mileage.extra_cost} kr`);
      setBookingId("");
      setKmStart("");
      setKmEnd("");
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-6">
        <h1 className="font-display text-3xl">Admin: kilometer</h1>
        <p className="mt-2 text-sm text-ink/70">Registrer km for avsluttet leie.</p>
        <div className="mt-6 gradient-card rounded-3xl p-6 shadow-card">
          <label className="text-sm">Booking ID</label>
          <input
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm">Km start</label>
              <input
                type="number"
                value={kmStart}
                onChange={(event) => setKmStart(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              />
            </div>
            <div>
              <label className="text-sm">Km slutt</label>
              <input
                type="number"
                value={kmEnd}
                onChange={(event) => setKmEnd(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              />
            </div>
          </div>
          {message && <p className="mt-3 text-sm text-coral">{message}</p>}
          <button
            onClick={submitLog}
            className="mt-5 rounded-full bg-ink px-5 py-2 text-sm uppercase tracking-wide text-white"
          >
            Registrer
          </button>
        </div>
      </section>
    </main>
  );
}
