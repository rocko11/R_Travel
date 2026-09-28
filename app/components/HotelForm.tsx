"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AirportInput, { type PlaceValue } from "./AirportInput";
import { destinationBySlug } from "@/lib/destinations";
import { ROOM_LABEL, estimateHotels, matchDestination, type RoomType } from "@/lib/hotels";
import { money } from "@/lib/format";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function HotelForm() {
  const sp = useSearchParams();
  const preset = destinationBySlug(sp.get("city") ?? "");
  const today = iso(new Date());

  const [place, setPlace] = useState<PlaceValue | null>(
    preset ? { iata: preset.mainAirport, label: `${preset.name} (${preset.mainAirport})` } : null
  );
  const [checkIn, setCheckIn] = useState(iso(new Date(Date.now() + 14 * 86_400_000)));
  const [checkOut, setCheckOut] = useState(iso(new Date(Date.now() + 17 * 86_400_000)));
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [roomType, setRoomType] = useState<RoomType>("standard");
  const [hotelName, setHotelName] = useState<string | "any">("any");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentId, setSentId] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (j.user) {
        setSignedIn(true);
        setName((n) => n || j.user.name);
        setEmail((e) => e || j.user.email);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (checkOut <= checkIn) setCheckOut(iso(new Date(Date.parse(checkIn) + 3 * 86_400_000)));
  }, [checkIn, checkOut]);

  const matched = useMemo(() => (place ? matchDestination(place.iata) : undefined), [place]);
  const nights = Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));
  const estimates = useMemo(() => estimateHotels(matched?.slug, nights, roomType), [matched, nights, roomType]);
  useEffect(() => {
    if (hotelName !== "any" && !estimates.some((e) => e.hotel.name === hotelName)) setHotelName("any");
  }, [estimates, hotelName]);
  const chosen = estimates.find((e) => e.hotel.name === hotelName);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place) return setError("Choose a city or airport.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/hotels/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: place.label,
          slug: matched?.slug,
          hotelName: hotelName === "any" ? undefined : hotelName,
          checkIn,
          checkOut,
          guests,
          rooms,
          roomType,
          estimate: chosen ? { low: chosen.low, high: chosen.high } : undefined,
          name,
          email,
          phone,
          notes,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not send your request.");
      setSentId(j.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  };

  if (sentId) {
    return (
      <div className="card section" style={{ textAlign: "center", padding: 36 }}>
        <div className="alert good" style={{ display: "inline-block" }}>Request received</div>
        <h2 style={{ fontSize: 24, margin: "8px 0" }}>We&apos;re sourcing your stay</h2>
        <p className="muted">
          We&apos;ll contact you at {email} with available rooms and exact rates, usually within a few hours.
        </p>
        <p className="tiny">Request ID {sentId}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
          {signedIn && <Link href="/account" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>My trips</Link>}
          <button className="btn ghost small" onClick={() => { setSentId(""); setNotes(""); }}>New request</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="card search">
        <div className="jet-grid">
          <AirportInput id="hcity" label="City or airport" placeholder="City or airport code" value={place} onChange={setPlace} />
          <div className="field">
            <label htmlFor="hin">Check-in</label>
            <input id="hin" type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="hout">Check-out</label>
            <input id="hout" type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="hguests">Guests</label>
            <select id="hguests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="hrooms">Rooms</label>
            <select id="hrooms" value={rooms} onChange={(e) => setRooms(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
        </div>
      </div>

      <h2 className="jet-h">Choose a room</h2>
      <div className="seg" role="group" aria-label="Room type" style={{ marginBottom: 12 }}>
        {(["standard", "deluxe", "suite"] as RoomType[]).map((r) => (
          <button key={r} type="button" aria-pressed={roomType === r} onClick={() => setRoomType(r)}>{ROOM_LABEL[r]}</button>
        ))}
      </div>

      <h2 className="jet-h">Choose a hotel</h2>
      {matched ? (
        <p className="muted" style={{ marginTop: -4 }}>
          {estimates.length} hotel{estimates.length !== 1 ? "s" : ""} in our {matched.name} guide. Estimates are per room, for {nights} night{nights > 1 ? "s" : ""}, {rooms} room{rooms > 1 ? "s" : ""} total below.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: -4 }}>
          {place ? "No guide yet for this destination — we'll hand-pick hotels and send options." : "Search a city or airport code to see hotels from our guides, or any destination — we'll still source it."}
        </p>
      )}
      {estimates.length > 0 && (
        <div className="jet-cards" role="radiogroup" aria-label="Hotel">
          <button type="button" role="radio" aria-checked={hotelName === "any"} className="card jet-card" onClick={() => setHotelName("any")}>
            <b>Best available</b>
            <span className="muted">We recommend the right hotel for your dates and budget.</span>
          </button>
          {estimates.map((e) => (
            <button
              type="button"
              role="radio"
              aria-checked={hotelName === e.hotel.name}
              key={e.hotel.name}
              className="card jet-card"
              onClick={() => setHotelName(e.hotel.name)}
            >
              <b>{e.hotel.name}</b>
              <span className="tiny">{e.hotel.tier} · {e.hotel.area}</span>
              <span className="jet-price">{money(e.low * rooms, "USD").replace(".00", "")} – {money(e.high * rooms, "USD").replace(".00", "")}</span>
              <span className="tiny">total for the stay, {rooms} room{rooms > 1 ? "s" : ""}</span>
            </button>
          ))}
        </div>
      )}
      <p className="tiny">
        Estimates use 2026 market-average rates for the tier and room type. Taxes, resort fees and breakfast vary by hotel.
        Your final rate comes in the quote.
      </p>

      <div className="card section" style={{ marginTop: 16 }}>
        <h2>Your details</h2>
        <p>We&apos;ll send available rooms and exact rates, usually within a few hours.</p>
        <div className="form-grid two">
          <label className="input">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="input">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="input">Phone, with country code<input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="input">Anything else? (optional)
            <input placeholder="High floor, late checkout, accessible room…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? "Sending…" : "Request a quote"}
        </button>
        {!signedIn && (
          <p className="tiny" style={{ marginTop: 10 }}>
            <Link href="/account/login?next=/hotels" style={{ color: "var(--brand)" }}>Sign in</Link> first to track this request under My trips.
          </p>
        )}
      </div>
    </form>
  );
}
