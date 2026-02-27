import { Resend } from "resend";

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

const contractIntroText = (thirdParty) => {
  if (!thirdParty) {
    return "Kontrakten er inngått mellom Astafjord bilutleie (tlf +47 45658315) og bestiller:";
  }
  return `Kontrakten er inngått mellom ${formatThirdPartyDisplayName(thirdParty)} Tlf: ${thirdParty.phone || "-"} og bestiller:`;
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

const buildContractHtml = ({ customer, booking, pickup, delivery, car, thirdParty }) => {
  const thirdPartyName = formatThirdPartyDisplayName(thirdParty);
  const discountAmount = Number(booking.discount_amount || 0);
  const dailyDeductibleFee = calculateDeductibleReductionDailyFee(booking);
  const deductibleSelected = booking.deductible_reduction_selected ? "Ja" : "Nei";

  return `
    <p>${contractIntroText(thirdParty)}</p>
    <p>Navn: ${customer.first_name} ${customer.last_name}</p>
    <p>E-post: ${customer.email}</p>
    <p>Telefon: ${customer.phone}</p>
    <p>Adresse: ${customer.address_line_1 || "-"}</p>
    ${customer.address_line_2 ? `<p>Adresse 2: ${customer.address_line_2}</p>` : ""}
    <p>Postkode: ${customer.postal_code || "-"}</p>
    <p>Region: ${customer.region || "-"}</p>
    ${thirdParty ? `<p>På vegne av: ${thirdPartyName}</p>` : ""}
    <p>Hentested: ${pickup?.name || "-"}</p>
    <p>Leveringssted: ${delivery?.name || "-"}</p>
    <p>Startdato og tid: ${booking.start_date || "-"} kl. ${booking.start_time || "-"}</p>
    <p>Sluttdato og tid: ${booking.end_date || "-"} kl. ${booking.end_time || "-"}</p>
    ${booking.child_seat_required ? `<p>Barnestol: Ja (3 mnd - 4 år, maks 18 kg)</p>` : ""}
    ${booking.child_seat_required ? `<p>Barnestol (tillegg): ${booking.child_seat_fee != null ? booking.child_seat_fee : 300} NOK</p>` : ""}
    <p>Egenandelsreduksjon valgt: ${deductibleSelected}</p>
    ${booking.deductible_reduction_selected ? `<p>Egenandelsreduksjon (tillegg): ${booking.deductible_reduction_fee != null ? booking.deductible_reduction_fee : 0} NOK</p>` : ""}
    ${booking.customer_comment ? `<p>Kommentar: ${booking.customer_comment}</p>` : ""}
    <p>Leieperiode: ${booking.days || "-"} dager</p>
    ${discountAmount > 0 ? `<p>Rabatt: -${discountAmount} NOK</p>` : ""}
    <p><strong>Totalpris: ${booking.calculated_price || "-"} NOK</strong></p>
    <p>Gratis km per dag: 200 km</p>
    <p>Etter dette koster det: NOK 2,50/km</p>
    <p>I leieperioden og til bilen er returnert, har leietaker fullt ansvar for bilen og bruken av den.</p>
    <p>Leietaker plikter å betale følgende:</p>
    <p>Leiens pris som avtalt. Det vil komme tillegg på kr 2,50/km når kjørelengden overstiger avtalt fri kjørelengde (200 km/døgn).</p>
    <p>Leien faktureres forskuddsvis og skal være betalt før henting. Dersom kontrakt skrives samme dag, må betaling skje med kort før henting.</p>
    <p>Drivstoff må etterfylles (tanken skal være full ved henting og levering). Mangelfullt drivstoff etterfaktureres med 27 kr/liter. Drivstofftype: ${car?.fuel || "-"}.</p>
    <p>Alle kostnader for bompenger, parkeringsgebyr og fartsbøter (etterfaktureres).</p>
    <p>Enhver skade på kjøretøyet i leieperioden, inkludert hærverk og tyveri, opptil en egenandel på: 12 000 NOK.</p>
    <p>Leietaker må inspisere bilen ved henting og notere eventuelle skader. Bør ta bilder av bilen ved mottak.</p>
    <p>Leietaker er ansvarlig for vedlikehold (olje, kjølevæske, dekktrykk). Kontakt utleier ved tvil.</p>
    <p>Egenandelsreduksjon</p>
    <p>Ved skade er standard egenandel inntil 12 000 kr. Du kan velge egenandelsreduksjon. Da belastes ${dailyDeductibleFee} kr per døgn og maks egenandel ved skade reduseres til 4 000 kr.</p>
    ${booking.deductible_reduction_selected ? `<p>Egenandelsreduksjon er valgt og godkjent. Tillegg: ${dailyDeductibleFee} kr per døgn. Maks egenandel ved skade: 4 000 NOK.</p>` : ""}
    <p>Unntak fra egenandelsreduksjon: Dersom skaden har oppstått som følge av leietakers uaktsomhet eller brudd på leievilkårene, gjelder full egenandel (12 000 kr) eller fullt tap dersom dette overstiger egenandelen.</p>
    <p>Grov uaktsomhet: Kjøring i strid med veitrafikkloven (f.eks. høy fart), eller kjøring i påvirket tilstand (alkohol/rusmidler).</p>
    <p>Feilfylling: Fylling av feil drivstoff på tanken, samt følgeskader av dette.</p>
    <p>Interiør og utstyr: Skader på bilens interiør (f.eks. sigarettglo, flekker, revnet setetrekk) eller tap av utstyr/nøkler.</p>
    <p>Feilbruk: Skader oppstått ved kjøring utenfor offentlig vei (offroad), overlasting av bilen, eller skader på understell som følge av uaktsom kjøring over fortauskanter/fartshumper.</p>
    <p>Manglende skademelding: Dersom leietaker unnlater å fylle ut skademelding eller unnlater å oppgi motpart/vitner ved ulykke.</p>
    <p>Avbestilling</p>
    <p>Vi vet at planer kan endres. Avbestilling er gratis frem til samme dag som booking starter, så lenge avbestilling meldes til astafjord.bilutleie@gmail.com før start av leieforholdet. Dersom avbestilling ikke meldes før start, belastes leieforholdet i sin helhet. Avbestilling etter leiestart faktureres for minimum 1 dag leie + leverings- og hentegebyr, eller minimum 1 000 kr.</p>
    <p>Bruksvilkår</p>
    <p>Leietaker må ikke: Kjøre uten nødvendige tillatelser.</p>
    <p>Ta bilen ut av landet uten skriftlig tillatelse.</p>
    <p>Transportere passasjerer mot betaling.</p>
    <p>Fylle feil drivstoff.</p>
    <p>Kjøre utenfor offentlig vei.</p>
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

export async function sendBookingEmails({ customer, booking, car, pickup, delivery, thirdParty }) {
  if (!resendKey || !adminEmail) {
    return { skipped: true };
  }

  const resend = new Resend(resendKey);

  const customerSubject = "Astafjord Bilutleie - Booking mottatt";
  const adminSubject = "Ny bookingforesporsel - Astafjord Bilutleie";
  const thirdPartySubject = "Ny bookingforesporsel pa din bil - Astafjord Bilutleie";
  const thirdPartyContact = thirdParty || car?.third_party || null;

  const timeRange = booking.start_time && booking.end_time
    ? `${booking.start_time} - ${booking.end_time}`
    : null;

  const contractHtml = buildContractHtml({
    customer,
    booking,
    pickup,
    delivery,
    car,
    thirdParty: thirdPartyContact
  });

  const customerHtml = `
    <p>Hei ${customer.first_name},</p>
    <p>Vi har mottatt bookingforesporselen din.</p>
    <p><strong>Bil:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>Dato:</strong> ${booking.start_date} - ${booking.end_date}</p>
    ${timeRange ? `<p><strong>Tid:</strong> ${timeRange}</p>` : ""}
    ${thirdPartyContact ? `<p><strong>Utleies pa vegne av:</strong> ${formatThirdPartyDisplayName(thirdPartyContact)}</p>` : ""}
    <p><strong>Pickup:</strong> ${pickup.name}</p>
    <p><strong>Levering:</strong> ${delivery.name}</p>
    ${booking.child_seat_required ? `<p><strong>Barnestol:</strong> Ja (3 mnd - 4 år, maks 18 kg)</p>` : ""}
    ${booking.child_seat_required ? `<p><strong>Barnestol tillegg:</strong> ${booking.child_seat_fee != null ? booking.child_seat_fee : 300} NOK</p>` : ""}
    ${booking.deductible_reduction_selected ? `<p><strong>Egenandelsreduksjon:</strong> Ja (${booking.deductible_reduction_fee != null ? booking.deductible_reduction_fee : 0} NOK totalt)</p>` : ""}
    ${booking.customer_comment ? `<p><strong>Kommentar:</strong> ${booking.customer_comment}</p>` : ""}
    <p>Vi bekrefter manuelt innen kort tid.</p>
    ${contractHtml}
  `;

  const adminHtml = `
    <p>Ny bookingforesporsel mottatt.</p>
    <p><strong>Kunde:</strong> ${customer.first_name} ${customer.last_name} (${customer.email})</p>
    <p><strong>Bil:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>Dato:</strong> ${booking.start_date} - ${booking.end_date}</p>
    ${timeRange ? `<p><strong>Tid:</strong> ${timeRange}</p>` : ""}
    ${thirdPartyContact ? `<p><strong>Utleies pa vegne av:</strong> ${formatThirdPartyDisplayName(thirdPartyContact)}</p>` : ""}
    <p><strong>Pickup:</strong> ${pickup.name}</p>
    <p><strong>Levering:</strong> ${delivery.name}</p>
    ${booking.child_seat_required ? `<p><strong>Barnestol:</strong> Ja (3 mnd - 4 år, maks 18 kg)</p>` : ""}
    ${booking.child_seat_required ? `<p><strong>Barnestol tillegg:</strong> ${booking.child_seat_fee != null ? booking.child_seat_fee : 300} NOK</p>` : ""}
    ${booking.deductible_reduction_selected ? `<p><strong>Egenandelsreduksjon:</strong> Ja (${booking.deductible_reduction_fee != null ? booking.deductible_reduction_fee : 0} NOK totalt)</p>` : ""}
    ${booking.customer_comment ? `<p><strong>Kommentar:</strong> ${booking.customer_comment}</p>` : ""}
    <p><strong>Pris:</strong> ${booking.calculated_price} NOK</p>
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
      <p>Ny bookingforesporsel pa bil registrert pa deg er mottatt.</p>
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
  const subjectMap = {
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
    thirdParty
  });

  const bodyMap = {
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
