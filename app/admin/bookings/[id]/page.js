"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function AdminBookingDetail() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id;
  const [booking, setBooking] = useState(null);
  const [locations, setLocations] = useState([]);
  const [cars, setCars] = useState([]);
  const [form, setForm] = useState({
    car_id: "",
    pickup_location_id: "",
    delivery_location_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    customer_first_name: "",
    customer_last_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address_line_1: "",
    customer_address_line_2: "",
    customer_postal_code: "",
    customer_region: "",
    customer_comment: "",
    child_seat_required: false,
    child_seat_fee: 300,
    deductible_reduction_selected: false,
    deductible_reduction_fee: 0,
    admin_note_1: "",
    admin_note_2: "",
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

    const [bookingResponse, locationsResponse, carsResponse] = await Promise.all([
      fetch(`/api/admin/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch("/api/admin/locations", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch("/api/admin/cars", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const bookingData = await bookingResponse.json();
    const locationData = await locationsResponse.json();
    const carsData = await carsResponse.json();
    if (!bookingResponse.ok) {
      setMessage(bookingData.error || "Kunne ikke hente booking.");
      return;
    }

    setBooking(bookingData.booking);
    setLocations(locationData.locations || []);
    setCars(carsData.cars || []);
    setForm({
      car_id: bookingData.booking.car_id,
      pickup_location_id: bookingData.booking.pickup_location_id,
      delivery_location_id: bookingData.booking.delivery_location_id,
      start_date: bookingData.booking.start_date,
      start_time: bookingData.booking.start_time || "",
      end_date: bookingData.booking.end_date,
      end_time: bookingData.booking.end_time || "",
      customer_first_name: bookingData.booking.customers.first_name || "",
      customer_last_name: bookingData.booking.customers.last_name || "",
      customer_email: bookingData.booking.customers.email || "",
      customer_phone: bookingData.booking.customers.phone || "",
      customer_address_line_1: bookingData.booking.customers.address_line_1 || "",
      customer_address_line_2: bookingData.booking.customers.address_line_2 || "",
      customer_postal_code: bookingData.booking.customers.postal_code || "",
      customer_region: bookingData.booking.customers.region || "",
      customer_comment: bookingData.booking.customer_comment || "",
      child_seat_required: bookingData.booking.child_seat_required || false,
      child_seat_fee: bookingData.booking.child_seat_fee ?? 300,
      deductible_reduction_selected: bookingData.booking.deductible_reduction_selected || false,
      deductible_reduction_fee: bookingData.booking.deductible_reduction_fee ?? 0,
      admin_note_1: bookingData.booking.admin_note_1 || "",
      admin_note_2: bookingData.booking.admin_note_2 || "",
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
        customer: {
          first_name: form.customer_first_name,
          last_name: form.customer_last_name,
          email: form.customer_email,
          phone: form.customer_phone,
          address_line_1: form.customer_address_line_1,
          address_line_2: form.customer_address_line_2,
          postal_code: form.customer_postal_code,
          region: form.customer_region
        },
        customer_comment: form.customer_comment,
        child_seat_required: form.child_seat_required,
        child_seat_fee: form.child_seat_required ? Number(form.child_seat_fee || 300) : 0,
        deductible_reduction_selected: form.deductible_reduction_selected,
        deductible_reduction_fee: form.deductible_reduction_selected
          ? Number(form.deductible_reduction_fee || 0)
          : 0,
        admin_note_1: form.admin_note_1,
        admin_note_2: form.admin_note_2,
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
      <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-6">
        <p className="text-sm text-ink/70">{message || "Laster..."}</p>
      </section>
    );
  }

  return (
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
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Fornavn</label>
                <input
                  value={form.customer_first_name}
                  onChange={(event) => setForm({ ...form, customer_first_name: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Etternavn</label>
                <input
                  value={form.customer_last_name}
                  onChange={(event) => setForm({ ...form, customer_last_name: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">E-post</label>
                <input
                  value={form.customer_email}
                  onChange={(event) => setForm({ ...form, customer_email: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Telefon</label>
                <input
                  value={form.customer_phone}
                  onChange={(event) => setForm({ ...form, customer_phone: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Adresse</label>
                <input
                  value={form.customer_address_line_1}
                  onChange={(event) => setForm({ ...form, customer_address_line_1: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Adresse 2</label>
                <input
                  value={form.customer_address_line_2}
                  onChange={(event) => setForm({ ...form, customer_address_line_2: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Postkode</label>
                <input
                  value={form.customer_postal_code}
                  onChange={(event) => setForm({ ...form, customer_postal_code: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Region</label>
                <input
                  value={form.customer_region}
                  onChange={(event) => setForm({ ...form, customer_region: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Kommentar (kunde)</label>
                <textarea
                  value={form.customer_comment}
                  onChange={(event) => setForm({ ...form, customer_comment: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  rows={3}
                />
              </div>
              <div className="grid gap-3">
                <label className="mt-1 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.child_seat_required}
                    onChange={(event) =>
                      setForm({ ...form, child_seat_required: event.target.checked })
                    }
                  />
                  Barnestol 3 mnd - 4 år (maks 18 kg)
                </label>
                {form.child_seat_required && (
                  <div>
                    <label className="text-sm">Barnestol (tillegg)</label>
                    <input
                      type="number"
                      value={form.child_seat_fee}
                      onChange={(event) => setForm({ ...form, child_seat_fee: event.target.value })}
                      className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                    />
                  </div>
                )}
                <label className="mt-1 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.deductible_reduction_selected}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      const fallbackFee = Number(form.days || 0) > 0 ? Number(form.days || 0) * 200 : 200;
                      setForm({
                        ...form,
                        deductible_reduction_selected: checked,
                        deductible_reduction_fee: checked
                          ? Number(form.deductible_reduction_fee || 0) || fallbackFee
                          : 0
                      });
                    }}
                  />
                  Egenandelsreduksjon ved skade
                </label>
                {form.deductible_reduction_selected && (
                  <div>
                    <label className="text-sm">Egenandelsreduksjon (tillegg)</label>
                    <input
                      type="number"
                      value={form.deductible_reduction_fee}
                      onChange={(event) => setForm({ ...form, deductible_reduction_fee: event.target.value })}
                      className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm">Diverse 1</label>
                  <input
                    value={form.admin_note_1}
                    onChange={(event) => setForm({ ...form, admin_note_1: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  />
                </div>
                <div>
                  <label className="text-sm">Diverse 2</label>
                  <input
                    value={form.admin_note_2}
                    onChange={(event) => setForm({ ...form, admin_note_2: event.target.value })}
                    className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  />
                </div>
              </div>
            </div>
            <label className="text-sm">Bil</label>
            <select
              value={form.car_id}
              onChange={(event) => setForm({ ...form, car_id: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
            >
              <option value="">Velg bil</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.model} ({car.reg_number})
                </option>
              ))}
            </select>
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
  );
}
