import "./globals.css";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import Script from "next/script";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"]
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"]
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astafjordbilutleie.no";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Astafjord Bilutleie",
  description: "Leiebil i Lavangen, Salangen, Gratangen, Dyrøy, Ibestad, Setermoen, Evenes Airport, Narvik, Bjerkvik og Bardufoss Airport.",
  keywords: [
    "bilutleie",
    "leiebil",
    "Astafjord",
    "Lavangen",
    "Salangen",
    "Gratangen",
    "Dyrøy",
    "Ibestad",
    "Setermoen",
    "Evenes Airport",
    "Narvik",
    "Bjerkvik",
    "Bardufoss Airport"
  ],
  openGraph: {
    title: "Astafjord Bilutleie",
    description: "Leiebil i Lavangen, Salangen, Gratangen, Dyrøy, Ibestad, Setermoen, Evenes Airport, Narvik, Bjerkvik og Bardufoss Airport.",
    url: siteUrl,
    siteName: "Astafjord Bilutleie",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Astafjord Bilutleie",
    description: "Leiebil i Lavangen, Salangen, Gratangen, Dyrøy, Ibestad, Setermoen, Evenes Airport, Narvik, Bjerkvik og Bardufoss Airport."
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="no" className={`${playfair.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-sand text-ink font-sans">
        <Script
          id="ld-json"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "Astafjord Bilutleie",
              url: siteUrl,
              telephone: "+47 45658315",
              email: "astafjord.bilutleie@gmail.com",
              areaServed: [
                "Lavangen",
                "Salangen",
                "Gratangen",
                "Dyrøy",
                "Ibestad",
                "Setermoen",
                "Evenes Airport",
                "Narvik",
                "Bjerkvik",
                "Bardufoss Airport"
              ]
            })
          }}
        />
        {children}
      </body>
    </html>
  );
}
