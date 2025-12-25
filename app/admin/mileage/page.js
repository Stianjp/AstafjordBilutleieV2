"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminMileagePage() {
  const [cars, setCars] = useState([]);
  const [carId, setCarId] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  const loadCars = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch("/api/admin/cars", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente biler.");
      return;
    }

    setCars(dataResponse.cars || []);
    if (!carId && dataResponse.cars?.length) {
      setCarId(dataResponse.cars[0].id);
    }
  };

  useEffect(() => {
    loadCars();
  }, []);

  const totalKm = useMemo(() => {
    if (!kmStart || !kmEnd) return 0;
    return Math.max(0, Number(kmEnd) - Number(kmStart));
  }, [kmStart, kmEnd]);

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
        car_id: carId,
        km_start: Number(kmStart),
        km_end: Number(kmEnd),
        reason
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre kilometer.");
    } else {
      setMessage(`Registrert. Total km: ${dataResponse.mileage.driven_km}`);
      setKmStart("");
      setKmEnd("");
      setReason("");
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-6">
        <h1 className="font-display text-3xl">Admin: kjorebok</h1>
        <p className="mt-2 text-sm text-ink/70">Registrer start- og sluttkm og arsaken.</p>
        <div className="mt-6 gradient-card rounded-3xl p-6 shadow-card">
          <label className="text-sm">Bil</label>
          <select
            value={carId}
            onChange={(event) => setCarId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>{car.model} ({car.reg_number})</option>
            ))}
          </select>
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
          <div className="mt-4">
            <label className="text-sm">Total km</label>
            <p className="mt-2 rounded-xl border border-ink/10 bg-white/70 p-3 text-sm">{totalKm} km</p>
          </div>
          <div className="mt-4">
            <label className="text-sm">Arsak</label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              rows={3}
            />
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
