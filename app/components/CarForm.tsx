"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AirportInput, { type PlaceValue } from "./AirportInput";
import { destinationBySlug } from "@/lib/destinations";
import { CLASS_LABEL, estimateCars, type CarClass } from "@/lib/cars";
import { matchDestination } from "@/lib/hotels";
import { money } from "@/lib/format";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function CarForm() {
  const sp = useSearchParams();
  const preset = destinationBySlug(sp.get("city") ?? "");
  const today = iso(new Date());

  const [place, setPlace] = useState<PlaceValue | null>(
    preset ? { iata: preset.mainAirport, label: `${preset.name} (${preset.mainAirport})` } : null
  );
  const [sameDropoff, setSameDropoff] = useState(true);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceValue | null>(null);
  const [pickupDate, setPickupDate] = useState(iso(new Date(Date.now() + 14 * 86_400_000)));
  const [dropoffDate, setDropoffDate] = useState(iso(new Date(Date.now() + 17 * 86_400_000)));
  const [driverAge, setDriverAge] = useState<"25plus" | "21to24" | "under21">("25plus");
  const [carClass, setCarClass] = useState<CarClass | "any">("any");
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
    if (dropoffDate <= pickupDate) setDropoffDate(iso(new Date(Date.parse(pickupDate) + 3 * 86_400_000)));
  }, [pickupDate, dropoffDate]);

  const matched = useMemo(() => (place ? matchDestination(place.iata) : undefined), [place]);
  const destInput = useMemo(
    () => (place ? { slug: matched?.slug, code: place.iata, city: place.label.replace(/\s*\([^)]*\)\s*$/, "") } : undefined),
    [place, matched]
  );
  const days = Math.max(1, Math.round((Date.parse(dropoffDate) - Date.parse(pickupDate)) / 86_400_000));
  const estimates = useMemo(() => estimateCars(destInput, days), [destInput, days]);

  useEffect(() => {
    if (carClass !== "any" && !estimates.some((e) => e.car.class === carClass)) setCarClass("any");
  }, [estimates, carClass]);
  const chosen = estimates.find((e) => e.car.class === carClass);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place) return setError("Choose a pickup city or airport.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/cars/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLocation: place.label,
          slug: matched?.slug,
          dropoffLocation: sameDropoff ? undefined : dropoffPlace?.label,
          pickupDate,
          dropoffDate,
          carClass: carClass === "any" ? "compact" : carClass,
          driverAge,
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
        <h2 style={{ fontSize: 24, margin: "8px 0" }}>We&apos;re sourcing your rental</h2>
        <p className="muted">
          We&apos;ll contact you at {email} with available cars and exact rates, usually within a few hours.
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
          <AirportInput id="cpickup" label="Pickup city or airport" placeholder="City or airport code" value={place} onChange={setPlace} />
          <div className="field">
            <label htmlFor="cpdate">Pickup date</label>
            <input id="cpdate" type="date" min={today} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="cddate">Drop-off date</label>
            <input id="cddate" type="date" min={pickupDate} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="cage">Driver&apos;s age</label>
            <select id="cage" value={driverAge} onChange={(e) => setDriverAge(e.target.value as typeof driverAge)}>
              <option value="25plus">25 or over</option>
              <option value="21to24">21 – 24</option>
              <option value="under21">Under 21</option>
            </select>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 14 }}>
          <input type="checkbox" checked={sameDropoff} onChange={(e) => setSameDropoff(e.target.checked)} />
          Return to the same location
        </label>
        {!sameDropoff && (
          <div style={{ marginTop: 8 }}>
            <AirportInput id="cdropoff" label="Drop-off city or airport" placeholder="City or airport code" value={dropoffPlace} onChange={setDropoffPlace} />
          </div>
        )}
      </div>

      <h2 className="jet-h">Choose a car</h2>
      {place ? (
        <p className="muted" style={{ marginTop: -4 }}>
          {estimates.length} class{estimates.length !== 1 ? "es" : ""} available in {destInput?.city}. Estimates are total for {days} day{days > 1 ? "s" : ""} below.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: -4 }}>Search a pickup city or airport code above to see cars to choose from.</p>
      )}
      {estimates.length > 0 && (
        <div className="jet-cards" role="radiogroup" aria-label="Car class">
          <button type="button" role="radio" aria-checked={carClass === "any"} className="card jet-card" onClick={() => setCarClass("any")}>
            <b>Best available</b>
            <span className="muted">We recommend the right car for your trip and budget.</span>
          </button>
          {estimates.map((e) => (
            <button
              type="button"
              role="radio"
              aria-checked={carClass === e.car.class}
              key={e.car.class}
              className="card jet-card"
              onClick={() => setCarClass(e.car.class)}
            >
              <b>{CLASS_LABEL[e.car.class]}</b>
              <span className="tiny">{e.car.model} · {e.car.seats} seats · {e.car.transmission}</span>
              <span className="jet-price">
                {money(e.low, "USD").replace(".00", "")} – {money(e.high, "USD").replace(".00", "")}
              </span>
              <span className="tiny">total for the rental</span>
            </button>
          ))}
        </div>
      )}
      <p className="tiny">
        Estimates use 2026 market-average rates for the class. Taxes, insurance and young-driver surcharges vary by location. Your final rate comes in the quote.
      </p>

      <div className="card section" style={{ marginTop: 16 }}>
        <h2>Your details</h2>
        <p>We&apos;ll send available cars and exact rates, usually within a few hours.</p>
        <div className="form-grid two">
          <label className="input">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="input">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="input">Phone, with country code<input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="input">Anything else? (optional)
            <input placeholder="Child seat, GPS, extra driver…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? "Sending…" : "Request a quote"}
        </button>
        {!signedIn && (
          <p className="tiny" style={{ marginTop: 10 }}>
            <Link href="/account/login?next=/cars" style={{ color: "var(--brand)" }}>Sign in</Link> first to track this request under My trips.
          </p>
        )}
      </div>
    </form>
  );
}
