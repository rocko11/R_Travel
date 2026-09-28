import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { config } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";

export const dynamic = "force-dynamic";

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "R Travel";

export const metadata: Metadata = {
  title: `${brand} — Flights worldwide`,
  applicationName: brand,
  description: "R Travel: search and book flights from 300+ airlines and private jets worldwide.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" width={104} height={104} className="brand-logo" />
              <span className="brand-text">
                <span className="brand-name">{brand}</span>
                <span className="brand-slogan">R you Traveling with us</span>
              </span>
            </Link>
            <nav className="nav">
              <Link href="/">Flights</Link>
              <Link href="/jets">Private jets</Link>
              <Link href="/destinations">Destinations</Link>
              <span aria-disabled title="Coming in the next phase">Hotels</span>
              {user ? (
                <>
                  {isAdmin(user.email) && <Link href="/admin/jets">Jet requests</Link>}
                  <Link href="/account" className="cta">My trips</Link>
                  <form action="/api/auth/logout" method="post">
                    <button className="linkbtn" type="submit">Sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/account/login" className="cta">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        {children}
        <footer className="wrap footer">
          <nav className="footer-links" aria-label="R Travel">
            <Link href="/about">About R Travel</Link>
            <Link href="/how-it-works">How R Travel works</Link>
            <Link href="/faq">R Travel FAQ</Link>
            <Link href="/destinations">R Travel destination guides</Link>
            <Link href="/jets">R Travel private jets</Link>
          </nav>
          © {new Date().getFullYear()} R Travel. Prices include all taxes and our service fee. Fares are set by the airline and may change until ticketed.
        </footer>
      </body>
    </html>
  );
}
