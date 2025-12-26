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

  const customerHtml = `
    <p>Hei ${customer.first_name},</p>
    <p>Vi har mottatt bookingforesporselen din.</p>
    <p><strong>Bil:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>Dato:</strong> ${booking.start_date} - ${booking.end_date}</p>
    <p><strong>Pickup:</strong> ${pickup.name}</p>
    <p><strong>Levering:</strong> ${delivery.name}</p>
    <p>Vi bekrefter manuelt innen kort tid.</p>
  `;

  const adminHtml = `
    <p>Ny bookingforesporsel mottatt.</p>
    <p><strong>Kunde:</strong> ${customer.first_name} ${customer.last_name} (${customer.email})</p>
    <p><strong>Bil:</strong> ${car.model} (${car.reg_number})</p>
    <p><strong>Dato:</strong> ${booking.start_date} - ${booking.end_date}</p>
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

  const bodyMap = {
    approved: `Hei ${customer.first_name}, din booking er godkjent. Vi kontakter deg videre for levering.`,
    rejected: `Hei ${customer.first_name}, din booking ble dessverre avvist. Kontakt oss for alternativer.`,
    cancelled: `Hei ${customer.first_name}, din booking er kansellert. Ta kontakt hvis du vil endre dato.`
  };

  const subject = subjectMap[status] || subjectMap.rejected;
  const body = bodyMap[status] || bodyMap.rejected;

  await resend.emails.send({
    from: fromEmail,
    to: customer.email,
    subject,
    html: `<p>${body}</p>`
  });

  return { sent: true };
}
