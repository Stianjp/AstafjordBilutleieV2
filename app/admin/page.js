"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
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

export default function AdminDashboard() {
  const [status, setStatus] = useState("pending");
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [kmDrafts, setKmDrafts] = useState({});

  const loadBookings = async (selectedStatus = status) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const statusParam = ["pending", "approved", "rejected", "cancelled"].includes(selectedStatus)
      ? `?status=${selectedStatus}`
      : "";
    const response = await fetch(`/api/admin/bookings${statusParam}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente bookings.");
      return;
    }

    setMessage("");
    let nextBookings = dataResponse.bookings || [];
    if (["active", "future", "past"].includes(selectedStatus)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      nextBookings = nextBookings.filter((booking) => booking.status === "approved");
      if (selectedStatus === "active") {
        nextBookings = nextBookings.filter((booking) => {
          const start = new Date(booking.start_date);
          const end = new Date(booking.end_date);
          return start <= today && end >= today;
        });
      }
      if (selectedStatus === "future") {
        nextBookings = nextBookings.filter((booking) => new Date(booking.start_date) > today);
      }
      if (selectedStatus === "past") {
        nextBookings = nextBookings.filter((booking) => new Date(booking.end_date) < today);
      }
    }
    if (selectedStatus === "completed") {
      nextBookings = nextBookings.filter((booking) => booking.status === "completed");
    }
    setBookings(nextBookings);
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
      loadBookings();
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
      loadBookings();
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

    setBookings((prev) => prev.map((item) => (item.id === booking.id ? dataResponse.booking : item)));
    loadBookings();
  };

  useEffect(() => {
    loadBookings();
  }, [status]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
        <h1 className="font-display text-3xl">Admin dashboard</h1>
        <p className="mt-2 text-sm text-ink/70">Godkjenn eller avvis bookingforesporsler.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-wide">
          <a className="rounded-full border border-ink/20 px-4 py-2" href="/admin/cars">Biler</a>
          <a className="rounded-full border border-ink/20 px-4 py-2" href="/admin/locations">Lokasjoner</a>
          <a className="rounded-full border border-ink/20 px-4 py-2" href="/admin/mileage">Kjorebok</a>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-wide">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`rounded-full px-4 py-2 ${status === tab ? "bg-ink text-white" : "border border-ink/20"}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink/70">{statusHelp[status]}</p>
        {message && <p className="mt-4 text-sm text-coral">{message}</p>}
        <div className="mt-6 grid gap-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="gradient-card rounded-2xl p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{booking.cars.model} ({booking.cars.reg_number})</p>
                  <p className="text-sm text-ink/60">
                    {booking.start_date} → {booking.end_date} ({booking.days} dager)
                  </p>
                  <p className="text-sm text-ink/60">
                    Kunde: {booking.customers.first_name} {booking.customers.last_name}
                  </p>
                  <p className="text-sm text-ink/60">
                    Pickup: {booking.pickup.name} / Levering: {booking.delivery.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{booking.calculated_price} kr</p>
                  <a
                    className="mt-2 block text-xs uppercase tracking-wide text-ink/60"
                    href={`/admin/bookings/${booking.id}`}
                  >
                    Rediger
                  </a>
                  {["active", "future", "past"].includes(status) && (
                    <div className="mt-3 rounded-2xl border border-ink/10 bg-white/60 p-3 text-xs">
                      <p className="uppercase tracking-wide text-ink/50">Kilometer</p>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                          className="w-24 rounded-lg border border-ink/20 bg-white/80 p-2"
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
                          className="w-24 rounded-lg border border-ink/20 bg-white/80 p-2"
                        />
                        <button
                          className="rounded-full border border-ink/20 px-3 py-1 text-[10px] uppercase tracking-wide"
                          onClick={() => saveKm(booking)}
                        >
                          Lagre km
                        </button>
                      </div>
                    </div>
                  )}
                  {status === "pending" && (
                    <div className="mt-2 flex gap-2 text-xs uppercase tracking-wide">
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
                      className="mt-2 text-xs uppercase tracking-wide text-ink/60"
                      onClick={() => updateStatus(booking.id, "cancelled")}
                    >
                      Kanseller
                    </button>
                  )}
                  {status === "rejected" && (
                    <button
                      className="mt-2 text-xs uppercase tracking-wide text-coral"
                      onClick={() => deleteBooking(booking.id)}
                    >
                      Slett
                    </button>
                  )}
                  {status === "cancelled" && (
                    <button
                      className="mt-2 text-xs uppercase tracking-wide text-coral"
                      onClick={() => deleteBooking(booking.id)}
                    >
                      Slett
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {bookings.length === 0 && !message && (
            <p className="text-sm text-ink/70">Ingen bookings i denne statusen.</p>
          )}
        </div>
      </section>
    </main>
  );
}
