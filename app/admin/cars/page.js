"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

const emptyForm = {
  reg_number: "",
  model: "",
  seats: 5,
  transmission: "Manual",
  fuel: "Diesel",
  daily_price: "",
  monthly_price_cap: "",
  current_location_id: "",
  current_km: "",
  active: true
};

export default function AdminCarsPage() {
  const [cars, setCars] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const [carsResponse, locationsResponse] = await Promise.all([
      fetch("/api/admin/cars", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/locations", { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const carsData = await carsResponse.json();
    const locationsData = await locationsResponse.json();
    if (!carsResponse.ok) {
      setMessage(carsData.error || "Kunne ikke hente biler.");
      return;
    }

    setCars(carsData.cars || []);
    setLocations(locationsData.locations || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(editingId ? `/api/admin/cars/${editingId}` : "/api/admin/cars", {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...form,
        seats: Number(form.seats),
        daily_price: Number(form.daily_price),
        monthly_price_cap: Number(form.monthly_price_cap),
        current_km: Number(form.current_km)
      })
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre bil.");
    } else {
      setMessage("Lagret.");
      setForm(emptyForm);
      setEditingId(null);
      loadData();
    }
  };

  const handleEdit = (car) => {
    setEditingId(car.id);
    setForm({
      reg_number: car.reg_number,
      model: car.model,
      seats: car.seats,
      transmission: car.transmission,
      fuel: car.fuel,
      daily_price: car.daily_price,
      monthly_price_cap: car.monthly_price_cap,
      current_location_id: car.current_location_id || "",
      current_km: car.current_km,
      active: car.active
    });
  };

  const handleDelete = async (id) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/cars/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      loadData();
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
        <h1 className="font-display text-3xl">Admin: biler</h1>
        {message && <p className="mt-3 text-sm text-coral">{message}</p>}
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <form onSubmit={handleSubmit} className="gradient-card rounded-3xl p-6 shadow-card">
            <h2 className="font-display text-xl">{editingId ? "Rediger bil" : "Legg til bil"}</h2>
            <div className="mt-4">
              <label className="text-sm">Reg.nr</label>
              <input
                value={form.reg_number}
                onChange={(event) => setForm({ ...form, reg_number: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                required
              />
            </div>
            <div className="mt-4">
              <label className="text-sm">Modell</label>
              <input
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                required
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Seter</label>
                <input
                  type="number"
                  value={form.seats}
                  onChange={(event) => setForm({ ...form, seats: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  required
                />
              </div>
              <div>
                <label className="text-sm">Girkasse</label>
                <input
                  value={form.transmission}
                  onChange={(event) => setForm({ ...form, transmission: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  required
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Drivstoff</label>
                <input
                  value={form.fuel}
                  onChange={(event) => setForm({ ...form, fuel: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  required
                />
              </div>
              <div>
                <label className="text-sm">Dagpris</label>
                <input
                  type="number"
                  value={form.daily_price}
                  onChange={(event) => setForm({ ...form, daily_price: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm">Mnd prisloft</label>
              <input
                type="number"
                value={form.monthly_price_cap}
                onChange={(event) => setForm({ ...form, monthly_price_cap: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                required
              />
            </div>
            <div className="mt-4">
              <label className="text-sm">Lokasjon</label>
              <select
                value={form.current_location_id}
                onChange={(event) => setForm({ ...form, current_location_id: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              >
                <option value="">Velg lokasjon</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="mt-4">
              <label className="text-sm">Km stand</label>
              <input
                type="number"
                value={form.current_km}
                onChange={(event) => setForm({ ...form, current_km: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                required
              />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
              Aktiv
            </label>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-ink px-5 py-2 text-sm uppercase tracking-wide text-white"
              >
                {editingId ? "Oppdater" : "Legg til"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="text-xs uppercase tracking-wide text-ink/60"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Avbryt
                </button>
              )}
            </div>
          </form>
          <div className="grid gap-4 md:grid-cols-2">
            {cars.map((car) => (
              <div key={car.id} className="gradient-card rounded-2xl p-4 shadow-card">
                <p className="font-medium">{car.model}</p>
                <p className="text-sm text-ink/60">{car.reg_number}</p>
                <p className="text-sm text-ink/60">{car.daily_price} kr per dag</p>
                <p className="text-xs uppercase tracking-wide text-ink/50">
                  {car.active ? "Aktiv" : "Inaktiv"}
                </p>
                <div className="mt-3 flex gap-3 text-xs uppercase tracking-wide">
                  <button className="text-tide" onClick={() => handleEdit(car)}>Rediger</button>
                  <button className="text-coral" onClick={() => handleDelete(car.id)}>Slett</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
