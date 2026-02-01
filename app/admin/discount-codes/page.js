"use client";

import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { supabase } from "../../../lib/supabaseClient";

const emptyForm = {
  code: "",
  type: "percent",
  value: "",
  active: true,
  starts_at: "",
  ends_at: "",
  usage_limit: ""
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateShort = (value) => {
  const date = parseDateOnly(value);
  if (!date) return value || "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleDateString("nb-NO", { month: "long" });
  const year = String(date.getFullYear());
  return `${day}.${month} ${year}`;
};

export default function AdminDiscountCodesPage() {
  const [codes, setCodes] = useState([]);
  const [codeBookings, setCodeBookings] = useState({});
  const [openCodeId, setOpenCodeId] = useState(null);
  const [loadingCodeId, setLoadingCodeId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const loadCodes = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const response = await fetch("/api/admin/discount-codes", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente rabattkoder.");
      return;
    }

    setCodes(dataResponse.codes || []);
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const payload = {
      code: form.code,
      type: form.type,
      value: Number(form.value),
      active: form.active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      usage_limit: form.usage_limit === "" ? null : Number(form.usage_limit)
    };

    const response = await fetch(editingId ? `/api/admin/discount-codes/${editingId}` : "/api/admin/discount-codes", {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre rabattkode.");
      return;
    }

    setMessage("Lagret.");
    setForm(emptyForm);
    setEditingId(null);
    loadCodes();
  };

  const handleEdit = (code) => {
    setEditingId(code.id);
    setForm({
      code: code.code || "",
      type: code.type || "percent",
      value: code.value ?? "",
      active: code.active ?? true,
      starts_at: code.starts_at || "",
      ends_at: code.ends_at || "",
      usage_limit: code.usage_limit ?? ""
    });
  };

  const handleDelete = async (id) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/discount-codes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.ok) {
      loadCodes();
    }
  };

  const toggleBookings = async (codeId) => {
    if (openCodeId === codeId) {
      setOpenCodeId(null);
      return;
    }

    setOpenCodeId(codeId);
    if (codeBookings[codeId]) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setLoadingCodeId(codeId);
    const response = await fetch(`/api/admin/discount-codes/${codeId}/bookings`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dataResponse = await response.json();
    if (response.ok) {
      setCodeBookings((prev) => ({ ...prev, [codeId]: dataResponse.bookings || [] }));
    }
    setLoadingCodeId(null);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
        <h1 className="font-display text-3xl">Admin: rabattkoder</h1>
        {message && <p className="mt-3 text-sm text-coral">{message}</p>}
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <form onSubmit={handleSubmit} className="gradient-card rounded-3xl p-6 shadow-card">
            <h2 className="font-display text-xl">{editingId ? "Rediger kode" : "Ny rabattkode"}</h2>
            <div className="mt-4">
              <label className="text-sm">Kode</label>
              <input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                placeholder="SOMMER2026"
                required
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Type</label>
                <select
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                >
                  <option value="percent">Prosent</option>
                  <option value="amount">Beløp</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Verdi</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(event) => setForm({ ...form, value: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  required
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Startdato</label>
                <input
                  type="date"
                  value={form.starts_at}
                  onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
              <div>
                <label className="text-sm">Sluttdato</label>
                <input
                  type="date"
                  value={form.ends_at}
                  onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm">Bruksgrense</label>
                <input
                  type="number"
                  value={form.usage_limit}
                  onChange={(event) => setForm({ ...form, usage_limit: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-white/80 p-3"
                  placeholder="Ubegrenset"
                />
                <p className="mt-2 text-xs text-ink/60">Hvis du ikke skriver inn noe her, vil det være ubegrenset.</p>
              </div>
              <label className="mt-6 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                />
                Aktiv
              </label>
            </div>
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
            {codes.map((code) => (
              <div key={code.id} className="gradient-card rounded-2xl p-4 shadow-card">
                <p className="font-medium">{code.code}</p>
                <p className="text-sm text-ink/70">
                  {code.type === "percent" ? `${code.value}%` : `${code.value} kr`}
                </p>
                <p className="text-sm text-ink/60">
                  Aktiv: {code.active ? "Ja" : "Nei"}
                </p>
                <p className="text-sm text-ink/60">
                  Brukt: {code.used_count}{code.usage_limit != null ? ` / ${code.usage_limit}` : ""}
                </p>
                <div className="mt-3 flex gap-3 text-xs uppercase tracking-wide">
                  <button className="text-tide" onClick={() => handleEdit(code)}>Rediger</button>
                  <button className="text-coral" onClick={() => handleDelete(code.id)}>Slett</button>
                  <button className="text-ink/60" onClick={() => toggleBookings(code.id)}>
                    {openCodeId === code.id ? "Skjul bruk" : "Se bruk"}
                  </button>
                </div>
                {openCodeId === code.id && (
                  <div className="mt-3 rounded-xl border border-ink/10 bg-white/70 p-3 text-sm">
                    {loadingCodeId === code.id && <p className="text-xs text-ink/60">Laster...</p>}
                    {!loadingCodeId && (codeBookings[code.id]?.length ?? 0) === 0 && (
                      <p className="text-xs text-ink/60">Ingen bookinger med denne koden.</p>
                    )}
                    {(codeBookings[code.id] || []).map((booking) => (
                      <div key={booking.id} className="border-b border-ink/10 py-2 last:border-b-0">
                        <p className="font-medium">
                          {booking.customers?.first_name} {booking.customers?.last_name}
                        </p>
                        <p className="text-xs text-ink/70">
                          {booking.cars?.model} • {formatDateShort(booking.start_date)} → {formatDateShort(booking.end_date)}
                        </p>
                        <a
                          className="mt-1 inline-block text-xs uppercase tracking-wide text-ink/60"
                          href={`/admin/bookings/${booking.id}`}
                        >
                          Se mer
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {codes.length === 0 && (
              <p className="text-sm text-ink/70">Ingen rabattkoder enda.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
