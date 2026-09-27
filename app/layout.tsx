import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Skyline";

export const metadata: Metadata = {
  title: `${brand} — Flights worldwide`,
  description: "Search and book flights from 300+ airlines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {config.mode !== "live" && (
          <div className="banner">
            {config.mode === "demo"
              ? "Demo mode — sample flights, no real bookings or charges."
              : "Test mode — Duffel sandbox. Tickets are not real."}
          </div>
        )}
        <header className="topbar">
          <div className="wrap">
            <Link href="/" className="brand">
              <span className="brand-dot" aria-hidden /> {brand}
            </Link>
            <nav className="nav">
              <Link href="/">Flights</Link>
              <span aria-disabled title="Coming in the next phase">Hotels</span>
            </nav>
          </div>
        </header>
        {children}
        <footer className="wrap footer">
          Prices include all taxes and our service fee. Fares are set by the airline and may change until ticketed.
        </footer>
      </body>
    </html>
  );
}
