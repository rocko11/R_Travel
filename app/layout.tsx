import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import { config } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";

export const dynamic = "force-dynamic";

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "R Travel";
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "";

export const metadata: Metadata = {
  title: `${brand} — Flights worldwide`,
  applicationName: brand,
  description: "R Travel: search and book flights from 300+ airlines and private jets worldwide.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {/* Google Analytics (GA4) */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-QFJ5D8J4BS" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-QFJ5D8J4BS');${googleAdsId ? `\ngtag('config', '${googleAdsId}');` : ""}`}
        </Script>
        {/* Meta Pixel — inert until NEXT_PUBLIC_META_PIXEL_ID is set (base code only; Purchase
            events fire from ConversionPixel on the booking confirmation pages). */}
        {metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
          </Script>
        )}
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
                <span className="brand-name">
                  {brand.split(" ")[0]}{" "}
                  <span className="brand-formal">{brand.split(" ").slice(1).join(" ")}</span>
                </span>
                <span className="brand-slogan">R you Traveling with us</span>
              </span>
            </Link>
            <nav className="nav">
              <Link href="/">Flights</Link>
              <Link href="/jets">Private jets</Link>
              <Link href="/cruises">Luxury cruises</Link>
              <Link href="/destinations">Destinations</Link>
              <Link href="/hotels">Hotels</Link>
              <Link href="/cars">Car rentals</Link>
              <Link href="/tours">Tours</Link>
              <Link href="/planner">Trip planner</Link>
              <Link href="/concierge">Concierge</Link>
              {user ? (
                <>
                  {isAdmin(user.email) && <Link href="/admin">Admin</Link>}
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
            <Link href="/hotels">R Travel hotels</Link>
            <Link href="/cars">R Travel car rentals</Link>
            <Link href="/tours">R Travel local tours</Link>
            <Link href="/jets">R Travel private jets</Link>
            <Link href="/cruises">R Travel luxury cruises</Link>
            <Link href="/concierge">R Travel concierge</Link>
          </nav>
          © {new Date().getFullYear()} R Travel. Prices include all taxes and our service fee. Fares are set by the airline and may change until ticketed.
        </footer>
      </body>
    </html>
  );
}
