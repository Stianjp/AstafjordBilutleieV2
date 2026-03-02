import { sendInsuranceMileageAlert } from "./email";

const KM_ALERT_THRESHOLD = 5000;
const OSLO_TIMEZONE = "Europe/Oslo";

const toFiniteNumber = (value) => {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toFiniteInteger = (value) => {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
};

const sameKm = (left, right) => {
  const a = toFiniteNumber(left);
  const b = toFiniteNumber(right);
  if (a == null && b == null) return true;
  return a === b;
};

const normalizeReason = (value) => String(value || "").trim();

export const getCurrentYearInOslo = (date = new Date()) => {
  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone: OSLO_TIMEZONE,
    year: "numeric"
  }).format(date);
  return Number(year);
};

export const resolveKmPayload = ({
  authoritativeKm,
  requestedStartKm,
  requestedEndKm,
  previousStartKm = null,
  previousEndKm = null,
  overrideReason = "",
  requireEndKm = false
}) => {
  const baselineKm = toFiniteNumber(authoritativeKm);
  if (baselineKm == null) {
    throw new Error("Fant ikke bilens kilometerstand");
  }

  let startKm = toFiniteNumber(requestedStartKm);
  const endKm = toFiniteNumber(requestedEndKm);
  const prevStartKm = toFiniteNumber(previousStartKm);
  const prevEndKm = toFiniteNumber(previousEndKm);
  const reason = normalizeReason(overrideReason);

  if (requireEndKm && endKm == null) {
    throw new Error("Manglende kilometerdata");
  }

  if (endKm != null && startKm == null) {
    startKm = baselineKm;
  }

  const startChanged = !sameKm(startKm, prevStartKm);
  const endChanged = !sameKm(endKm, prevEndKm);

  if (startKm != null && endKm != null && endKm < startKm) {
    throw new Error("Ugyldig kilometerstand");
  }

  if (startChanged && startKm != null && !sameKm(startKm, baselineKm) && !reason) {
    throw new Error("Endring av start km krever begrunnelse");
  }

  if (endChanged && endKm != null && endKm < baselineKm) {
    throw new Error("Slutt km kan ikke vaere lavere enn siste registrerte km");
  }

  return {
    startKm,
    endKm,
    startChanged,
    endChanged,
    overrideReason: reason || null,
    authoritativeKm: baselineKm
  };
};

export const calculateMileageMetrics = ({ startKm, endKm, includedKm, extraKmRate = 2.5 }) => {
  const start = toFiniteNumber(startKm);
  const end = toFiniteNumber(endKm);
  if (start == null || end == null) {
    return {
      drivenKm: null,
      extraKm: null,
      extraCost: null
    };
  }

  const drivenKm = end - start;
  const included = toFiniteInteger(includedKm);
  const extraKm = included == null ? null : Math.max(0, drivenKm - included);
  const extraCost = extraKm == null ? null : extraKm * extraKmRate;

  return {
    drivenKm,
    extraKm,
    extraCost
  };
};

export async function getCarByIdForKm({ supabase, carId }) {
  const { data, error } = await supabase
    .from("cars")
    .select(
      "id, model, reg_number, current_km, insurance_annual_km_limit, insurance_tracking_year, insurance_year_start_km, insurance_alert_sent_year"
    )
    .eq("id", carId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Fant ikke bil");
  }

  return data;
}

export const normalizeInsuranceFields = ({ annualLimit, currentKm, trackingYear, yearStartKm, alertSentYear }) => {
  const normalizedLimit = toFiniteInteger(annualLimit);
  if (normalizedLimit == null || normalizedLimit <= 0) {
    return {
      insurance_annual_km_limit: null,
      insurance_tracking_year: null,
      insurance_year_start_km: null,
      insurance_alert_sent_year: null
    };
  }

  const yearNow = getCurrentYearInOslo();
  const baseKm = toFiniteNumber(currentKm) ?? 0;
  const normalizedTrackingYear = toFiniteInteger(trackingYear) || yearNow;
  const normalizedYearStartKm = toFiniteNumber(yearStartKm) ?? baseKm;
  const normalizedAlertSentYear = toFiniteInteger(alertSentYear);

  return {
    insurance_annual_km_limit: normalizedLimit,
    insurance_tracking_year: normalizedTrackingYear,
    insurance_year_start_km: normalizedYearStartKm,
    insurance_alert_sent_year: normalizedAlertSentYear
  };
};

