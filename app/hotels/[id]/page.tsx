"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import HotelMap from "../../components/HotelMap";
import { money } from "@/lib/format";

interface HotelDetails {
  id: string;
  name: string;
  description?: string;
  images: { url: string; caption?: string }[];
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  starRating?: number;
  rating?: number;
  reviewCount?: number;
  facilities: string[];
  checkin?: string;
  checkout?: string;
  phone?: string;
  poi: { name: string; category?: string; distanceKm?: number }[];
}

export default function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const hotelId = decodeURIComponent(id);
  const sp = useSearchParams();
  const router = useRouter();

  const name = sp.get("name") || "This hotel";
  const area = sp.get("area") || "";
  const dest = sp.get("dest") || "";
  const code = sp.get("code") || "";
  const label = sp.get("label") || "";
  const country = sp.get("country") || "";
  const checkIn = sp.get("in") || "";
  const checkOut = sp.get("out") || "";
  const guests = sp.get("guests") || "2";
  const rooms = Math.max(1, Number(sp.get("rooms") || 1));
  const stars = sp.get("stars") ? Number(sp.get("stars")) : undefined;
  const photo = sp.get("photo") || "";
  const low = sp.get("low") ? Number(sp.get("low")) : undefined;
  const high = sp.get("high") ? Number(sp.get("high")) : undefined;
  const offerId = sp.get("offerId") || "";
  const qLat = sp.get("lat") ? Number(sp.get("lat")) : undefined;
  const qLng = sp.get("lng") ? Number(sp.get("lng")) : undefined;

  const [details, setDetails] = useState<HotelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/hotels/details?hotelId=${encodeURIComponent(hotelId)}`)
      .then((r) => r.json())
      .then((j) => setDetails(j.hotel ?? null))
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [hotelId]);

  const images = details?.images?.length ? details.images : photo ? [{ url: photo, caption: name }] : [];
  const mainImg = images[activeImg] ?? images[0];
  const showPrev = () => setActiveImg((i) => (i - 1 + images.length) % images.length);
  const showNext = () => setActiveImg((i) => (i + 1) % images.length);
  const lat = details?.lat ?? qLat;
  const lng = details?.lng ?? qLng;
  const displayStars = details?.starRating ?? stars;

  const goToBooking = () => {
    if (!offerId) return;
    const q = new URLSearchParams({ hotel: name, dest, in: checkIn, out: checkOut, guests });
    router.push(`/hotels/book/${encodeURIComponent(offerId)}?${q}`);
  };

  // Rebuilds the exact search the guest came from (destination, dates, guests, rooms) so
  // "Back to search" and "Request a quote" don't drop them on an empty form.
  const backToSearch = () => {
    const q = new URLSearchParams();
    if (code) q.set("code", code);
    if (label) q.set("label", label);
    if (country) q.set("country", country);
    if (checkIn) q.set("in", checkIn);
    if (checkOut) q.set("out", checkOut);
    if (guests) q.set("guests", guests);
    if (rooms) q.set("rooms", String(rooms));
    q.set("hotel", name);
    return `/hotels?${q}`;
  };

  return (
    <div className="section">
      <p className="tiny" style={{ marginBottom: 10 }}>
        <Link href={backToSearch()} style={{ color: "var(--brand)" }}>← Back to search</Link>
      </p>

      {images.length > 0 && (
        <div className="hdetail-carousel" style={{ marginBottom: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mainImg.url} alt={mainImg.caption || name} />
          {images.length > 1 && (
            <>
              <button type="button" className="hdetail-carousel-arrow prev" aria-label="Previous photo" onClick={showPrev}>‹</button>
              <button type="button" className="hdetail-carousel-arrow next" aria-label="Next photo" onClick={showNext}>›</button>
              <span className="hdetail-carousel-count">{activeImg + 1} / {images.length}</span>
            </>
          )}
        </div>
      )}

      <div className="hdetail-grid">
        <div>
          <h1 className="hdetail-title">{details?.name || name}</h1>
          <p className="hdetail-meta">
            {displayStars ? "★".repeat(Math.max(1, Math.round(displayStars))) + " · " : ""}
            {details?.address || area}
            {details?.rating ? ` · ${details.rating.toFixed(1)} rating${details.reviewCount ? ` (${details.reviewCount} reviews)` : ""}` : ""}
          </p>

          {loading && <p className="muted">Loading hotel details…</p>}

          {!loading && details?.description && (
            <div className="card section" style={{ marginTop: 14 }}>
              <h2 style={{ marginTop: 0 }}>About this property</h2>
              <p style={{ whiteSpace: "pre-line" }}>{details.description.replace(/<\/?[^>]+(>|$)/g, "")}</p>
            </div>
          )}

          {!loading && !details && (
            <div className="card section" style={{ marginTop: 14 }}>
              <p className="muted">We don&apos;t have extra photos or a full description for this property yet — you can still book the rate shown.</p>
            </div>
          )}

          {!!details?.facilities?.length && (
            <div className="card section" style={{ marginTop: 14 }}>
              <h2 style={{ marginTop: 0 }}>Amenities</h2>
              <ul className="amenities-grid">
                {details.facilities.slice(0, 24).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {(lat != null && lng != null) && (
            <div className="section" style={{ marginTop: 14 }}>
              <h2>Location</h2>
              <HotelMap
                hotels={[{ hotel: { name: details?.name || name, area: area, tier: "Mid-range", lat, lng }, low: low ?? 0, high: high ?? low ?? 0, live: true }]}
                rooms={rooms}
                selected={details?.name || name}
                onSelect={() => {}}
              />
            </div>
          )}

          {!!details?.poi?.length && (
            <div className="card section" style={{ marginTop: 14 }}>
              <h2 style={{ marginTop: 0 }}>Nearby</h2>
              <ul className="poi-list">
                {details.poi.slice(0, 8).map((p, i) => (
                  <li key={i}>
                    <span>{p.name}{p.category ? ` · ${p.category}` : ""}</span>
                    {p.distanceKm != null && <span>{p.distanceKm.toFixed(1)} km</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="card hdetail-book">
          {low != null ? (
            <>
              <div className="hprop-total" style={{ fontSize: 24 }}>
                {low === high ? money(low * rooms, "USD").replace(".00", "") : `${money(low * rooms, "USD").replace(".00", "")}–${money((high ?? low) * rooms, "USD").replace(".00", "")}`}
              </div>
              <p className="tiny" style={{ margin: "2px 0 14px" }}>
                total, {rooms} room{rooms > 1 ? "s" : ""}{checkIn && checkOut ? ` · ${checkIn} → ${checkOut}` : ""}
              </p>
              {offerId ? (
                <button type="button" className="btn" style={{ width: "100%" }} onClick={goToBooking}>
                  Continue to book
                </button>
              ) : (
                <Link href={backToSearch()} className="btn" style={{ width: "100%", textAlign: "center", display: "block", textDecoration: "none" }}>
                  Request a quote
                </Link>
              )}
            </>
          ) : (
            <Link href={backToSearch()} className="btn" style={{ width: "100%", textAlign: "center", display: "block", textDecoration: "none" }}>
              Check rates &amp; availability
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
