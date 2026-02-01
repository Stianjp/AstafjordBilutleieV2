"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

const emptyForm = {
  key: "",
  name: "",
  fee: "",
  active: true
};

export default function AdminAddOnsPage() {
  const [addOns, setAddOns] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const loadAddOns = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch("/api/admin/add-ons", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente tilleggsutstyr.");
      return;
    }

    setAddOns(dataResponse.add_ons || []);
  };

  useEffect(() => {
    loadAddOns();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const payload = {
      key: form.key,
      name: form.name,
      fee: Number(form.fee || 0),
      active: form.active
    };

    const response = await fetch(editingId ? `/api/admin/add-ons/${editingId}` : "/api/admin/add-ons", {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre tilleggsutstyr.");
      return;
    }

    setMessage("Lagret.");
    setForm(emptyForm);
    setEditingId(null);
    loadAddOns();
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      key: item.key || "",
      name: item.name || "",
      fee: item.fee ?? "",
      active: item.active ?? true
    });
  };

  const handleDelete = async (id) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/add-ons/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      loadAddOns();
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
        <h1 className="font-display text-3xl">Admin: tilleggsutstyr</h1>
        {message && <p className="mt-3 text-sm text-coral">{message}</p>}
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <form onSubmit={handleSubmit} className="gradient-card rounded-3xl p-6 shadow-card">
            <h2 className="font-display text-xl">{editingId ? "Rediger tilleggsutstyr" : "Nytt tilleggsutstyr"}</h2>
            <div className="mt-4">
              <label className="text-sm">Nøkkel</label>
              <input
                value={form.key}
                onChange={(event) => setForm({ ...form, key: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                placeholder="child_seat"
                required
              />
            </div>
            <div className="mt-4">
              <label className="text-sm">Navn</label>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                placeholder="Barnestol 3 mnd - 4 år (maks 18 kg)"
                required
              />
            </div>
            <div className="mt-4">
              <label className="text-sm">Pris</label>
              <input
                type="number"
                value={form.fee}
                onChange={(event) => setForm({ ...form, fee: event.target.value })}
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
            {addOns.map((item) => (
              <div key={item.id} className="gradient-card rounded-2xl p-4 shadow-card">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-ink/60">{item.key}</p>
                <p className="text-sm text-ink/70">{item.fee} kr</p>
                <p className="text-xs uppercase tracking-wide text-ink/50">
                  {item.active ? "Aktiv" : "Inaktiv"}
                </p>
                <div className="mt-3 flex gap-3 text-xs uppercase tracking-wide">
                  <button className="text-tide" onClick={() => handleEdit(item)}>Rediger</button>
                  <button className="text-coral" onClick={() => handleDelete(item.id)}>Slett</button>
                </div>
              </div>
            ))}
            {addOns.length === 0 && (
              <p className="text-sm text-ink/70">Ingen tilleggsutstyr enda.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
