import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.BOOKING_FROM_EMAIL || "booking@astafjordbilutleie.no";
const adminEmail = process.env.BOOKING_ADMIN_EMAIL;

export async function sendBookingEmails({ customer, booking, car, pickup, delivery }) {
  if (!resendKey || !adminEmail) {
    return { skipped: true };
  }

  const resend = new Resend(resendKey);

  const customerSubject = "Astafjord Bilutleie - Booking mottatt";
  const adminSubject = "Ny bookingforesporsel - Astafjord Bilutleie";

  const timeRange = booking.start_time && booking.end_time
    ? `${booking.start_time} - ${booking.end_time}`
    : null;

  const customerHtml = `
    <p>Hei ${customer.first_name},</p>
    <p>Vi har mottatt bookingforesporselen din.</p>
    <p><strong>Bil:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>Dato:</strong> ${booking.start_date} - ${booking.end_date}</p>
    ${timeRange ? `<p><strong>Tid:</strong> ${timeRange}</p>` : ""}
    <p><strong>Pickup:</strong> ${pickup.name}</p>
    <p><strong>Levering:</strong> ${delivery.name}</p>
    <p>Vi bekrefter manuelt innen kort tid.</p>
  `;

  const adminHtml = `
    <p>Ny bookingforesporsel mottatt.</p>
    <p><strong>Kunde:</strong> ${customer.first_name} ${customer.last_name} (${customer.email})</p>
    <p><strong>Bil:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>Dato:</strong> ${booking.start_date} - ${booking.end_date}</p>
    ${timeRange ? `<p><strong>Tid:</strong> ${timeRange}</p>` : ""}
    <p><strong>Pickup:</strong> ${pickup.name}</p>
    <p><strong>Levering:</strong> ${delivery.name}</p>
    <p><strong>Pris:</strong> ${booking.calculated_price} NOK</p>
  `;

  await resend.emails.send({
    from: fromEmail,
    to: customer.email,
    subject: customerSubject,
    html: customerHtml
  });

  await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: adminSubject,
    html: adminHtml
  });

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

  const contractHtml = `
    <p>Kontrakten er inngatt mellom Astafjord bilutleie (tlf +47 45658315) og:</p>
    <p>Navn: ${customer.first_name} ${customer.last_name}</p>
    <p>E-post: ${customer.email}</p>
    <p>Telefon: ${customer.phone}</p>
    <p>Hentested: ${booking.pickup?.name || "-"}</p>
    <p>Leveringssted: ${booking.delivery?.name || "-"}</p>
    <p>Startdato og tid: ${booking.start_date || "-"} kl. ${booking.start_time || "-"}</p>
    <p>Sluttdato og tid: ${booking.end_date || "-"} kl. ${booking.end_time || "-"}</p>
    <p>Leieperiode: ${booking.days || "-"} dager</p>
    <p><strong>Totalpris: ${booking.calculated_price || "-"} NOK</strong></p>
    <p>Gratis km per dag: 200 km</p>
    <p>Etter dette koster det: NOK 2,50/km</p>
    <p>I leieperioden og til bilen er returnert, har leietaker fullt ansvar for bilen og bruken av den.</p>
    <p>Leietaker plikter a betale folgende:</p>
    <p>Leiens pris som avtalt. Det vil komme tillegg pa kr 2,50/km nar kjorlengden overstiger avtalt fri kjorelende (200 km/dogn).</p>
    <p>Leien faktureres forskuddsvis og skal vaere betalt for henting. Dersom kontrakt skrives samme dag, ma betaling skje med kort for henting.</p>
    <p>Drivstoff ma etterfylles (tanken skal vaere full ved henting og levering). Mangelfull drivstoff etterfaktureres med 27kr/liter. Drivstofftype: ${booking.cars?.fuel || "-"}</p>
    <p>Alle kostnader for bompenger, parkeringsgebyr og fartsboter (etterfaktureres).</p>
    <p>Enhver skade pa kjoretoyet i leieperioden, inkludert haerverk og tyveri, opptil en egenandel pa: 12 000 NOK.</p>
    <p>Leietaker ma inspisere bilen ved henting og notere eventuelle skader. Bor ta bilder av bilen ved mottak.</p>
    <p>Leietaker er ansvarlig for vedlikehold (olje, kjolevaeske, dekktrykk). Kontakt utleier ved tvil.</p>
    <p>Bruksvilkar:</p>
    <p>Leietaker ma ikke: Kjore uten nodvendige tillatelser. Ta bilen ut av landet uten skriftlig tillatelse. Transportere passasjerer mot betaling. Fylle feil drivstoff. Kjore utenfor offentlig vei.</p>
  `;

  const bodyMap = {
    approved: `Hei ${customer.first_name}, din booking er godkjent.</p>${contractHtml}`,
    rejected: `Hei ${customer.first_name}, din booking ble dessverre avvist. Kontakt oss for alternativer.`,
    cancelled: `Hei ${customer.first_name}, din booking er kansellert. Ta kontakt hvis du vil endre dato.`
  };

  const subject = subjectMap[status] || subjectMap.rejected;
  const body = bodyMap[status] || bodyMap.rejected;

  await resend.emails.send({
    from: fromEmail,
    to: customer.email,
    subject,
    html: status === "approved" ? body : `<p>${body}</p>`
  });

  return { sent: true };
}
