import { Resend } from "resend";
import { translations } from "./i18n";
import { resolveContractLanguage } from "./contractSettings";
import { getContractContent } from "./contractSettingsServer";

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.BOOKING_FROM_EMAIL || "booking@astafjordbilutleie.no";
const adminEmail = process.env.BOOKING_ADMIN_EMAIL || "booking@astafjordbilutleie.no";

const formatThirdPartyDisplayName = (thirdParty) => {
  if (!thirdParty) return "";
  const name = thirdParty.name || "";
  const company = thirdParty.company_name || "";
  if (name && company) return `${name} (${company})`;
  if (name) return name;
  return company;
};

const contractIntroText = ({ thirdParty, contract, language }) => {
  const lang = resolveContractLanguage(language);
  const t = translations[lang];
  if (!thirdParty) {
    return contract?.intro || t.contract.intro;
  }
  return (contract?.introThirdParty || t.contract.introThirdParty)
    .replace("{thirdParty}", formatThirdPartyDisplayName(thirdParty))
    .replace("{phone}", thirdParty.phone || "-");
};

const calculateDeductibleReductionDailyFee = (booking) => {
  if (!booking?.deductible_reduction_selected) return 0;
  const days = Number(booking.days || 0);
  const totalFee = Number(booking.deductible_reduction_fee || 0);
  if (days > 0 && totalFee > 0) {
    return Math.round((totalFee / days) * 100) / 100;
  }
  return 200;
};

const buildContractHtml = ({ customer, booking, pickup, delivery, car, thirdParty, language, contract }) => {
  const lang = resolveContractLanguage(language || booking?.contract_language);
  const t = translations[lang];
  const contractText = contract || t.contract;
  const discountAmount = Number(booking.discount_amount || 0);
  const dailyDeductibleFee = calculateDeductibleReductionDailyFee(booking);
  const deductibleSelected = booking.deductible_reduction_selected ? contractText.yes : contractText.no;
  const thirdPartyName = formatThirdPartyDisplayName(thirdParty);
  const obligations = (contractText.obligations || []).map((line) => {
    const shouldAddFuel = line.toLowerCase().includes("drivstoff") || line.toLowerCase().includes("fuel");
    return `<p>${line}${shouldAddFuel ? ` ${t.labels.fuelType}: ${car?.fuel || "-"}.` : ""}</p>`;
  }).join("");
  const exceptions = (contractText.deductibleReductionExceptions || []).map((line) => `<p>${line}</p>`).join("");
  const terms = (contractText.terms || []).map((line) => `<p>${line}</p>`).join("");

  return `
    <p>${contractIntroText({ thirdParty, contract: contractText, language: lang })}</p>
    <p>${contractText.name}: ${customer.first_name} ${customer.last_name}</p>
    <p>${contractText.email}: ${customer.email}</p>
    <p>${contractText.phone}: ${customer.phone}</p>
    <p>${contractText.address1}: ${customer.address_line_1 || "-"}</p>
    ${customer.address_line_2 ? `<p>${contractText.address2}: ${customer.address_line_2}</p>` : ""}
    <p>${contractText.postalCode}: ${customer.postal_code || "-"}</p>
    <p>${contractText.region}: ${customer.region || "-"}</p>
    ${thirdParty ? `<p>${contractText.onBehalfOf}: ${thirdPartyName}</p>` : ""}
    <p>${contractText.pickup}: ${pickup?.name || "-"}</p>
    <p>${contractText.delivery}: ${delivery?.name || "-"}</p>
    <p>${contractText.start}: ${booking.start_date || "-"} ${contractText.timePrefix} ${booking.start_time || "-"}</p>
    <p>${contractText.end}: ${booking.end_date || "-"} ${contractText.timePrefix} ${booking.end_time || "-"}</p>
    ${booking.child_seat_required ? `<p>${t.labels.childSeatLabel}: ${t.labels.requestChildSeat} (+${booking.child_seat_fee != null ? booking.child_seat_fee : 300} NOK)</p>` : ""}
    <p>${contractText.deductibleReductionChoice}: ${deductibleSelected}</p>
    ${booking.deductible_reduction_selected ? `<p>${t.labels.deductibleReductionFeeLabel}: ${booking.deductible_reduction_fee != null ? booking.deductible_reduction_fee : 0} NOK</p>` : ""}
    ${booking.customer_comment ? `<p>${t.labels.commentLabel}: ${booking.customer_comment}</p>` : ""}
    <p>${contractText.period}: ${booking.days || "-"} ${t.labels.daysLabel}</p>
    ${discountAmount > 0 ? `<p>${t.labels.discountLabel}: -${Math.round(discountAmount)} NOK</p>` : ""}
    <p><strong>${contractText.total}: ${booking.calculated_price || "-"} NOK</strong></p>
    <p>${contractText.freeKm}: 200 km</p>
    <p>${contractText.extraKm}</p>
    <p>${contractText.responsibility}</p>
    <p>${contractText.obligationsTitle}</p>
    ${obligations}
    <p>${contractText.deductibleReductionTitle}</p>
    <p>${contractText.deductibleReductionInfo.replace("{fee}", String(dailyDeductibleFee))}</p>
    ${booking.deductible_reduction_selected ? `<p>${contractText.deductibleReductionAccepted.replace("{fee}", String(dailyDeductibleFee))}</p>` : ""}
    <p>${contractText.deductibleReductionExceptionsIntro}</p>
    ${exceptions}
    <p>${contractText.cancellationPolicyTitle}</p>
    <p>${contractText.cancellationPolicyText}</p>
    <p>${contractText.termsTitle}</p>
    ${terms}
  `;
};

