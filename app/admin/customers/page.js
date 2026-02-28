"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const emptyForm = {
  id: "",
  type: "private",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  postal_code: "",
  region: "",
  org_number: "",
  invoice_method: "",
  invoice_email: ""
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const loadCustomers = async (query = "") => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMessage("Logg inn som admin.");
      return;
    }

    const qs = query ? `?q=${encodeURIComponent(query)}` : "";
    const response = await fetch(`/api/admin/customers${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke hente kunder.");
      return;
    }

    setCustomers(dataResponse.customers || []);

    if (selectedId) {
      const selected = (dataResponse.customers || []).find((customer) => customer.id === selectedId);
      if (!selected) {
        setSelectedId("");
        setForm(emptyForm);
      }
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const selectCustomer = (customer) => {
    setSelectedId(customer.id);
    setForm({
      id: customer.id,
      type: customer.type || "private",
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address_line_1: customer.address_line_1 || "",
      address_line_2: customer.address_line_2 || "",
      postal_code: customer.postal_code || "",
      region: customer.region || "",
      org_number: customer.org_number || "",
      invoice_method: customer.invoice_method || "",
      invoice_email: customer.invoice_email || ""
    });
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    if (!selectedId) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch(`/api/admin/customers/${selectedId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(form)
    });

    const dataResponse = await response.json();
    if (!response.ok) {
      setMessage(dataResponse.error || "Kunne ikke lagre kunde.");
      return;
    }

    setMessage("Kunde oppdatert.");
    await loadCustomers(search);

    const refreshed = (dataResponse.customer && {
      ...dataResponse.customer,
      bookings_count: customers.find((item) => item.id === selectedId)?.bookings_count || 0,
      last_booking_date: customers.find((item) => item.id === selectedId)?.last_booking_date || null
    }) || null;

    if (refreshed) {
      selectCustomer(refreshed);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6">
      <h1 className="font-display text-3xl">Admin: kunder</h1>
      <p className="mt-2 text-sm text-ink/70">Sok opp kunde og oppdater kontaktinformasjon.</p>
      {message && <p className="mt-3 text-sm text-coral">{message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-white/70 p-4 shadow-card">
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Sok navn, e-post eller telefon"
              className="w-full rounded-xl border border-ink/20 bg-white/90 p-3 text-sm"
            />
            <button
              type="button"
              onClick={() => loadCustomers(search)}
              className="rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide"
            >
              Sok
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {customers.map((customer) => {
              const active = selectedId === customer.id;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => selectCustomer(customer)}
                  className={`rounded-2xl border p-3 text-left ${active ? "border-ink bg-ink/5" : "border-ink/10 bg-white/70"}`}
                >
                  <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                  <p className="text-sm text-ink/70">{customer.email}</p>
                  <p className="text-sm text-ink/70">{customer.phone}</p>
                  <p className="text-xs text-ink/60">
                    Bookinger: {customer.bookings_count || 0}
                    {customer.last_booking_date ? ` • Siste: ${customer.last_booking_date}` : ""}
                  </p>
                </button>
              );
            })}
            {customers.length === 0 && (
              <p className="text-sm text-ink/70">Ingen kunder funnet.</p>
            )}
          </div>
        </div>

        <form onSubmit={saveCustomer} className="rounded-3xl bg-white/70 p-6 shadow-card">
          <h2 className="font-display text-xl">{selectedId ? "Rediger kunde" : "Velg kunde"}</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm">Type</label>
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              >
                <option value="private">Privat</option>
                <option value="company">Bedrift</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Org.nr</label>
              <input
                value={form.org_number}
                onChange={(event) => setForm({ ...form, org_number: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm">Fornavn</label>
              <input
                value={form.first_name}
                onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
                required
              />
            </div>
            <div>
              <label className="text-sm">Etternavn</label>
              <input
                value={form.last_name}
                onChange={(event) => setForm({ ...form, last_name: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
                required
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm">E-post</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
                required
              />
            </div>
            <div>
              <label className="text-sm">Telefon</label>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
                required
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm">Adresse</label>
              <input
                value={form.address_line_1}
                onChange={(event) => setForm({ ...form, address_line_1: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              />
            </div>
            <div>
              <label className="text-sm">Adresse 2</label>
              <input
                value={form.address_line_2}
                onChange={(event) => setForm({ ...form, address_line_2: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm">Postkode</label>
              <input
                value={form.postal_code}
                onChange={(event) => setForm({ ...form, postal_code: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              />
            </div>
            <div>
              <label className="text-sm">Region</label>
              <input
                value={form.region}
                onChange={(event) => setForm({ ...form, region: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm">Fakturametode</label>
              <input
                value={form.invoice_method}
                onChange={(event) => setForm({ ...form, invoice_method: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              />
            </div>
            <div>
              <label className="text-sm">Faktura e-post</label>
              <input
                value={form.invoice_email}
                onChange={(event) => setForm({ ...form, invoice_email: event.target.value })}
                className="mt-2 w-full rounded-xl border border-ink/20 bg-white/90 p-3"
                disabled={!selectedId}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedId}
            className="mt-6 rounded-full bg-ink px-5 py-2 text-sm uppercase tracking-wide text-white disabled:opacity-40"
          >
            Lagre kunde
          </button>
        </form>
      </div>
    </section>
  );
}
