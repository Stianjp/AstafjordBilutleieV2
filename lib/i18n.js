export const translations = {
  no: {
    nav: {
      home: "Biler",
      booking: "Bestill",
      admin: "Admin",
      login: "Logg inn",
      logout: "Logg ut"
    },
    hero: {
      title: "Astafjord Bilutleie",
      subtitle: "",
      cta: "Send bookingforesporsel"
    },
    booking: {
      title: "Bookingforesporsel",
      customer: "Kundeinfo",
      company: "Firma (valgfritt)",
      info: "Fyll inn detaljer. Vi bekrefter manuelt og sender e-post.",
      kmInfo: "Inkludert 200 km per dag. Ekstra km faktureres med 2,50 kr.",
      terms: "Jeg aksepterer leiebetingelsene",
      submit: "Send foresporsel",
      success: "Foresporsel sendt. Du vil fa svar pa e-post.",
      error: "Kunne ikke sende foresporsel.",
      missing: "Fyll ut alle bookingfelter.",
      acceptTerms: "Du maa akseptere betingelsene."
    },
    labels: {
      car: "Valgt bil",
      pickup: "Pickup",
      delivery: "Levering",
      startDate: "Startdato",
      endDate: "Sluttdato",
      firstName: "Fornavn",
      lastName: "Etternavn",
      email: "E-post",
      phone: "Telefon",
      orgNumber: "Org.nr",
      invoiceMethod: "Faktureringsmetode",
      invoiceEmail: "Faktura e-post",
      ageConfirm: "Jeg er minst 23 ar gammel",
      selectCar: "Velg bil",
      selectLocation: "Velg lokasjon",
      priceTotal: "Total",
      deliveryFee: "Leveringsgebyr",
      pickupFee: "Hentegbyr",
      daysLabel: "dager",
      privateType: "Privat",
      companyType: "Firma"
    }
  },
  en: {
    nav: {
      home: "Cars",
      booking: "Booking",
      admin: "Admin",
      login: "Sign in",
      logout: "Sign out"
    },
    hero: {
      title: "Astafjord Bilutleie",
      subtitle: "",
      cta: "Send booking request"
    },
    booking: {
      title: "Booking request",
      customer: "Customer details",
      company: "Company (optional)",
      info: "Fill in the details. We confirm manually and email you.",
      kmInfo: "Includes 200 km per day. Extra km billed at 2.50 NOK.",
      terms: "I accept the rental terms",
      submit: "Submit request",
      success: "Request sent. You will receive an email.",
      error: "Could not submit request.",
      missing: "Please complete all booking fields.",
      acceptTerms: "You must accept the terms."
    },
    labels: {
      car: "Selected car",
      pickup: "Pickup",
      delivery: "Delivery",
      startDate: "Start date",
      endDate: "End date",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      orgNumber: "Org no.",
      invoiceMethod: "Invoice method",
      invoiceEmail: "Invoice email",
      ageConfirm: "I am at least 23 years old",
      selectCar: "Choose car",
      selectLocation: "Choose location",
      priceTotal: "Total",
      deliveryFee: "Delivery fee",
      pickupFee: "Pickup fee",
      daysLabel: "days",
      privateType: "Private",
      companyType: "Company"
    }
  }
};

export function getLanguageValue(value, fallback = "no") {
  return translations[value] ? value : fallback;
}
