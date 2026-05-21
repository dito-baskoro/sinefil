import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
    <html lang="id" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <SiteHeader />
        <main className="container flex-1 py-8">{children}</main>
        <footer className="container mt-16 border-t border-border py-6 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>© Sinefil 2026</span>
            <Link href="/" className="hover:text-foreground">Beranda</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
