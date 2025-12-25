"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

export default function AdminMileagePage() {
  const [cars, setCars] = useState([]);
  const [logs, setLogs] = useState([]);
  const [carId, setCarId] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [editRows, setEditRows] = useState({});

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

  const loadLogs = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch("/api/admin/mileage", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente kjorebok.");
      return;
    }

    setLogs(dataResponse.logs || []);
  };

  useEffect(() => {
    loadCars();
    loadLogs();
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
      loadLogs();
    }
  };

  const logsByCar = useMemo(() => {
    const map = new Map();
    cars.forEach((car) => map.set(car.id, []));
    logs.forEach((log) => {
      if (!map.has(log.car_id)) {
        map.set(log.car_id, []);
      }
      map.get(log.car_id).push(log);
    });
    return map;
  }, [cars, logs]);

  const startEdit = (log) => {
    setEditRows((prev) => ({
      ...prev,
      [log.id]: {
        car_id: log.car_id,
        km_start: log.km_start ?? "",
        km_end: log.km_end ?? "",
        booking_id: log.booking_id ?? "",
        reason: log.reason ?? ""
      }
    }));
  };

  const cancelEdit = (id) => {
    setEditRows((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const saveEdit = async (id) => {
    const draft = editRows[id];
    if (!draft) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch(`/api/admin/mileage/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        car_id: draft.car_id,
        km_start: Number(draft.km_start),
        km_end: Number(draft.km_end),
        booking_id: draft.booking_id || null,
        reason: draft.reason
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke oppdatere.");
      return;
    }

    setLogs((prev) => prev.map((log) => (log.id === id ? dataResponse.log : log)));
    cancelEdit(id);
  };

  const rowTotal = (row) => {
    if (row.km_start === "" || row.km_end === "") return 0;
    return Math.max(0, Number(row.km_end) - Number(row.km_start));
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
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

        <div className="mt-10">
          <h2 className="font-display text-2xl">Historikk per bil</h2>
          {[...logsByCar.entries()].map(([carKey, carLogs]) => {
            const car = cars.find((item) => item.id === carKey);
            return (
              <div key={carKey} className="mt-6">
                <p className="font-medium">{car?.model || "Ukjent bil"} ({car?.reg_number || "-"})</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                        <th className="py-2">Start km</th>
                        <th className="py-2">Slutt km</th>
                        <th className="py-2">Total</th>
                        <th className="py-2">Booking ID</th>
                        <th className="py-2">Arsak</th>
                        <th className="py-2">Handling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carLogs.map((log) => {
                        const edit = editRows[log.id];
                        return (
                          <tr key={log.id} className="border-t border-ink/10">
                            <td className="py-2">
                              {edit ? (
                                <input
                                  type="number"
                                  value={edit.km_start}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, km_start: event.target.value }
                                    }))
                                  }
                                  className="w-28 rounded-lg border border-ink/20 bg-white/80 p-2"
                                />
                              ) : (
                                `${log.km_start}`
                              )}
                            </td>
                            <td className="py-2">
                              {edit ? (
                                <input
                                  type="number"
                                  value={edit.km_end}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, km_end: event.target.value }
                                    }))
                                  }
                                  className="w-28 rounded-lg border border-ink/20 bg-white/80 p-2"
                                />
                              ) : (
                                `${log.km_end}`
                              )}
                            </td>
                            <td className="py-2">
                              {edit ? `${rowTotal(edit)} km` : `${log.driven_km} km`}
                            </td>
                            <td className="py-2">
                              {edit ? (
                                <input
                                  value={edit.booking_id}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, booking_id: event.target.value }
                                    }))
                                  }
                                  className="w-48 rounded-lg border border-ink/20 bg-white/80 p-2"
                                />
                              ) : (
                                log.booking_id || "-"
                              )}
                            </td>
                            <td className="py-2">
                              {edit ? (
                                <input
                                  value={edit.reason}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, reason: event.target.value }
                                    }))
                                  }
                                  className="w-64 rounded-lg border border-ink/20 bg-white/80 p-2"
                                />
                              ) : (
                                log.reason || "-"
                              )}
                            </td>
                            <td className="py-2">
                              {edit ? (
                                <div className="flex gap-2 text-xs uppercase tracking-wide">
                                  <button
                                    className="text-tide"
                                    onClick={() => saveEdit(log.id)}
                                  >
                                    Lagre
                                  </button>
                                  <button
                                    className="text-coral"
                                    onClick={() => cancelEdit(log.id)}
                                  >
                                    Avbryt
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="text-xs uppercase tracking-wide text-ink/60"
                                  onClick={() => startEdit(log)}
                                >
                                  Rediger
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {carLogs.length === 0 && (
                        <tr>
                          <td className="py-3 text-sm text-ink/60" colSpan={6}>
                            Ingen kjorebokoppforinger enda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
