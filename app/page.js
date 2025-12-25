"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import CarCard from "./components/CarCard";
import { translations, getLanguageValue } from "../lib/i18n";
import { calculateFinalPrice, calculateFees, calculateDays } from "../lib/pricing";

const emptyCustomer = {
  type: "private",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  org_number: "",
  invoice_method: "",
  invoice_email: "",
  age_confirmed: false
};

export default function HomePage() {
  const [cars, setCars] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("no");

  useEffect(() => {
    const stored = getLanguageValue(window.localStorage.getItem("lang"));
    setLanguage(stored);
    const handleLang = () => {
      const next = getLanguageValue(window.localStorage.getItem("lang"));
      setLanguage(next);
    };
    window.addEventListener("languagechange", handleLang);
    return () => window.removeEventListener("languagechange", handleLang);
  }, []);

  const t = translations[language];

  const loadData = async () => {
    const [carsResponse, locationsResponse] = await Promise.all([
      fetch("/api/cars"),
      fetch("/api/locations")
    ]);
    const carsData = await carsResponse.json();
    const locationsData = await locationsResponse.json();
    setCars(carsData.cars || []);
    setLocations(locationsData.locations || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedPickup = locations.find((loc) => loc.id === pickupLocation);
  const selectedDelivery = locations.find((loc) => loc.id === deliveryLocation);

  const pricePreview = useMemo(() => {
    if (!selectedCar || !startDate || !endDate || !selectedPickup || !selectedDelivery) {
      return null;
    }

    const days = calculateDays(startDate, endDate);
    if (days <= 0) return null;

    const basePrice = calculateFinalPrice(days, selectedCar.daily_price, selectedCar.monthly_price_cap);
    const { deliveryFee, pickupFee } = calculateFees(selectedPickup, selectedDelivery);
    const deliveryZero = selectedCar.current_location_id === selectedPickup.id ? 0 : deliveryFee;
    return {
      days,
      total: basePrice + deliveryZero + pickupFee,
      deliveryFee: deliveryZero,
      pickupFee
    };
  }, [selectedCar, startDate, endDate, selectedPickup, selectedDelivery]);

  const minStartDate = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return next.toISOString().slice(0, 10);
  }, []);

  const submitBooking = async () => {
    setMessage("");
    if (!selectedCar || !pickupLocation || !deliveryLocation || !startDate || !endDate) {
      setMessage(t.booking.missing);
      return;
    }

    if (!termsAccepted) {
      setMessage(t.booking.acceptTerms);
      return;
    }

    setLoading(true);
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        car_id: selectedCar.id,
        pickup_location_id: pickupLocation,
        delivery_location_id: deliveryLocation,
        start_date: startDate,
        end_date: endDate,
        terms_accepted: termsAccepted,
        customer
      })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || t.booking.error);
    } else {
      setMessage(t.booking.success);
      setSelectedCar(null);
      setPickupLocation("");
      setDeliveryLocation("");
      setStartDate("");
      setEndDate("");
      setCustomer(emptyCustomer);
      setTermsAccepted(false);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="relative mx-auto grid w-full max-w-6xl gap-8 px-6 pb-16 pt-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-tide">Astafjord</p>
            <h1 className="font-display text-4xl sm:text-5xl">{t.hero.title}</h1>
            <p className="mt-3 text-ink/70">{t.hero.subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} showReserve onReserve={setSelectedCar} />
            ))}
          </div>
        </div>
        <aside className="relative" id="booking">
          <div className="blur-orb absolute right-0 top-0 h-40 w-40" />
          <div className="gradient-card relative rounded-3xl p-6 shadow-card">
            <h2 className="font-display text-2xl">{t.booking.title}</h2>
            <p className="mt-2 text-sm text-ink/70">{t.booking.info}</p>
            <p className="mt-2 text-xs text-ink/60">{t.booking.kmInfo}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">{t.labels.car}</label>
              <select
                value={selectedCar?.id || ""}
                onChange={(event) => {
                  const car = cars.find((item) => item.id === event.target.value);
                  setSelectedCar(car || null);
                }}
                className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                required
              >
                <option value="">{t.labels.selectCar}</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>{car.model}</option>
                ))}
              </select>
              <label className="block text-sm">{t.labels.pickup}</label>
              <select
                value={pickupLocation}
                onChange={(event) => setPickupLocation(event.target.value)}
                className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                required
              >
                <option value="">{t.labels.selectLocation}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <label className="block text-sm">{t.labels.delivery}</label>
              <select
                value={deliveryLocation}
                onChange={(event) => setDeliveryLocation(event.target.value)}
                className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                required
              >
                <option value="">{t.labels.selectLocation}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <label className="block text-sm">{t.labels.startDate}</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                required
                min={minStartDate}
              />
              <label className="block text-sm">{t.labels.endDate}</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                required
                min={startDate || minStartDate}
              />
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-semibold">{t.booking.customer}</h3>
              <div className="mt-3 grid gap-3">
                <select
                  value={customer.type}
                  onChange={(event) => setCustomer({ ...customer, type: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                >
                  <option value="private">{t.labels.privateType}</option>
                  <option value="company">{t.labels.companyType}</option>
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    placeholder={t.labels.firstName}
                    value={customer.first_name}
                    onChange={(event) => setCustomer({ ...customer, first_name: event.target.value })}
                    className="rounded-xl border border-ink/20 bg-white/70 p-3"
                    required
                  />
                  <input
                    placeholder={t.labels.lastName}
                    value={customer.last_name}
                    onChange={(event) => setCustomer({ ...customer, last_name: event.target.value })}
                    className="rounded-xl border border-ink/20 bg-white/70 p-3"
                    required
                  />
                </div>
                <input
                  placeholder={t.labels.email}
                  value={customer.email}
                  onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                  required
                />
                <input
                  placeholder={t.labels.phone}
                  value={customer.phone}
                  onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                  required
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={customer.age_confirmed}
                    onChange={(event) => setCustomer({ ...customer, age_confirmed: event.target.checked })}
                  />
                  {t.labels.ageConfirm}
                </label>
              </div>
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-semibold">{t.booking.company}</h3>
              <div className="mt-3 grid gap-3">
                <input
                  placeholder={t.labels.orgNumber}
                  value={customer.org_number}
                  onChange={(event) => setCustomer({ ...customer, org_number: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                />
                <input
                  placeholder={t.labels.invoiceMethod}
                  value={customer.invoice_method}
                  onChange={(event) => setCustomer({ ...customer, invoice_method: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                />
                <input
                  placeholder={t.labels.invoiceEmail}
                  value={customer.invoice_email}
                  onChange={(event) => setCustomer({ ...customer, invoice_email: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                />
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              {t.booking.terms}
            </label>
            {pricePreview && (
              <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm">
                <p>{pricePreview.days} {t.labels.daysLabel}</p>
                <p>{t.labels.deliveryFee}: {pricePreview.deliveryFee} kr</p>
                <p>{t.labels.pickupFee}: {pricePreview.pickupFee} kr</p>
                <p className="mt-2 text-lg font-semibold">{t.labels.priceTotal}: {pricePreview.total} kr</p>
              </div>
            )}
            {message && <p className="mt-3 text-sm text-coral">{message}</p>}
            <button
              onClick={submitBooking}
              disabled={loading}
              className="mt-5 w-full rounded-full bg-ink px-4 py-3 text-sm uppercase tracking-wide text-white"
            >
              {loading ? "Sender..." : t.booking.submit}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