export async function updateCarKmAndInsurance({ supabase, car, nextKm }) {
  const updatedKm = toFiniteNumber(nextKm);
  if (updatedKm == null) {
    throw new Error("Ugyldig kilometerstand");
  }

  const yearNow = getCurrentYearInOslo();
  const annualLimit = toFiniteInteger(car.insurance_annual_km_limit);
  let trackingYear = toFiniteInteger(car.insurance_tracking_year);
  let yearStartKm = toFiniteNumber(car.insurance_year_start_km);
  let alertSentYear = toFiniteInteger(car.insurance_alert_sent_year);

  const updatePayload = {
    current_km: updatedKm
  };

  let remainingKm = null;
  let usedKm = null;

  if (annualLimit != null && annualLimit > 0) {
    if (!trackingYear || trackingYear !== yearNow) {
      trackingYear = yearNow;
      yearStartKm = toFiniteNumber(car.current_km) ?? updatedKm;
      alertSentYear = null;
    }
    if (yearStartKm == null) {
      yearStartKm = toFiniteNumber(car.current_km) ?? updatedKm;
    }

    usedKm = Math.max(0, updatedKm - yearStartKm);
    remainingKm = annualLimit - usedKm;

    updatePayload.insurance_tracking_year = trackingYear;
    updatePayload.insurance_year_start_km = yearStartKm;
    updatePayload.insurance_alert_sent_year = alertSentYear;
  }

  const { data: updatedCar, error } = await supabase
    .from("cars")
    .update(updatePayload)
    .eq("id", car.id)
    .select(
      "id, model, reg_number, current_km, insurance_annual_km_limit, insurance_tracking_year, insurance_year_start_km, insurance_alert_sent_year"
    )
    .single();

  if (error || !updatedCar) {
    throw new Error(error?.message || "Kunne ikke oppdatere bilens kilometerstand");
  }

  let insuranceAlertSent = false;
  if (
    annualLimit != null
    && annualLimit > 0
    && remainingKm != null
    && remainingKm <= KM_ALERT_THRESHOLD
    && alertSentYear !== yearNow
  ) {
    const result = await sendInsuranceMileageAlert({
      car: updatedCar,
      remainingKm,
      annualLimit
    });

    if (result?.sent) {
      const { error: alertUpdateError } = await supabase
        .from("cars")
        .update({ insurance_alert_sent_year: yearNow })
        .eq("id", car.id);
      if (!alertUpdateError) {
        insuranceAlertSent = true;
      }
    }
  }

  return {
    car: {
      ...updatedCar,
      insurance_alert_sent_year: insuranceAlertSent ? yearNow : updatedCar.insurance_alert_sent_year
    },
    remainingKm,
    usedKm,
    insuranceAlertSent
  };
}

export async function upsertBookingMileageLog({
  supabase,
  bookingId,
  carId,
  startKm,
  endKm,
  includedKm,
  reason,
  overrideReason,
  source = "booking",
  extraKmRate = 2.5
}) {
  if (!bookingId) {
    throw new Error("Manglende booking_id");
  }

  const metrics = calculateMileageMetrics({
    startKm,
    endKm,
    includedKm,
    extraKmRate
  });

  if (startKm == null && endKm == null) {
    await supabase.from("mileage_logs").delete().eq("booking_id", bookingId);
    return null;
  }

  const payload = {
    booking_id: bookingId,
    car_id: carId,
    km_start: startKm,
    km_end: endKm,
    driven_km: metrics.drivenKm,
    extra_km: metrics.extraKm,
    extra_cost: metrics.extraCost,
    reason: reason || null,
    override_reason: overrideReason || null,
    source,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("mileage_logs")
    .upsert(payload, { onConflict: "booking_id" })
    .select("*, cars(model, reg_number)")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Kunne ikke synkronisere kjorebok");
  }

  return data;
}

export async function syncBookingKmFromMileage({ supabase, bookingId, startKm, endKm }) {
  if (!bookingId) return null;

  const { data, error } = await supabase
    .from("bookings")
    .update({
      start_km: startKm,
      end_km: endKm
    })
    .eq("id", bookingId)
    .select("id, car_id, start_km, end_km, included_km")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Kunne ikke oppdatere booking med kilometer");
  }

  return data;
}

