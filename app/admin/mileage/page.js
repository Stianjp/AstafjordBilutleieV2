"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const kmValueEquals = (left, right) => {
  const a = left === "" || left == null ? null : Number(left);
  const b = right === "" || right == null ? null : Number(right);
  if (a == null && b == null) return true;
  return a === b;
};

const getLogTimestampMs = (log) => {
  const value = log?.created_at || log?.updated_at;
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) ? ms : 0;
};

const formatDateTimeShort = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("nb-NO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function AdminMileagePage() {
  const [cars, setCars] = useState([]);
  const [logs, setLogs] = useState([]);
  const [carId, setCarId] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [kmOverrideReason, setKmOverrideReason] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [editRows, setEditRows] = useState({});
  const [historyCarFilter, setHistoryCarFilter] = useState("all");
  const [historySourceFilter, setHistorySourceFilter] = useState("all");
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState("all");
  const [historySort, setHistorySort] = useState("latest_desc");
  const [historyQuery, setHistoryQuery] = useState("");
  const [showOnlyCarsWithLogs, setShowOnlyCarsWithLogs] = useState(true);

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
      setMessage(dataResponse.error || "Kunne ikke hente kjørebok.");
      return;
    }

    setLogs(dataResponse.logs || []);
  };

  useEffect(() => {
    loadCars();
    loadLogs();
  }, []);

  useEffect(() => {
    if (!carId || kmStart) return;
    const car = cars.find((item) => item.id === carId);
    if (car && car.current_km != null) {
      setKmStart(String(car.current_km));
    }
  }, [carId, cars, kmStart]);

  const totalKm = useMemo(() => {
    if (!kmStart || !kmEnd) return 0;
    return Math.max(0, Number(kmEnd) - Number(kmStart));
  }, [kmStart, kmEnd]);

  const submitLog = async () => {
    const selectedCar = cars.find((item) => item.id === carId);
    const latestCarKm = Number(selectedCar?.current_km || 0);
    const startChangedFromLatest = !kmValueEquals(kmStart, latestCarKm);
    if (startChangedFromLatest && !String(kmOverrideReason || "").trim()) {
      setMessage("Begrunnelse kreves når start km avviker fra siste km-stand på bilen.");
      return;
    }

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
        km_start: kmStart === "" ? null : Number(kmStart),
        km_end: kmEnd === "" ? null : Number(kmEnd),
        booking_id: bookingId || null,
        reason,
        override_reason: kmOverrideReason || null
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre kilometer.");
    } else {
      setMessage(`Registrert. Total km: ${dataResponse.mileage.driven_km}`);
      setKmStart("");
      setKmEnd("");
      setBookingId("");
      setKmOverrideReason("");
      setReason("");
      loadCars();
      loadLogs();
    }
  };

  const carsById = useMemo(() => {
    const map = new Map();
    cars.forEach((car) => map.set(car.id, car));
    return map;
  }, [cars]);

  const filteredLogs = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    const nowMs = Date.now();
    const periodDays = historyPeriodFilter === "all" ? null : Number(historyPeriodFilter);

    return logs.filter((log) => {
      if (historyCarFilter !== "all" && log.car_id !== historyCarFilter) {
        return false;
      }

      const source = log.source || "manual";
      if (historySourceFilter !== "all" && source !== historySourceFilter) {
        return false;
      }

      if (periodDays != null) {
        const timestampMs = getLogTimestampMs(log);
        if (!timestampMs) return false;
        const maxAgeMs = periodDays * 24 * 60 * 60 * 1000;
        if (nowMs - timestampMs > maxAgeMs) return false;
      }

      if (!query) return true;

      const car = carsById.get(log.car_id);
      const haystack = [
        String(car?.model || ""),
        String(car?.reg_number || ""),
        String(log.booking_id || ""),
        String(log.reason || ""),
        String(log.override_reason || ""),
        String(source)
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [
    logs,
    historyCarFilter,
    historySourceFilter,
    historyPeriodFilter,
    historyQuery,
    carsById
  ]);

  const groupedHistory = useMemo(() => {
    const map = new Map();

    cars.forEach((car) => {
      map.set(car.id, { carId: car.id, car, logs: [], latestMs: 0 });
    });

    filteredLogs.forEach((log) => {
      const existing = map.get(log.car_id) || {
        carId: log.car_id,
        car: carsById.get(log.car_id) || null,
        logs: [],
        latestMs: 0
      };
      existing.logs.push(log);
      map.set(log.car_id, existing);
    });

    const rows = Array.from(map.values()).map((entry) => {
      const sortedLogs = [...entry.logs].sort((a, b) => getLogTimestampMs(b) - getLogTimestampMs(a));
      return {
        ...entry,
        logs: sortedLogs,
        latestMs: sortedLogs.length ? getLogTimestampMs(sortedLogs[0]) : 0
      };
    });

    let next = rows;
    if (showOnlyCarsWithLogs) {
      next = next.filter((entry) => entry.logs.length > 0);
    }

    if (historySort === "latest_desc") {
      next = [...next].sort((a, b) => b.latestMs - a.latestMs);
    } else if (historySort === "latest_asc") {
      next = [...next].sort((a, b) => a.latestMs - b.latestMs);
    } else if (historySort === "model_asc") {
      next = [...next].sort((a, b) =>
        String(a.car?.model || "").localeCompare(String(b.car?.model || ""), "nb-NO")
      );
    } else if (historySort === "model_desc") {
      next = [...next].sort((a, b) =>
        String(b.car?.model || "").localeCompare(String(a.car?.model || ""), "nb-NO")
      );
    }

    return next;
  }, [cars, filteredLogs, showOnlyCarsWithLogs, historySort, carsById]);

  const totalDisplayedLogs = useMemo(
    () => groupedHistory.reduce((sum, entry) => sum + entry.logs.length, 0),
    [groupedHistory]
  );

  const startEdit = (log) => {
    setEditRows((prev) => ({
      ...prev,
      [log.id]: {
        car_id: log.car_id,
        km_start: log.km_start ?? "",
        km_end: log.km_end ?? "",
        booking_id: log.booking_id ?? "",
        reason: log.reason ?? "",
        override_reason: log.override_reason ?? "",
        source: log.source || "manual"
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
    const original = logs.find((log) => log.id === id);
    const latestCarKm = Number(cars.find((car) => car.id === draft.car_id)?.current_km || 0);
    const startWasChanged = !kmValueEquals(draft.km_start, original?.km_start ?? null);
    const startDiffersFromLatest = !kmValueEquals(draft.km_start, latestCarKm);
    if (startWasChanged && startDiffersFromLatest && !String(draft.override_reason || "").trim()) {
      setMessage("Begrunnelse kreves når start km avviker fra siste km-stand på bilen.");
      return;
    }

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
        km_start: draft.km_start === "" ? null : Number(draft.km_start),
        km_end: draft.km_end === "" ? null : Number(draft.km_end),
        booking_id: draft.booking_id || null,
        reason: draft.reason,
        override_reason: draft.override_reason || null,
        source: draft.source || "manual"
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
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <h1 className="font-display text-4xl text-ink">Admin: kjørebok</h1>
        <p className="mt-2 text-base text-ink/85">Registrer start- og sluttkm og årsaken.</p>
        <div className="mt-6 rounded-3xl border border-ink/20 bg-white p-6 shadow-lg">
          <label className="text-base font-medium text-ink">Bil</label>
          <select
            value={carId}
            onChange={(event) => {
              setCarId(event.target.value);
              setKmStart("");
            }}
            className="mt-2 w-full rounded-xl border border-ink/30 bg-white p-3 text-base text-ink"
          >
            {cars.map((car) => (
              <option key={car.id} value={car.id}>{car.model} ({car.reg_number})</option>
            ))}
          </select>
          <p className="mt-2 text-sm text-ink/80">
            Siste km-stand på valgt bil: {Math.round(Number(cars.find((item) => item.id === carId)?.current_km || 0))} km
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-base font-medium text-ink">Km start</label>
              <input
                type="number"
                value={kmStart}
                onChange={(event) => setKmStart(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/30 bg-white p-3 text-base text-ink"
              />
            </div>
            <div>
              <label className="text-base font-medium text-ink">Km slutt</label>
              <input
                type="number"
                value={kmEnd}
                onChange={(event) => setKmEnd(event.target.value)}
                className="mt-2 w-full rounded-xl border border-ink/30 bg-white p-3 text-base text-ink"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-base font-medium text-ink">Booking ID (valgfritt)</label>
            <input
              value={bookingId}
              onChange={(event) => setBookingId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/30 bg-white p-3 text-base text-ink"
              placeholder="Knytt registreringen til booking"
            />
          </div>
          <div className="mt-4">
            <label className="text-base font-medium text-ink">Begrunnelse ved avvik i start km</label>
            <textarea
              value={kmOverrideReason}
              onChange={(event) => setKmOverrideReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/30 bg-white p-3 text-base text-ink"
              rows={2}
            />
          </div>
          <div className="mt-4">
            <label className="text-base font-medium text-ink">Total km</label>
            <p className="mt-2 rounded-xl border border-ink/20 bg-white p-3 text-base text-ink">{totalKm} km</p>
          </div>
          <div className="mt-4">
            <label className="text-base font-medium text-ink">Årsak</label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/30 bg-white p-3 text-base text-ink"
              rows={3}
            />
          </div>
          {message && <p className="mt-3 text-base text-red-700">{message}</p>}
          <button
            onClick={submitLog}
            className="mt-5 rounded-full bg-ink px-6 py-3 text-base font-semibold uppercase tracking-wide text-white"
          >
            Registrer
          </button>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-3xl text-ink">Historikk per bil</h2>
          <p className="mt-1 text-base text-ink/80">
            Viser {groupedHistory.length} biler og {totalDisplayedLogs} registreringer.
          </p>

          <div className="mt-4 grid gap-3 rounded-2xl border border-ink/20 bg-white p-4 md:grid-cols-2 xl:grid-cols-6">
            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-ink/80">Bil</label>
              <select
                value={historyCarFilter}
                onChange={(event) => setHistoryCarFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
              >
                <option value="all">Alle biler</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.model} ({car.reg_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-ink/80">Kilde</label>
              <select
                value={historySourceFilter}
                onChange={(event) => setHistorySourceFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
              >
                <option value="all">Alle kilder</option>
                <option value="manual">manual</option>
                <option value="booking">booking</option>
                <option value="car_adjustment">car_adjustment</option>
                <option value="legacy">legacy</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-ink/80">Periode</label>
              <select
                value={historyPeriodFilter}
                onChange={(event) => setHistoryPeriodFilter(event.target.value)}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
              >
                <option value="all">Hele historikken</option>
                <option value="7">Siste 7 dager</option>
                <option value="30">Siste 30 dager</option>
                <option value="90">Siste 90 dager</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold uppercase tracking-wide text-ink/80">Sorter biler</label>
              <select
                value={historySort}
                onChange={(event) => setHistorySort(event.target.value)}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
              >
                <option value="latest_desc">Sist registrert (nyeste)</option>
                <option value="latest_asc">Sist registrert (eldste)</option>
                <option value="model_asc">Modell (A-Å)</option>
                <option value="model_desc">Modell (Å-A)</option>
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="text-sm font-semibold uppercase tracking-wide text-ink/80">Søk</label>
              <input
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
                className="mt-1 w-full rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
                placeholder="Søk i modell, regnr, booking-ID, årsak"
              />
            </div>

            <label className="md:col-span-2 xl:col-span-6 flex items-center gap-2 text-base text-ink/85">
              <input
                type="checkbox"
                checked={showOnlyCarsWithLogs}
                onChange={(event) => setShowOnlyCarsWithLogs(event.target.checked)}
              />
              Vis kun biler med registreringer
            </label>
          </div>

          {groupedHistory.map((entry) => {
            const car = entry.car;
            const carLogs = entry.logs;
            const latest = carLogs[0];
            return (
              <div
                key={entry.carId || `car-${car?.reg_number || "unknown"}`}
                className="mt-6 rounded-2xl border border-ink/20 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xl font-semibold text-ink">{car?.model || "Ukjent bil"} ({car?.reg_number || "-"})</p>
                  <p className="text-sm text-ink/80">
                    Sist registrert: {latest ? formatDateTimeShort(latest.created_at || latest.updated_at) : "-"} · {carLogs.length} oppføringer
                  </p>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-base">
                    <thead>
                      <tr className="text-left text-sm uppercase tracking-wide text-ink/75">
                        <th className="py-3">Start km</th>
                        <th className="py-3">Slutt km</th>
                        <th className="py-3">Total</th>
                        <th className="py-3">Booking ID</th>
                        <th className="py-3">Årsak</th>
                        <th className="py-3">Override</th>
                        <th className="py-3">Kilde</th>
                        <th className="py-3">Registrert</th>
                        <th className="py-3">Handling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carLogs.map((log) => {
                        const edit = editRows[log.id];
                        return (
                          <tr key={log.id} className="border-t border-ink/20">
                            <td className="py-3 text-ink">
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
                                  className="w-28 rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
                                />
                              ) : (
                                `${log.km_start}`
                              )}
                            </td>
                            <td className="py-3 text-ink">
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
                                  className="w-28 rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
                                />
                              ) : (
                                `${log.km_end}`
                              )}
                            </td>
                            <td className="py-3 text-ink">
                              {edit ? `${rowTotal(edit)} km` : `${log.driven_km} km`}
                            </td>
                            <td className="py-3 text-ink">
                              {edit ? (
                                <input
                                  value={edit.booking_id}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, booking_id: event.target.value }
                                    }))
                                  }
                                  className="w-48 rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
                                />
                              ) : (
                                log.booking_id || "-"
                              )}
                            </td>
                            <td className="py-3 text-ink">
                              {edit ? (
                                <input
                                  value={edit.reason}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, reason: event.target.value }
                                    }))
                                  }
                                  className="w-64 rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
                                />
                              ) : (
                                log.reason || "-"
                              )}
                            </td>
                            <td className="py-3 text-ink">
                              {edit ? (
                                <input
                                  value={edit.override_reason}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, override_reason: event.target.value }
                                    }))
                                  }
                                  className="w-64 rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
                                />
                              ) : (
                                log.override_reason || "-"
                              )}
                            </td>
                            <td className="py-3 text-ink">
                              {edit ? (
                                <select
                                  value={edit.source}
                                  onChange={(event) =>
                                    setEditRows((prev) => ({
                                      ...prev,
                                      [log.id]: { ...edit, source: event.target.value }
                                    }))
                                  }
                                  className="rounded-lg border border-ink/30 bg-white p-2.5 text-base text-ink"
                                >
                                  <option value="manual">manual</option>
                                  <option value="booking">booking</option>
                                  <option value="car_adjustment">car_adjustment</option>
                                  <option value="legacy">legacy</option>
                                </select>
                              ) : (
                                log.source || "manual"
                              )}
                            </td>
                            <td className="py-3 whitespace-nowrap text-ink/80">
                              {formatDateTimeShort(log.created_at || log.updated_at)}
                            </td>
                            <td className="py-3">
                              {edit ? (
                                <div className="flex gap-3 text-sm uppercase tracking-wide">
                                  <button
                                    className="font-semibold text-tide"
                                    onClick={() => saveEdit(log.id)}
                                  >
                                    Lagre
                                  </button>
                                  <button
                                    className="font-semibold text-coral"
                                    onClick={() => cancelEdit(log.id)}
                                  >
                                    Avbryt
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="text-sm font-semibold uppercase tracking-wide text-ink/80"
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
                          <td className="py-4 text-base text-ink/70" colSpan={9}>
                            Ingen kjørebokoppføringer enda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {groupedHistory.length === 0 && (
            <p className="mt-6 text-base text-ink/70">
              Ingen treff med valgt filtrering.
            </p>
          )}
        </div>
    </section>
  );
}
