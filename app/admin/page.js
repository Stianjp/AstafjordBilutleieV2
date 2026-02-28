"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const statusTabs = ["pending", "approved", "rejected", "cancelled", "active", "future", "past", "completed"];

const statusHelp = {
  pending: "Her vises bookingforesporsler. Flytt ved a godkjenne, avvise eller kansellere.",
  approved: "Her ligger alle godkjente bookinger. Se aktive/future/past for dato-baserte visninger.",
  rejected: "Her er oversikt over avviste bookinger. Disse kan slettes.",
  cancelled: "Her er oversikt over kansellerte bookinger. Disse kan slettes.",
  active: "Her ligger aktive leier. Nar leien er ferdig flyttes den automatisk til past.",
  future: "Her er oversikt over fremtidige leier. Disse flyttes automatisk til active nar perioden starter.",
  past: "Her er avsluttede leier. For a flytte til completed, oppdater sluttkm.",
  completed: "Her er fullforte leieforhold med registrert sluttkm."
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const isSameDate = (left, right) =>
  !!left && !!right
  && left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const formatDateShort = (value) => {
  const date = parseDateOnly(value);
  if (!date) return value || "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("nb-NO", { month: "long" });
  const year = String(date.getFullYear());
  return `${day}.${month} ${year}`;
};

export default function AdminDashboard() {
  const [status, setStatus] = useState("pending");
  const [allBookings, setAllBookings] = useState([]);
  const [cars, setCars] = useState([]);
  const [message, setMessage] = useState("");
  const [kmDrafts, setKmDrafts] = useState({});

  const displayedBookings = useMemo(() => {
    let next = allBookings || [];
    const today = startOfToday();

    if (["pending", "approved", "rejected", "cancelled", "completed"].includes(status)) {
      next = next.filter((booking) => booking.status === status);
    }

    if (["active", "future", "past"].includes(status)) {
      next = next.filter((booking) => booking.status === "approved");
      if (status === "active") {
        next = next.filter((booking) => {
          const start = parseDateOnly(booking.start_date);
          const end = parseDateOnly(booking.end_date);
          return start <= today && end >= today;
        });
      }
      if (status === "future") {
        next = next
          .filter((booking) => {
            const start = parseDateOnly(booking.start_date);
            return start > today;
          })
          .sort((a, b) => parseDateOnly(a.start_date) - parseDateOnly(b.start_date));
      }
      if (status === "past") {
        next = next.filter((booking) => {
          const end = parseDateOnly(booking.end_date);
          return end < today;
        });
      }
    }

    return next;
  }, [allBookings, status]);

  const statusCounts = useMemo(() => {
    const today = startOfToday();
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      active: 0,
      future: 0,
      past: 0,
      completed: 0
    };

    (allBookings || []).forEach((booking) => {
      if (counts[booking.status] != null) {
        counts[booking.status] += 1;
      }

      if (booking.status === "approved") {
        const start = parseDateOnly(booking.start_date);
        const end = parseDateOnly(booking.end_date);
        if (start <= today && end >= today) counts.active += 1;
        if (start > today) counts.future += 1;
        if (end < today) counts.past += 1;
      }
    });

    return counts;
  }, [allBookings]);

  const dashboardStats = useMemo(() => {
    const today = startOfToday();
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const activeCars = (cars || []).filter((car) => car.active);
    const rentedCarIds = new Set(
      (allBookings || [])
        .filter((booking) => booking.status === "approved")
        .filter((booking) => {
          const start = parseDateOnly(booking.start_date);
          const end = parseDateOnly(booking.end_date);
          return start <= today && end >= today;
        })
        .map((booking) => booking.car_id)
    );

    const bookingsNext30 = (allBookings || []).filter((booking) => {
      if (!["pending", "approved"].includes(booking.status)) return false;
      const start = parseDateOnly(booking.start_date);
      return start >= today && start <= in30Days;
    }).length;

    const completedThisYear = (allBookings || []).filter((booking) => {
      if (booking.status !== "completed") return false;
      const endDate = parseDateOnly(booking.end_date);
      return endDate && endDate.getFullYear() === today.getFullYear();
    }).length;

    return {
      rentedCars: rentedCarIds.size,
      availableCars: Math.max(0, activeCars.length - rentedCarIds.size),
      bookingsNext30,
      completedThisYear
    };
  }, [allBookings, cars]);

  const loadData = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const [bookingsResponse, carsResponse] = await Promise.all([
      fetch("/api/admin/bookings", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/cars", { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const bookingsPayload = await bookingsResponse.json();
    const carsPayload = await carsResponse.json();

    if (!bookingsResponse.ok) {
      setMessage(bookingsPayload.error || "Kunne ikke hente bookings.");
      return;
    }

    if (!carsResponse.ok) {
      setMessage(carsPayload.error || "Kunne ikke hente biler.");
      return;
    }

    setMessage("");
    const nextBookings = bookingsPayload.bookings || [];
    setAllBookings(nextBookings);
    setCars(carsPayload.cars || []);

    setKmDrafts((prev) => {
      const next = { ...prev };
      nextBookings.forEach((booking) => {
        if (!next[booking.id]) {
          next[booking.id] = {
            start_km: booking.start_km ?? "",
            end_km: booking.end_km ?? ""
          };
        }
      });
      return next;
    });
  };

  const updateStatus = async (id, nextStatus) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/bookings/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: nextStatus })
    });

    if (response.ok) {
      loadData();
    }
  };

  const deleteBooking = async (id) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/bookings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      loadData();
    }
  };

  const saveKm = async (booking) => {
    const draft = kmDrafts[booking.id];
    if (!draft) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        pickup_location_id: booking.pickup_location_id,
        delivery_location_id: booking.delivery_location_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        start_time: booking.start_time || null,
        end_time: booking.end_time || null,
        days: booking.days,
        calculated_price: booking.calculated_price,
        start_km: draft.start_km === "" ? null : Number(draft.start_km),
        end_km: draft.end_km === "" ? null : Number(draft.end_km)
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre kilometer.");
      return;
    }

    const today = startOfToday();
    const startDate = parseDateOnly(booking.start_date);
    const hasStartKm = draft.start_km !== "" && draft.start_km != null;
    const shouldActivate = status === "future" && hasStartKm && isSameDate(startDate, today);
    if (shouldActivate) {
      setStatus("active");
    }

    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="font-display text-3xl">Admin dashboard</h1>
      <p className="mt-2 text-sm text-ink/70">Oversikt over biler og bookingstatus.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="gradient-card rounded-2xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-ink/60">Biler utleid nå</p>
          <p className="mt-1 text-2xl font-semibold">{dashboardStats.rentedCars}</p>
        </div>
        <div className="gradient-card rounded-2xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-ink/60">Biler tilgjengelig</p>
          <p className="mt-1 text-2xl font-semibold">{dashboardStats.availableCars}</p>
        </div>
        <div className="gradient-card rounded-2xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-ink/60">Bookinger neste 30 dager</p>
          <p className="mt-1 text-2xl font-semibold">{dashboardStats.bookingsNext30}</p>
        </div>
        <div className="gradient-card rounded-2xl p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-ink/60">Completed i år</p>
          <p className="mt-1 text-2xl font-semibold">{dashboardStats.completedThisYear}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-ink/10 bg-white/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Antall</th>
              <th className="px-4 py-3">Handling</th>
            </tr>
          </thead>
          <tbody>
            {statusTabs.map((tab) => (
              <tr key={tab} className="border-t border-ink/10">
                <td className="px-4 py-3 font-medium">{tab}</td>
                <td className="px-4 py-3">{statusCounts[tab]}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setStatus(tab)}
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
                      status === tab ? "bg-ink text-white" : "border border-ink/20"
                    }`}
                  >
                    Vis
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-ink/70">{statusHelp[status]}</p>
      {message && <p className="mt-4 text-sm text-coral">{message}</p>}

      <div className="mt-6 grid gap-4">
        {displayedBookings.map((booking) => (
          <div key={booking.id} className="gradient-card rounded-2xl p-5 shadow-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-base font-semibold sm:text-lg">{booking.cars.model} ({booking.cars.reg_number})</p>
                <p className="text-sm text-ink/80 sm:text-base">
                  {formatDateShort(booking.start_date)} → {formatDateShort(booking.end_date)} ({booking.days} dager)
                </p>
                <p className="text-sm text-ink/80 sm:text-base">
                  Kunde: {booking.customers.first_name} {booking.customers.last_name}
                </p>
                <p className="text-sm text-ink/80 sm:text-base">
                  {booking.customers.email} · {booking.customers.phone}
                </p>
                <p className="text-sm text-ink/80 sm:text-base">
                  Pickup: {booking.pickup.name} / Levering: {booking.delivery.name}
                </p>
                {booking.cars?.owned_by_third_party && booking.cars?.third_party && (
                  <p className="text-sm text-ink/80 sm:text-base">
                    Tredjepart: {booking.cars.third_party.company_name
                      ? `${booking.cars.third_party.name} (${booking.cars.third_party.company_name})`
                      : booking.cars.third_party.name}
                  </p>
                )}
                {booking.child_seat_required && (
                  <p className="text-sm text-ink/80 sm:text-base">
                    Barnestol: Ja (+{booking.child_seat_fee != null ? booking.child_seat_fee : 300} kr)
                  </p>
                )}
                {booking.deductible_reduction_selected && (
                  <p className="text-sm text-ink/80 sm:text-base">
                    Egenandelsreduksjon: Ja (+{booking.deductible_reduction_fee != null ? booking.deductible_reduction_fee : 0} kr)
                  </p>
                )}
                {booking.customer_comment && (
                  <p className="text-sm text-ink/80 sm:text-base">
                    Kommentar: {booking.customer_comment}
                  </p>
                )}
              </div>
              <div className="text-left md:text-right">
                <p className="text-lg font-semibold sm:text-xl">{booking.calculated_price} kr</p>
                <a
                  className="mt-2 block text-[11px] uppercase tracking-wide text-ink/70 sm:text-xs"
                  href={`/admin/bookings/${booking.id}`}
                >
                  Rediger
                </a>
                {["active", "future", "past"].includes(status) && (
                  <div className="mt-3 rounded-2xl border border-ink/10 bg-white/60 p-3 text-[11px] sm:text-xs">
                    <p className="uppercase tracking-wide text-ink/50">Kilometer</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <input
                        type="number"
                        placeholder="Start km"
                        value={kmDrafts[booking.id]?.start_km ?? ""}
                        onChange={(event) =>
                          setKmDrafts((prev) => ({
                            ...prev,
                            [booking.id]: { ...prev[booking.id], start_km: event.target.value }
                          }))
                        }
                        className="w-full rounded-lg border border-ink/20 bg-white/80 p-2 sm:w-24"
                      />
                      <input
                        type="number"
                        placeholder="Slutt km"
                        value={kmDrafts[booking.id]?.end_km ?? ""}
                        onChange={(event) =>
                          setKmDrafts((prev) => ({
                            ...prev,
                            [booking.id]: { ...prev[booking.id], end_km: event.target.value }
                          }))
                        }
                        className="w-full rounded-lg border border-ink/20 bg-white/80 p-2 sm:w-24"
                      />
                      <button
                        className="rounded-full border border-ink/20 px-4 py-2 text-[11px] uppercase tracking-wide sm:text-[10px]"
                        onClick={() => saveKm(booking)}
                      >
                        Lagre km
                      </button>
                    </div>
                  </div>
                )}
                {status === "pending" && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide sm:text-xs">
                    <button
                      className="text-tide"
                      onClick={() => updateStatus(booking.id, "approved")}
                    >
                      Godkjenn
                    </button>
                    <button
                      className="text-coral"
                      onClick={() => updateStatus(booking.id, "rejected")}
                    >
                      Avvis
                    </button>
                    <button
                      className="text-ink/60"
                      onClick={() => updateStatus(booking.id, "cancelled")}
                    >
                      Kanseller
                    </button>
                  </div>
                )}
                {status === "approved" && (
                  <button
                    className="mt-2 text-[11px] uppercase tracking-wide text-ink/70 sm:text-xs"
                    onClick={() => updateStatus(booking.id, "cancelled")}
                  >
                    Kanseller
                  </button>
                )}
                {(status === "rejected" || status === "cancelled") && (
                  <button
                    className="mt-2 text-[11px] uppercase tracking-wide text-coral sm:text-xs"
                    onClick={() => deleteBooking(booking.id)}
                  >
                    Slett
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {displayedBookings.length === 0 && !message && (
          <p className="text-sm text-ink/70">Ingen bookings i denne statusen.</p>
        )}
      </div>
    </section>
  );
}
