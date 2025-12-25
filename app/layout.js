import "./globals.css";
import { Playfair_Display, Space_Grotesk } from "next/font/google";

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

export const metadata = {
  title: "Astafjord Bilutleie",
  description: "Moderne bilutleie i Astafjord"
};

export default function RootLayout({ children }) {
  return (
    <html lang="no" className={`${playfair.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-sand text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
