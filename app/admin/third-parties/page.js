"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const emptyForm = {
  name: "",
  company_name: "",
  email: "",
  phone: "",
  active: true
};

export default function AdminThirdPartiesPage() {
  const [thirdParties, setThirdParties] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const loadThirdParties = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch("/api/admin/third-parties", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente tredjeparter.");
      return;
    }

    setThirdParties(dataResponse.third_parties || []);
  };

  useEffect(() => {
    loadThirdParties();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const payload = {
      name: form.name,
      company_name: form.company_name || null,
      email: form.email,
      phone: form.phone,
      active: form.active
    };

    const response = await fetch(
      editingId ? `/api/admin/third-parties/${editingId}` : "/api/admin/third-parties",
      {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      }
    );

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre tredjepart.");
      return;
    }

    setMessage("Lagret.");
    setForm(emptyForm);
    setEditingId(null);
    loadThirdParties();
  };

  const handleEdit = (party) => {
    setEditingId(party.id);
    setForm({
      name: party.name || "",
      company_name: party.company_name || "",
      email: party.email || "",
      phone: party.phone || "",
      active: party.active ?? true
    });
  };

  const handleDelete = async (id) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/third-parties/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke slette tredjepart.");
      return;
    }

    loadThirdParties();
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
      <h1 className="font-display text-3xl">Admin: tredjeparter</h1>
      {message && <p className="mt-3 text-sm text-coral">{message}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <form onSubmit={handleSubmit} className="gradient-card rounded-3xl p-6 shadow-card">
          <h2 className="font-display text-xl">{editingId ? "Rediger tredjepart" : "Ny tredjepart"}</h2>
          <div className="mt-4">
            <label className="text-sm">Navn</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              required
            />
          </div>
          <div className="mt-4">
            <label className="text-sm">Firma (valgfritt)</label>
            <input
              value={form.company_name}
              onChange={(event) => setForm({ ...form, company_name: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
            />
          </div>
          <div className="mt-4">
            <label className="text-sm">E-post</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
              required
            />
          </div>
          <div className="mt-4">
            <label className="text-sm">Telefon</label>
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
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
          {thirdParties.map((party) => (
            <div key={party.id} className="gradient-card rounded-2xl p-4 shadow-card">
              <p className="font-medium">{party.company_name ? `${party.name} (${party.company_name})` : party.name}</p>
              <p className="text-sm text-ink/60">{party.email}</p>
              <p className="text-sm text-ink/60">{party.phone}</p>
              <p className="text-xs uppercase tracking-wide text-ink/50">
                {party.active ? "Aktiv" : "Inaktiv"}
              </p>
              <div className="mt-3 flex gap-3 text-xs uppercase tracking-wide">
                <button className="text-tide" onClick={() => handleEdit(party)}>Rediger</button>
                <button className="text-coral" onClick={() => handleDelete(party.id)}>Slett</button>
              </div>
            </div>
          ))}
          {thirdParties.length === 0 && (
            <p className="text-sm text-ink/70">Ingen tredjeparter enda.</p>
          )}
        </div>
      </div>
    </section>
  );
}
