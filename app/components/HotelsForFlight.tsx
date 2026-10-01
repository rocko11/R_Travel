"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import type { HotelEstimate } from "@/lib/hotels";

interface SearchResponse {
  source: "live" | "estimate";
  hotels: HotelEstimate[];
  slug?: string;
}

/** Same check-in/out resolution as the "Plan your days" CTA: use the return date when there is
 * one, otherwise default to a 3-night stay starting on the departure date. */
function stayDates(departDate: string, returnDate?: string) {
  const checkIn = departDate;
  if (returnDate && returnDate > departDate) return { checkIn, checkOut: returnDate };
  const d = new Date(departDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 3);
  return { checkIn, checkOut: d.toISOString().slice(0, 10) };
}

/** Cross-sell strip: a few hotel options for the flight's destination and dates, shown right on
 * the flight results page so a guest doesn't have to think to go look for a place to stay. */
export default function HotelsForFlight({
  code,
  label,
  departDate,
  returnDate,
  guests,
}: {
  code: string;
  label: string;
  departDate: string;
  returnDate?: string;
  guests: number;
}) {
  const { checkIn, checkOut } = stayDates(departDate, returnDate);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    const ctl = new AbortController();
    const q = new URLSearchParams({
      code,
      city: label.replace(/ \(.*\)$/, ""),
      checkIn,
      checkOut,
      guests: String(Math.max(1, Math.min(guests, 20))),
      rooms: "1",
      roomType: "standard",
    });
    fetch(`/api/hotels/search?${q}`, { signal: ctl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "failed");
        setData(j);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setFailed(true);
      });
    return () => ctl.abort();
  }, [code, label, checkIn, checkOut, guests]);

  if (failed) return null;
  const nights = Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));
  const city = label.replace(/ \(.*\)$/, "");
  const hotelsHref = `/hotels?${new URLSearchParams({ code, label, in: checkIn, out: checkOut, guests: String(guests), rooms: "1" })}`;

  const top = (data?.hotels ?? []).slice().sort((a, b) => a.low - b.low).slice(0, 4);

  return (
    <div className="card hotel-teaser-strip">
      <div className="hotel-teaser-head">
        <b>Places to stay in {city}</b>
        <span className="muted">
          {nights} night{nights > 1 ? "s" : ""} · {checkIn} – {checkOut}
        </span>
        <a className="hprop-link" href={hotelsHref} style={{ marginLeft: "auto" }}>
          See all hotels →
        </a>
      </div>

      {!data && !failed && (
        <div className="hotel-teaser-row">
          {[0, 1, 2].map((i) => (
            <div key={i} className="hotel-teaser-card skeleton-card" />
          ))}
        </div>
      )}

      {data && top.length === 0 && <p className="muted" style={{ margin: 0 }}>No hotels found for these dates yet — try the full hotel search.</p>}

      {top.length > 0 && (
        <div className="hotel-teaser-row">
          {top.map((h, i) => (
            <a key={i} className="hotel-teaser-card" href={hotelsHref}>
              <div className="hotel-teaser-photo">
                {h.hotel.photo ? (
                  <img src={h.hotel.photo} alt="" loading="lazy" />
                ) : (
                  <div className="hprop-photo-ph" style={{ minHeight: "auto", height: "100%" }}>{city}</div>
                )}
              </div>
              <div className="hotel-teaser-name">{h.hotel.name}</div>
              {h.hotel.stars ? <div className="hprop-stars">{"★".repeat(Math.round(h.hotel.stars))}</div> : null}
              <div className="hotel-teaser-price">
                from {money(h.low, "USD").replace(".00", "")} <span className="tiny">total</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
