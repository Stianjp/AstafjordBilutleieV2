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
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("no");
  const [unavailableCars, setUnavailableCars] = useState([]);
  const [step, setStep] = useState(1);

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

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!startDate || !endDate) {
        setUnavailableCars([]);
        return;
      }
      const response = await fetch(`/api/availability?start_date=${startDate}&end_date=${endDate}`);
      const data = await response.json();
      setUnavailableCars(data.unavailable || []);
    };
    fetchAvailability();
  }, [startDate, endDate]);

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

  const availableCars = useMemo(() => {
    if (!startDate || !endDate) return cars.filter((car) => car.active);
    return cars.filter((car) => car.active && !unavailableCars.includes(car.id));
  }, [cars, startDate, endDate, unavailableCars]);

  const minStartDate = useMemo(() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return next.toISOString().slice(0, 10);
  }, []);

  const nextStep = () => {
    setMessage("");
    if (step === 1 && !customer.age_confirmed) {
      setMessage("Du maa bekrefte at du er over 23 ar.");
      return;
    }
    if (step === 2 && (!startDate || !endDate || !pickupLocation || !deliveryLocation)) {
      setMessage("Velg datoer og lokasjon.");
      return;
    }
    if (step === 3 && (!selectedCar || unavailableCars.includes(selectedCar.id))) {
      setMessage("Velg en tilgjengelig bil.");
      return;
    }
    if (step === 4 && (!customer.first_name || !customer.last_name || !customer.email || !customer.phone)) {
      setMessage("Fyll inn personlig informasjon.");
      return;
    }
    if (step === 4 && customer.type === "company") {
      if (!customer.invoice_method) {
        setMessage("Velg fakturametode.");
        return;
      }
      if (customer.invoice_method === "E-post" && !customer.invoice_email) {
        setMessage("Skriv inn faktura e-post.");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const submitBooking = async () => {
    setMessage("");
    if (!termsAccepted) {
      setMessage("Du maa godkjenne leiebetingelsene.");
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
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
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
      setStep(1);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-4 lg:grid lg:grid-cols-[1.2fr_0.8fr]">
        <aside className="relative order-1 lg:order-2" id="booking">
          <div className="blur-orb absolute right-0 top-0 h-40 w-40" />
          <div className="gradient-card relative rounded-3xl p-6 shadow-card">
            <h2 className="font-display text-2xl">Bestilling</h2>
            <p className="mt-2 text-sm text-ink/70">Steg {step} av 5</p>
            {message && <p className="mt-3 text-sm text-coral">{message}</p>}

            {step === 1 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm">Sjekk alder</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={customer.age_confirmed}
                    onChange={(event) => setCustomer({ ...customer, age_confirmed: event.target.checked })}
                  />
                  Jeg er minst 23 ar gammel
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">{t.labels.pickup}</label>
                <select
                  value={pickupLocation}
                  onChange={(event) => setPickupLocation(event.target.value)}
                  className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
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
                  min={minStartDate}
                />
                <label className="block text-sm">Starttid</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                />
                <label className="block text-sm">{t.labels.endDate}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                  min={startDate || minStartDate}
                />
                <label className="block text-sm">Slutttid</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                />
              </div>
            )}

            {step === 3 && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">{t.labels.car}</label>
                <select
                  value={selectedCar?.id || ""}
                  onChange={(event) => {
                    const car = cars.find((item) => item.id === event.target.value);
                    setSelectedCar(car || null);
                  }}
                  className="w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                >
                  <option value="">{t.labels.selectCar}</option>
                  {availableCars.map((car) => (
                    <option key={car.id} value={car.id}>{car.model}</option>
                  ))}
                </select>
                {availableCars.length === 0 && (
                  <p className="text-sm text-coral">Ingen biler tilgjengelig i valgt periode.</p>
                )}
                {selectedCar && pricePreview && (
                  <div className="rounded-2xl bg-white/70 p-4 text-sm">
                    <p className="font-medium">{selectedCar.model}</p>
                    <p>{pricePreview.days} {t.labels.daysLabel}</p>
                    <p>{t.labels.deliveryFee}: {pricePreview.deliveryFee} kr</p>
                    <p>{t.labels.pickupFee}: {pricePreview.pickupFee} kr</p>
                    <p>Inkludert km: {pricePreview.days * 200} km</p>
                    <p className="mt-2 text-lg font-semibold">{t.labels.priceTotal}: {pricePreview.total} kr</p>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">Kundeinfo</label>
                <select
                  value={customer.type}
                  onChange={(event) => setCustomer({ ...customer, type: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                >
                  <option value="private">Privat</option>
                  <option value="company">Bedrift</option>
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    placeholder={t.labels.firstName}
                    value={customer.first_name}
                    onChange={(event) => setCustomer({ ...customer, first_name: event.target.value })}
                    className="rounded-xl border border-ink/20 bg-white/70 p-3"
                  />
                  <input
                    placeholder={t.labels.lastName}
                    value={customer.last_name}
                    onChange={(event) => setCustomer({ ...customer, last_name: event.target.value })}
                    className="rounded-xl border border-ink/20 bg-white/70 p-3"
                  />
                </div>
                <input
                  placeholder={t.labels.email}
                  value={customer.email}
                  onChange={(event) => setCustomer({ ...customer, email: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                />
                <input
                  placeholder={t.labels.phone}
                  value={customer.phone}
                  onChange={(event) => setCustomer({ ...customer, phone: event.target.value })}
                  className="rounded-xl border border-ink/20 bg-white/70 p-3"
                />
                {customer.type === "company" && (
                  <div className="grid gap-3">
                    <input
                      placeholder={t.labels.orgNumber}
                      value={customer.org_number}
                      onChange={(event) => setCustomer({ ...customer, org_number: event.target.value })}
                      className="rounded-xl border border-ink/20 bg-white/70 p-3"
                    />
                    <div>
                      <p className="text-sm">Fakturametode</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="invoice_method"
                            value="EHF"
                            checked={customer.invoice_method === "EHF"}
                            onChange={(event) =>
                              setCustomer({ ...customer, invoice_method: event.target.value })
                            }
                          />
                          EHF
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="invoice_method"
                            value="E-post"
                            checked={customer.invoice_method === "E-post"}
                            onChange={(event) =>
                              setCustomer({ ...customer, invoice_method: event.target.value })
                            }
                          />
                          E-post
                        </label>
                      </div>
                    </div>
                    {customer.invoice_method === "E-post" && (
                      <input
                        placeholder={t.labels.invoiceEmail}
                        value={customer.invoice_email}
                        onChange={(event) =>
                          setCustomer({ ...customer, invoice_email: event.target.value })
                        }
                        className="rounded-xl border border-ink/20 bg-white/70 p-3"
                        required
                      />
                    )}
                  </div>
                )}
                {selectedCar && pricePreview && (
                  <div className="rounded-2xl bg-white/70 p-4 text-sm">
                    <p className="font-medium">{selectedCar.model}</p>
                    <p>{pricePreview.days} {t.labels.daysLabel}</p>
                    <p>{t.labels.deliveryFee}: {pricePreview.deliveryFee} kr</p>
                    <p>{t.labels.pickupFee}: {pricePreview.pickupFee} kr</p>
                    <p>Inkludert km: {pricePreview.days * 200} km</p>
                    <p className="mt-2 text-lg font-semibold">{t.labels.priceTotal}: {pricePreview.total} kr</p>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="mt-4 space-y-4 text-sm">
                <p className="font-semibold">Leiekontrakt</p>
                <div className="rounded-2xl bg-white/70 p-6 text-sm">
                  <p>Kontrakten er inngatt mellom Astafjord bilutleie (tlf +47 45658315) og:</p>
                  <p>Navn: {customer.first_name} {customer.last_name}</p>
                  <p>E-post: {customer.email}</p>
                  <p>Telefon: {customer.phone}</p>
                  <p>Hentested: {selectedPickup?.name || "-"}</p>
                  <p>Leveringssted: {selectedDelivery?.name || "-"}</p>
                  <p>Startdato og tid: {startDate || "-"} kl. {startTime}</p>
                  <p>Sluttdato og tid: {endDate || "-"} kl. {endTime}</p>
                  <p>Leieperiode: {pricePreview?.days || "-"} dager</p>
                  <p className="mt-2 text-lg font-semibold">Totalpris: {pricePreview?.total || "-"} NOK</p>
                  <p>Gratis km per dag: 200 km</p>
                  <p>Etter dette koster det: NOK 2,50/km</p>
                  <p>I leieperioden og til bilen er returnert, har leietaker fullt ansvar for bilen og bruken av den.</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4 text-xs">
                  <p>Leietaker plikter a betale folgende:</p>
                  <p>Leiens pris som avtalt. Det vil komme tillegg pa kr 2,50/km nar kjorlengden overstiger avtalt fri kjorelende (200 km/dogn).</p>
                  <p>Leien faktureres forskuddsvis og skal vaere betalt for henting. Dersom kontrakt skrives samme dag, ma betaling skje med kort for henting.</p>
                  <p>Drivstoff ma etterfylles (tanken skal vaere full ved henting og levering). Mangelfull drivstoff etterfaktureres med 27kr/liter. Drivstofftype: {selectedCar?.fuel || "-"}.</p>
                  <p>Alle kostnader for bompenger, parkeringsgebyr og fartsboter (etterfaktureres).</p>
                  <p>Enhver skade pa kjoretoyet i leieperioden, inkludert haerverk og tyveri, opptil en egenandel (dekkes ofte av reiseforsikring) pa: 12 000 NOK.</p>
                  <p>Leietaker ma inspisere bilen ved henting og notere eventuelle skader. Bor ta bilder av bilen ved mottak.</p>
                  <p>Leietaker er ansvarlig for vedlikehold (olje, kjolevaeske, dekktrykk). Kontakt utleier ved tvil.</p>
                  <p className="mt-2">Bruksvilkar</p>
                  <p>Leietaker ma ikke:</p>
                  <p>Kjore uten nodvendige tillatelser.</p>
                  <p>Ta bilen ut av landet uten skriftlig tillatelse.</p>
                  <p>Transportere passasjerer mot betaling.</p>
                  <p>Fylle feil drivstoff. Drivstofftype: {selectedCar?.fuel || "-"}.</p>
                  <p>Kjore utenfor offentlig vei.</p>
                  <p className="mt-2">Ved a trykke godkjenn, godkjenner du leiekontrakten.</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                  Jeg godkjenner leiekontrakten
                </label>
                <button
                  onClick={submitBooking}
                  disabled={loading || (selectedCar && unavailableCars.includes(selectedCar.id))}
                  className="mt-2 w-full rounded-full bg-ink px-4 py-3 text-sm uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:bg-ink/40"
                >
                  {loading ? "Sender..." : "Send bestilling"}
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-wide">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className="rounded-full border border-ink/20 px-4 py-2 disabled:opacity-40"
              >
                Tilbake
              </button>
              {step < 5 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-full bg-ink px-4 py-2 text-white"
                >
                  Videre
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="order-2 lg:order-1">
          <div className="mb-6">
            <h1 className="font-display text-4xl sm:text-5xl">{t.hero.title}</h1>
            {t.hero.subtitle && <p className="mt-3 text-ink/70">{t.hero.subtitle}</p>}
          </div>
          {step < 5 && (
            <div className="grid gap-6 md:grid-cols-2">
              {cars.map((car) => {
                const isUnavailable = startDate && endDate && unavailableCars.includes(car.id);
                return (
                  <CarCard
                    key={car.id}
                    car={{ ...car, isUnavailable }}
                    showReserve
                    onReserve={setSelectedCar}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
      <footer className="border-t border-ink/10 bg-white/60 px-6 py-10 text-sm">
        <div className="mx-auto w-full max-w-6xl text-ink/70">
          <p>Telefon: +47 45658315</p>
          <p>Har du sporsmal er det bare a ta kontakt med oss e-post: astafjord.bilutleie@gmail.com</p>
          <p className="mt-4 text-xs uppercase tracking-wide text-ink/50">© 2025 Astafjord Bilutleie</p>
        </div>
      </footer>
    </main>
  );
}