const EMAIL_RETRY_DELAYS_MS = [0, 700, 1600];
const THIRD_PARTY_INITIAL_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendEmailWithRetry({ resend, payload, context }) {
  for (let attempt = 0; attempt < EMAIL_RETRY_DELAYS_MS.length; attempt += 1) {
    const waitMs = EMAIL_RETRY_DELAYS_MS[attempt];
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    const response = await resend.emails.send(payload);
    const err = response?.error;
    if (!err) {
      return { ok: true, response };
    }

    const retryable = err?.statusCode === 429 || (typeof err?.statusCode === "number" && err.statusCode >= 500);
    const isLastAttempt = attempt === EMAIL_RETRY_DELAYS_MS.length - 1;
    if (!retryable || isLastAttempt) {
      console.error("Email send failed", {
        ...context,
        error: err,
        attempt: attempt + 1
      });
      return { ok: false, response };
    }
  }

  return { ok: false };
}

export async function sendBookingEmails({ customer, booking, car, pickup, delivery, thirdParty, language }) {
  if (!resendKey || !adminEmail) {
    return { skipped: true };
  }

  const resend = new Resend(resendKey);
  const lang = resolveContractLanguage(language || booking?.contract_language);
  const contractContent = await getContractContent(lang);
  const customerSubject = lang === "en"
    ? "Astafjord Bilutleie - Booking received"
    : "Astafjord Bilutleie - Booking mottatt";
  const adminSubject = "Ny bookingforespørsel - Astafjord Bilutleie";
  const thirdPartySubject = "Ny bookingforespørsel på din bil - Astafjord Bilutleie";
  const thirdPartyContact = thirdParty || car?.third_party || null;
  const commonLabels = {
    car: lang === "en" ? "Car" : "Bil",
    date: lang === "en" ? "Date" : "Dato",
    time: lang === "en" ? "Time" : "Tid",
    pickup: lang === "en" ? "Pickup" : "Pickup",
    delivery: lang === "en" ? "Delivery" : "Levering",
    childSeat: lang === "en" ? "Child seat" : "Barnestol",
    childSeatFee: lang === "en" ? "Child seat add-on" : "Barnestol tillegg",
    deductible: lang === "en" ? "Deductible reduction" : "Egenandelsreduksjon",
    comment: lang === "en" ? "Comment" : "Kommentar",
    customer: lang === "en" ? "Customer" : "Kunde",
    price: lang === "en" ? "Price" : "Pris"
  };

  const timeRange = booking.start_time && booking.end_time
    ? `${booking.start_time} - ${booking.end_time}`
    : null;

  const contractHtml = buildContractHtml({
    customer,
    booking,
    pickup,
    delivery,
    car,
    thirdParty: thirdPartyContact,
    language: lang,
    contract: contractContent
  });

  const customerHtml = `
    <p>${lang === "en" ? `Hi ${customer.first_name},` : `Hei ${customer.first_name},`}</p>
    <p>${lang === "en" ? "We have received your booking request." : "Vi har mottatt bookingforespørselen din."}</p>
    <p><strong>${commonLabels.car}:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>${commonLabels.date}:</strong> ${booking.start_date} - ${booking.end_date}</p>
    ${timeRange ? `<p><strong>${commonLabels.time}:</strong> ${timeRange}</p>` : ""}
    ${thirdPartyContact ? `<p><strong>${lang === "en" ? "Rented on behalf of" : "Utleies på vegne av"}:</strong> ${formatThirdPartyDisplayName(thirdPartyContact)}</p>` : ""}
    <p><strong>${commonLabels.pickup}:</strong> ${pickup.name}</p>
    <p><strong>${commonLabels.delivery}:</strong> ${delivery.name}</p>
    ${booking.child_seat_required ? `<p><strong>${commonLabels.childSeat}:</strong> ${lang === "en" ? "Yes" : "Ja"} (3 mnd - 4 år, maks 18 kg)</p>` : ""}
    ${booking.child_seat_required ? `<p><strong>${commonLabels.childSeatFee}:</strong> ${booking.child_seat_fee != null ? booking.child_seat_fee : 300} NOK</p>` : ""}
    ${booking.deductible_reduction_selected ? `<p><strong>${commonLabels.deductible}:</strong> ${lang === "en" ? "Yes" : "Ja"} (${booking.deductible_reduction_fee != null ? booking.deductible_reduction_fee : 0} NOK totalt)</p>` : ""}
    ${booking.customer_comment ? `<p><strong>${commonLabels.comment}:</strong> ${booking.customer_comment}</p>` : ""}
    <p>${lang === "en" ? "We manually confirm shortly." : "Vi bekrefter manuelt innen kort tid."}</p>
    ${contractHtml}
  `;

  const adminHtml = `
    <p>Ny bookingforespørsel mottatt.</p>
    <p><strong>${commonLabels.customer}:</strong> ${customer.first_name} ${customer.last_name} (${customer.email})</p>
    <p><strong>${commonLabels.car}:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>${commonLabels.date}:</strong> ${booking.start_date} - ${booking.end_date}</p>
    ${timeRange ? `<p><strong>${commonLabels.time}:</strong> ${timeRange}</p>` : ""}
    ${thirdPartyContact ? `<p><strong>${lang === "en" ? "Rented on behalf of" : "Utleies på vegne av"}:</strong> ${formatThirdPartyDisplayName(thirdPartyContact)}</p>` : ""}
    <p><strong>${commonLabels.pickup}:</strong> ${pickup.name}</p>
    <p><strong>${commonLabels.delivery}:</strong> ${delivery.name}</p>
    ${booking.child_seat_required ? `<p><strong>${commonLabels.childSeat}:</strong> ${lang === "en" ? "Yes" : "Ja"} (3 mnd - 4 år, maks 18 kg)</p>` : ""}
    ${booking.child_seat_required ? `<p><strong>${commonLabels.childSeatFee}:</strong> ${booking.child_seat_fee != null ? booking.child_seat_fee : 300} NOK</p>` : ""}
    ${booking.deductible_reduction_selected ? `<p><strong>${commonLabels.deductible}:</strong> ${lang === "en" ? "Yes" : "Ja"} (${booking.deductible_reduction_fee != null ? booking.deductible_reduction_fee : 0} NOK totalt)</p>` : ""}
    ${booking.customer_comment ? `<p><strong>${commonLabels.comment}:</strong> ${booking.customer_comment}</p>` : ""}
    <p><strong>${commonLabels.price}:</strong> ${booking.calculated_price} NOK</p>
    ${contractHtml}
  `;

  await sendEmailWithRetry({
    resend,
    payload: {
      from: fromEmail,
      to: customer.email,
      subject: customerSubject,
      html: customerHtml
    },
    context: {
      kind: "booking_customer",
      customerEmail: customer.email,
      bookingId: booking?.id
    }
  });

  await sendEmailWithRetry({
    resend,
    payload: {
      from: fromEmail,
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml
    },
    context: {
      kind: "booking_admin",
      adminEmail,
      bookingId: booking?.id
    }
  });

  if (thirdPartyContact?.email) {
    await sleep(THIRD_PARTY_INITIAL_DELAY_MS);
    const thirdPartyHtml = `
      <p>Ny bookingforespørsel på bil registrert på deg er mottatt.</p>
      <p><strong>Tredjepart:</strong> ${formatThirdPartyDisplayName(thirdPartyContact)}</p>
      <p><strong>Kunde:</strong> ${customer.first_name} ${customer.last_name} (${customer.email})</p>
      <p><strong>Bil:</strong> ${car.model} (${car.reg_number})</p>
      <p><strong>Dato:</strong> ${booking.start_date} - ${booking.end_date}</p>
      ${timeRange ? `<p><strong>Tid:</strong> ${timeRange}</p>` : ""}
      <p><strong>Pickup:</strong> ${pickup.name}</p>
      <p><strong>Levering:</strong> ${delivery.name}</p>
      <p><strong>Pris:</strong> ${booking.calculated_price} NOK</p>
      ${contractHtml}
    `;

    await sendEmailWithRetry({
      resend,
      payload: {
        from: fromEmail,
        to: thirdPartyContact.email,
        subject: thirdPartySubject,
        html: thirdPartyHtml
      },
      context: {
        kind: "booking_third_party",
        thirdPartyId: thirdPartyContact.id,
        email: thirdPartyContact.email,
        carId: car?.id,
        bookingId: booking?.id
      }
    });
  }

  return { sent: true };
}

