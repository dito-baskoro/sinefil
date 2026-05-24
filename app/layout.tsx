import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: {
    default: "Sinefil — catatan film Indonesia",
    template: "%s · Sinefil",
  },
  description:
    "Rating, kesan, dan tag dari sesama penonton. Cek dulu sebelum nonton: aman buat keluarga? Pas buat hujan-hujan? Yang udah nonton bakal kasih tau.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <a
          href="#main"
          className="skip-link z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Loncat ke konten
        </a>
        <SiteHeader />
        <main id="main" className="container flex-1 py-8">
          {children}
        </main>
        <footer className="container mt-16 border-t border-border py-6 text-sm text-muted-foreground">
          <span>© Sinefil 2026</span>
        </footer>
      </body>
    </html>
  );
}
