"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../../lib/supabaseClient";

const statusTabs = ["pending", "approved", "rejected", "cancelled", "active", "future", "past"];

export default function AdminDashboard() {
  const [status, setStatus] = useState("pending");
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");

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
    setBookings(nextBookings);
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
          <a className="rounded-full border border-ink/20 px-4 py-2" href="/admin/mileage">Kilometer</a>
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
                    </div>
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
