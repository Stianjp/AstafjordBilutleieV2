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
  const [discountCode, setDiscountCode] = useState("");
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountMessage, setDiscountMessage] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [customerComment, setCustomerComment] = useState("");
  const [childSeatFee, setChildSeatFee] = useState(300);
  const [deductibleReductionDailyFee, setDeductibleReductionDailyFee] = useState(200);
  const [deductibleReductionSelected, setDeductibleReductionSelected] = useState(false);

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
      fetch("/api/cars", { cache: "no-store" }),
      fetch("/api/locations", { cache: "no-store" })
    ]);
    const carsData = await carsResponse.json();
    const locationsData = await locationsResponse.json();
    setCars(carsData.cars || []);
    setLocations(locationsData.locations || []);
  };

  const loadAddOns = async () => {
    try {
      const response = await fetch("/api/add-ons", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) {
        const childSeat = (data.add_ons || []).find((item) => item.key === "child_seat");
        const deductibleReduction = (data.add_ons || []).find((item) => item.key === "deductible_reduction");
        if (childSeat?.fee != null) {
          setChildSeatFee(Number(childSeat.fee));
        }
        if (deductibleReduction?.fee != null) {
          setDeductibleReductionDailyFee(Number(deductibleReduction.fee));
        }
      }
    } catch {
      // fallback to default
    }
  };

  useEffect(() => {
    loadData();
    loadAddOns();
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
    const totalBeforeDiscount = basePrice + deliveryZero + pickupFee;
    let discountAmount = 0;
    if (discountInfo?.valid) {
      if (discountInfo.type === "percent") {
        discountAmount = (totalBeforeDiscount * Number(discountInfo.value)) / 100;
      } else {
        discountAmount = Number(discountInfo.value);
      }
      discountAmount = Math.max(0, Math.min(totalBeforeDiscount, discountAmount));
    }
    const addOnFee = requestType === "child_seat" ? childSeatFee : 0;
    const deductibleReductionFee = deductibleReductionSelected
      ? deductibleReductionDailyFee * days
      : 0;

    return {
      days,
      totalBeforeDiscount,
      discountAmount,
      childSeatFee: addOnFee,
      deductibleReductionFee,
      total: totalBeforeDiscount - discountAmount + addOnFee + deductibleReductionFee,
      deliveryFee: deliveryZero,
      pickupFee
    };
  }, [
    selectedCar,
    startDate,
    endDate,
    selectedPickup,
    selectedDelivery,
    discountInfo,
    requestType,
    childSeatFee,
    deductibleReductionSelected,
    deductibleReductionDailyFee
  ]);

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
      setMessage(t.bookingFlow.ageRequired);
      return;
    }
    if (step === 2 && (!startDate || !endDate || !pickupLocation || !deliveryLocation)) {
      setMessage(t.bookingFlow.pickRequired);
      return;
    }
    if (step === 3 && (!selectedCar || unavailableCars.includes(selectedCar.id))) {
      setMessage(t.bookingFlow.carRequired);
      return;
    }
    if (step === 4 && (!customer.first_name || !customer.last_name || !customer.email || !customer.phone)) {
      setMessage(t.bookingFlow.customerRequired);
      return;
    }
    if (step === 4 && customer.type === "company") {
      if (!customer.invoice_method) {
        setMessage(t.bookingFlow.invoiceRequired);
        return;
      }
      if (customer.invoice_method === "E-post" && !customer.invoice_email) {
        setMessage(t.bookingFlow.invoiceEmailRequired);
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const submitBooking = async () => {
    setMessage("");
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
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
        terms_accepted: termsAccepted,
        discount_code: discountInfo?.valid ? discountInfo.code : null,
        child_seat_required: requestType === "child_seat",
        child_seat_fee: requestType === "child_seat" ? childSeatFee : 0,
        deductible_reduction_selected: deductibleReductionSelected,
        deductible_reduction_fee: deductibleReductionSelected && pricePreview
          ? pricePreview.deductibleReductionFee
          : 0,
        customer_comment: customerComment || null,
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
      setCustomerComment("");
      setDiscountCode("");
      setDiscountInfo(null);
      setDiscountMessage("");
      setShowDiscount(false);
      setShowRequest(false);
      setRequestType("");
      setChildSeatFee(300);
      setDeductibleReductionDailyFee(200);
      setDeductibleReductionSelected(false);
      setStep(1);
    }
    setLoading(false);
  };

  const applyDiscountCode = async () => {
    const code = discountCode.trim();
    if (!code) {
      setDiscountInfo(null);
      setDiscountMessage(t.labels.discountInvalid);
      return;
    }
    setDiscountLoading(true);
    setDiscountMessage("");
    try {
      const response = await fetch(`/api/discount-codes?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.valid) {
        setDiscountInfo(null);
        setDiscountMessage(data.message || t.labels.discountInvalid);
      } else {
        setDiscountInfo(data);
        setDiscountMessage(t.labels.discountApplied);
      }
    } catch {
      setDiscountInfo(null);
      setDiscountMessage(t.labels.discountInvalid);
    }
    setDiscountLoading(false);
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-4 lg:grid lg:grid-cols-[1.2fr_0.8fr]">
        <aside className="relative order-1 lg:order-2" id="booking">
          <div className="blur-orb absolute right-0 top-0 h-40 w-40" />
          <div className="gradient-card relative rounded-3xl p-6 shadow-card">
            <h2 className="font-display text-2xl">{t.bookingFlow.title}</h2>
            <p className="mt-2 text-sm text-ink/70">
              {t.bookingFlow.stepLabel.replace("{step}", String(step))}
            </p>
            {message && <p className="mt-3 text-sm text-coral">{message}</p>}

            {step === 1 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm">{t.bookingFlow.step1Title}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={customer.age_confirmed}
                    onChange={(event) => setCustomer({ ...customer, age_confirmed: event.target.checked })}
                  />
                  {t.labels.ageConfirm}
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm">{t.bookingFlow.step2Title}</p>
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
                <label className="block text-sm">{t.bookingFlow.startTime}</label>
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
                <label className="block text-sm">{t.bookingFlow.endTime}</label>
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
                <p className="text-sm">{t.bookingFlow.step3Title}</p>
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
                  <p className="text-sm text-coral">{t.bookingFlow.noCars}</p>
                )}
                {selectedCar && pricePreview && (
                  <div className="rounded-2xl bg-white/70 p-4 text-sm">
                    <p className="font-medium">{selectedCar.model}</p>
                    <p>{pricePreview.days} {t.labels.daysLabel}</p>
                    <p>{t.labels.deliveryFee}: {pricePreview.deliveryFee} kr</p>
                    <p>{t.labels.pickupFee}: {pricePreview.pickupFee} kr</p>
                    <p>{t.bookingFlow.includedKm}: {pricePreview.days * 200} km</p>
                    {pricePreview.childSeatFee > 0 && (
                      <p>{t.labels.childSeatFeeLabel}: {pricePreview.childSeatFee} kr</p>
                    )}
                    {pricePreview.deductibleReductionFee > 0 && (
                      <p>{t.labels.deductibleReductionFeeLabel}: {pricePreview.deductibleReductionFee} kr</p>
                    )}
                    {pricePreview.discountAmount > 0 && (
                      <p>{t.labels.discountLabel}: -{Math.round(pricePreview.discountAmount)} kr</p>
                    )}
                    <p className="mt-2 text-lg font-semibold">{t.labels.priceTotal}: {pricePreview.total} kr</p>
                  </div>
                )}
                <div className="rounded-2xl bg-white/70 p-4 text-sm">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showRequest}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setShowRequest(next);
                        if (!next) {
                          setRequestType("");
                          setCustomerComment("");
                          setDeductibleReductionSelected(false);
                        }
                      }}
                    />
                    {t.labels.requestToggle}
                  </label>
                  {showRequest && (
                    <div className="mt-3 space-y-3">
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="radio"
                          name="request_type"
                          value="child_seat"
                          checked={requestType === "child_seat"}
                          onChange={(event) => {
                            setRequestType(event.target.value);
                            setCustomerComment("");
                          }}
                        />
                        <span>
                          {t.labels.requestChildSeat}
                          <span className="block text-xs text-ink/60">
                            {t.labels.childSeatFeeLabel}: {childSeatFee} kr
                          </span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="radio"
                          name="request_type"
                          value="other"
                          checked={requestType === "other"}
                          onChange={(event) => setRequestType(event.target.value)}
                        />
                        <span>{t.labels.requestOther}</span>
                      </label>
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={deductibleReductionSelected}
                          onChange={(event) => setDeductibleReductionSelected(event.target.checked)}
                        />
                        <span>
                          {t.labels.deductibleReductionLabel}
                          <span className="block text-xs text-ink/60">
                            {t.labels.deductibleReductionFeeHint.replace("{fee}", String(deductibleReductionDailyFee))}
                          </span>
                        </span>
                      </label>
                      {deductibleReductionSelected && (
                        <div className="rounded-xl border border-ink/10 bg-white/70 p-3 text-xs">
                          <p>
                            {t.contract.deductibleReductionInfo.replace(
                              "{fee}",
                              String(deductibleReductionDailyFee)
                            )}
                          </p>
                          <p className="mt-2">{t.contract.deductibleReductionExceptionsIntro}</p>
                          {t.contract.deductibleReductionExceptions.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      )}
                      {requestType === "other" && (
                        <div>
                          <label className="block text-sm">{t.labels.commentLabel}</label>
                          <textarea
                            value={customerComment}
                            onChange={(event) => setCustomerComment(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-ink/20 bg-white/70 p-3"
                            rows={3}
                            placeholder={t.labels.commentHint}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm">{t.bookingFlow.step4Title}</label>
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
                      <p className="text-sm">{t.bookingFlow.invoiceMethod}</p>
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
                          {t.bookingFlow.invoiceEHF}
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
                          {t.bookingFlow.invoiceEmail}
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
                <div className="rounded-2xl bg-white/70 p-4 text-sm">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showDiscount}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setShowDiscount(next);
                        if (!next) {
                          setDiscountCode("");
                          setDiscountInfo(null);
                          setDiscountMessage("");
                        }
                      }}
                    />
                    {t.labels.discountToggle}
                  </label>
                  {showDiscount && (
                    <div className="mt-3">
                      <label className="block text-sm">{t.labels.discountCode}</label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={discountCode}
                          onChange={(event) => {
                            setDiscountCode(event.target.value);
                            setDiscountInfo(null);
                            setDiscountMessage("");
                          }}
                          className="w-full rounded-xl border border-ink/20 bg-white/70 p-3 sm:flex-1"
                        />
                        <button
                          type="button"
                          onClick={applyDiscountCode}
                          className="rounded-full border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide"
                        >
                          {discountLoading ? "..." : t.labels.discountApply}
                        </button>
                      </div>
                      {discountMessage && (
                        <p className={`mt-2 text-xs ${discountInfo?.valid ? "text-tide" : "text-coral"}`}>
                          {discountMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {selectedCar && pricePreview && (
                  <div className="rounded-2xl bg-white/70 p-4 text-sm">
                    <p className="font-medium">{selectedCar.model}</p>
                    <p>{pricePreview.days} {t.labels.daysLabel}</p>
                    <p>{t.labels.deliveryFee}: {pricePreview.deliveryFee} kr</p>
                    <p>{t.labels.pickupFee}: {pricePreview.pickupFee} kr</p>
                    <p>{t.bookingFlow.includedKm}: {pricePreview.days * 200} km</p>
                    {pricePreview.childSeatFee > 0 && (
                      <p>{t.labels.childSeatFeeLabel}: {pricePreview.childSeatFee} kr</p>
                    )}
                    {pricePreview.deductibleReductionFee > 0 && (
                      <p>{t.labels.deductibleReductionFeeLabel}: {pricePreview.deductibleReductionFee} kr</p>
                    )}
                    {pricePreview.discountAmount > 0 && (
                      <p>{t.labels.discountLabel}: -{Math.round(pricePreview.discountAmount)} kr</p>
                    )}
                    <p className="mt-2 text-lg font-semibold">{t.labels.priceTotal}: {pricePreview.total} kr</p>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="mt-4 space-y-4 text-sm">
                <p className="font-semibold">{t.contract.title}</p>
                <div className="rounded-2xl bg-white/70 p-6 text-sm">
                  <p>{t.contract.intro}</p>
                  <p>{t.contract.name}: {customer.first_name} {customer.last_name}</p>
                  <p>{t.contract.email}: {customer.email}</p>
                  <p>{t.contract.phone}: {customer.phone}</p>
                  <p>{t.contract.pickup}: {selectedPickup?.name || "-"}</p>
                  <p>{t.contract.delivery}: {selectedDelivery?.name || "-"}</p>
                  <p>{t.contract.start}: {startDate || "-"} {t.contract.timePrefix} {startTime}</p>
                  <p>{t.contract.end}: {endDate || "-"} {t.contract.timePrefix} {endTime}</p>
                  <p>{t.contract.period}: {pricePreview?.days || "-"} {t.labels.daysLabel}</p>
                  {requestType === "child_seat" && (
                    <p>{t.labels.childSeatLabel}: {t.labels.requestChildSeat} (+{childSeatFee} NOK)</p>
                  )}
                  <p>
                    {t.contract.deductibleReductionChoice}: {deductibleReductionSelected ? t.contract.yes : t.contract.no}
                  </p>
                  {deductibleReductionSelected && pricePreview?.deductibleReductionFee > 0 && (
                    <p>{t.labels.deductibleReductionFeeLabel}: {pricePreview.deductibleReductionFee} NOK</p>
                  )}
                  {requestType === "other" && customerComment && (
                    <p>{t.labels.commentLabel}: {customerComment}</p>
                  )}
                  {pricePreview?.discountAmount > 0 && (
                    <p>{t.labels.discountLabel}: -{Math.round(pricePreview.discountAmount)} NOK</p>
                  )}
                  <p className="mt-2 text-lg font-semibold">{t.contract.total}: {pricePreview?.total || "-"} NOK</p>
                  <p>{t.contract.freeKm}: 200 km</p>
                  <p>{t.contract.extraKm}</p>
                  <p>{t.contract.responsibility}</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4 text-xs">
                  <p>{t.contract.obligationsTitle}</p>
                  {t.contract.obligations.map((line) => (
                    <p key={line}>
                      {line}{line.toLowerCase().includes("drivstoff") || line.toLowerCase().includes("fuel") ? ` ${t.labels.fuelType}: ${selectedCar?.fuel || "-"}.` : ""}
                    </p>
                  ))}
                  <p className="mt-2">{t.contract.deductibleReductionTitle}</p>
                  <p>
                    {t.contract.deductibleReductionInfo.replace(
                      "{fee}",
                      String(deductibleReductionDailyFee)
                    )}
                  </p>
                  {deductibleReductionSelected && (
                    <p>
                      {t.contract.deductibleReductionAccepted.replace(
                        "{fee}",
                        String(deductibleReductionDailyFee)
                      )}
                    </p>
                  )}
                  <p>{t.contract.deductibleReductionExceptionsIntro}</p>
                  {t.contract.deductibleReductionExceptions.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  <p className="mt-2">{t.contract.cancellationPolicyTitle}</p>
                  <p>{t.contract.cancellationPolicyText}</p>
                  <p className="mt-2">{t.contract.termsTitle}</p>
                  {t.contract.terms.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                  {t.contract.approve}
                </label>
                <button
                  onClick={submitBooking}
                  disabled={loading || (selectedCar && unavailableCars.includes(selectedCar.id))}
                  className="mt-2 w-full rounded-full bg-ink px-4 py-3 text-sm uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:bg-ink/40"
                >
                  {loading ? t.bookingFlow.sending : t.bookingFlow.send}
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
                {t.bookingFlow.back}
              </button>
              {step < 5 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-full bg-ink px-4 py-2 text-white"
                >
                  {t.bookingFlow.next}
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="order-2 lg:order-1">
          {t.hero.subtitle && (
            <div className="mb-6">
              <p className="text-lg text-ink/70">{t.hero.subtitle}</p>
            </div>
          )}
          <div className="mb-6 rounded-2xl bg-white/60 p-4 text-sm text-ink/70">
            <p className="font-medium text-ink">{t.locations.title}</p>
            <p className="mt-2">{t.locations.list}</p>
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
          <p>{t.footer.phone}</p>
          <p>{t.footer.contact}</p>
          <p className="mt-4 text-xs uppercase tracking-wide text-ink/50">{t.footer.copyright}</p>
        </div>
      </footer>
    </main>
  );
}