export async function sendBookingDecisionEmail({ customer, booking, status }) {
  if (!resendKey) {
    return { skipped: true };
  }

  const resend = new Resend(resendKey);
  const lang = resolveContractLanguage(booking?.contract_language);
  const contractContent = await getContractContent(lang);
  const subjectMap = lang === "en" ? {
    approved: "Astafjord Bilutleie - Booking approved",
    rejected: "Astafjord Bilutleie - Booking rejected",
    cancelled: "Astafjord Bilutleie - Booking cancelled"
  } : {
    approved: "Astafjord Bilutleie - Booking godkjent",
    rejected: "Astafjord Bilutleie - Booking avvist",
    cancelled: "Astafjord Bilutleie - Booking kansellert"
  };
  const adminSubjectMap = {
    approved: "Astafjord Bilutleie - Booking godkjent (kopi)",
    rejected: "Astafjord Bilutleie - Booking avvist (kopi)"
  };
  const thirdPartySubjectMap = {
    approved: "Astafjord Bilutleie - Booking godkjent (tredjepartskopi)",
    rejected: "Astafjord Bilutleie - Booking avvist (tredjepartskopi)"
  };
  const thirdParty = booking?.cars?.third_party || null;

  const contractHtml = buildContractHtml({
    customer,
    booking,
    pickup: booking.pickup,
    delivery: booking.delivery,
    car: booking.cars,
    thirdParty,
    language: lang,
    contract: contractContent
  });

  const bodyMap = lang === "en" ? {
    approved: `<p>Hi ${customer.first_name}, your booking has been approved.</p>${contractHtml}`,
    rejected: `<p>Hi ${customer.first_name}, your booking was rejected. Contact us for alternatives.</p>${contractHtml}`,
    cancelled: `Hi ${customer.first_name}, your booking is cancelled. Contact us if you want to change dates.`
  } : {
    approved: `<p>Hei ${customer.first_name}, din booking er godkjent.</p>${contractHtml}`,
    rejected: `<p>Hei ${customer.first_name}, din booking ble dessverre avvist. Kontakt oss for alternativer.</p>${contractHtml}`,
    cancelled: `Hei ${customer.first_name}, din booking er kansellert. Ta kontakt hvis du vil endre dato.`
  };

  const subject = subjectMap[status] || subjectMap.rejected;
  const body = bodyMap[status] || bodyMap.rejected;

  await sendEmailWithRetry({
    resend,
    payload: {
      from: fromEmail,
      to: customer.email,
      subject,
      html: status === "approved" || status === "rejected" ? body : `<p>${body}</p>`
    },
    context: {
      kind: "decision_customer",
      status,
      customerEmail: customer.email,
      bookingId: booking?.id
    }
  });

  if ((status === "approved" || status === "rejected") && adminEmail) {
    const adminSubject = adminSubjectMap[status] || subject;
    await sendEmailWithRetry({
      resend,
      payload: {
        from: fromEmail,
        to: adminEmail,
        subject: adminSubject,
        html: body
      },
      context: {
        kind: "decision_admin",
        status,
        adminEmail,
        bookingId: booking?.id
      }
    });
  }

  if ((status === "approved" || status === "rejected") && thirdParty?.email) {
    await sleep(THIRD_PARTY_INITIAL_DELAY_MS);
    const thirdPartySubject = thirdPartySubjectMap[status] || subject;
    await sendEmailWithRetry({
      resend,
      payload: {
        from: fromEmail,
        to: thirdParty.email,
        subject: thirdPartySubject,
        html: body
      },
      context: {
        kind: "decision_third_party",
        status,
        thirdPartyId: thirdParty.id,
        email: thirdParty.email,
        bookingId: booking?.id
      }
    });
  }

  return { sent: true };
}

