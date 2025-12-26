"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { supabase } from "../../../../lib/supabaseClient";

export default function AdminBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id;
  const [booking, setBooking] = useState(null);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    pickup_location_id: "",
    delivery_location_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    start_km: "",
    end_km: "",
    days: "",
    calculated_price: ""
  });
  const [message, setMessage] = useState("");

  const loadBooking = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const [bookingResponse, locationsResponse] = await Promise.all([
      fetch(`/api/admin/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch("/api/admin/locations", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const bookingData = await bookingResponse.json();
    const locationData = await locationsResponse.json();
    if (!bookingResponse.ok) {
      setMessage(bookingData.error || "Kunne ikke hente booking.");
      return;
    }

    setBooking(bookingData.booking);
    setLocations(locationData.locations || []);
    setForm({
      pickup_location_id: bookingData.booking.pickup_location_id,
      delivery_location_id: bookingData.booking.delivery_location_id,
      start_date: bookingData.booking.start_date,
      start_time: bookingData.booking.start_time || "",
      end_date: bookingData.booking.end_date,
      end_time: bookingData.booking.end_time || "",
      start_km: bookingData.booking.start_km ?? "",
      end_km: bookingData.booking.end_km ?? "",
      days: bookingData.booking.days,
      calculated_price: bookingData.booking.calculated_price
    });
  };

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const handleSave = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...form,
        days: form.days ? Number(form.days) : undefined,
        calculated_price: form.calculated_price ? Number(form.calculated_price) : undefined,
        start_km: form.start_km === "" ? null : Number(form.start_km),
        end_km: form.end_km === "" ? null : Number(form.end_km)
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke oppdatere booking.");
    } else {
      setBooking(dataResponse.booking);
      setMessage("Lagret.");
    }
  };

  if (!booking) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-6">
          <p className="text-sm text-ink/70">{message || "Laster..."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-6">
        <button
          className="text-xs uppercase tracking-wide text-ink/60"
          onClick={() => router.back()}
        >
          ← Tilbake
        </button>
        <h1 className="mt-3 font-display text-3xl">Booking {booking.id}</h1>
        <p className="mt-2 text-sm text-ink/70">{booking.cars.model} • {booking.customers.first_name} {booking.customers.last_name}</p>
        {message && <p className="mt-3 text-sm text-coral">{message}</p>}
        <div className="mt-6 grid gap-4">
          <div className="gradient-card rounded-3xl p-6 shadow-card">
            <label className="text-sm">Pickup</label>
            <select
              value={form.pickup_location_id}
              onChange={(event) => setForm({ ...form, pickup_location_id: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <label className="mt-4 text-sm">Levering</label>
            <select
              value={form.delivery_location_id}
              onChange={(event) => setForm({ ...form, delivery_location_id: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Startdato</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(event) => setForm({ ...form, start_date: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Sluttdato</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(event) => setForm({ ...form, end_date: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Starttid</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(event) => setForm({ ...form, start_time: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Slutttid</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(event) => setForm({ ...form, end_time: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Dager</label>
                <input
                  type="number"
                  value={form.days}
                  onChange={(event) => setForm({ ...form, days: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Pris (overstyr)</label>
                <input
                  type="number"
                  value={form.calculated_price}
                  onChange={(event) => setForm({ ...form, calculated_price: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Start km</label>
                <input
                  type="number"
                  value={form.start_km}
                  onChange={(event) => setForm({ ...form, start_km: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Slutt km</label>
                <input
                  type="number"
                  value={form.end_km}
                  onChange={(event) => setForm({ ...form, end_km: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              className="mt-6 rounded-full bg-ink px-5 py-2 text-sm uppercase tracking-wide text-white"
            >
              Lagre endringer
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