export async function sendInsuranceMileageAlert({ car, remainingKm, annualLimit }) {
  if (!resendKey || !adminEmail) {
    return { skipped: true };
  }

  const model = car?.model || "Ukjent bil";
  const regNumber = car?.reg_number || "-";
  const normalizedRemaining = Math.max(0, Math.round(Number(remainingKm || 0)));
  const normalizedLimit = Math.max(0, Math.round(Number(annualLimit || 0)));
  const currentKm = Math.max(0, Math.round(Number(car?.current_km || 0)));

  const subject = `Astafjord bilutleie: ${model} - ${normalizedRemaining}km igjen av kjørelengde`;
  const html = `
    <p>${model} med kjennemerke: ${regNumber}</p>
    <p>Har ${normalizedRemaining} km igjen av ${normalizedLimit} km totalt i sin årlige kilometer på forsikring.</p>
    <p>Nåværende km-stand: ${currentKm} km.</p>
  `;

  const resend = new Resend(resendKey);
  const result = await sendEmailWithRetry({
    resend,
    payload: {
      from: fromEmail,
      to: adminEmail,
      subject,
      html
    },
    context: {
      kind: "insurance_km_alert",
      carId: car?.id,
      regNumber,
      remainingKm: normalizedRemaining,
      annualLimit: normalizedLimit
    }
  });

  return { sent: !!result?.ok };
}
