"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AirportInput, { type PlaceValue } from "./AirportInput";
import { destinationBySlug } from "@/lib/destinations";
import { estimateTours, matchDestination, DURATION_LABEL } from "@/lib/localTours";
import { money } from "@/lib/format";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function TourForm() {
  const sp = useSearchParams();
  const preset = destinationBySlug(sp.get("city") ?? "");

  const [place, setPlace] = useState<PlaceValue | null>(
    preset ? { iata: preset.mainAirport, label: `${preset.name} (${preset.mainAirport})` } : null
  );
  const [date, setDate] = useState(iso(new Date(Date.now() + 14 * 86_400_000)));
  const [travelers, setTravelers] = useState(2);
  const [tourName, setTourName] = useState<string | "any">("any");
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

  const matched = useMemo(() => (place ? matchDestination(place.iata) : undefined), [place]);
  const destInput = useMemo(
    () => (place ? { slug: matched?.slug, code: place.iata, city: place.label.replace(/\s*\([^)]*\)\s*$/, "") } : undefined),
    [place, matched]
  );
  const estimates = useMemo(() => estimateTours(destInput), [destInput]);
  useEffect(() => {
    if (tourName !== "any" && !estimates.some((e) => e.tour.name === tourName)) setTourName("any");
  }, [estimates, tourName]);
  const chosen = estimates.find((e) => e.tour.name === tourName);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place) return setError("Choose a city or airport.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/tours/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: place.label,
          slug: matched?.slug,
          tourName: tourName === "any" ? undefined : tourName,
          date,
          travelers,
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
        <h2 style={{ fontSize: 24, margin: "8px 0" }}>We&apos;re lining up your tour</h2>
        <p className="muted">
          We&apos;ll contact you at {email} with availability and exact pricing, usually within a few hours.
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
          <AirportInput id="tcity" label="City or airport" placeholder="City or airport code" value={place} onChange={setPlace} />
          <div className="field">
            <label htmlFor="tdate">Tour date</label>
            <input id="tdate" type="date" min={iso(new Date())} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="ttrav">Travelers</label>
            <select id="ttrav" value={travelers} onChange={(e) => setTravelers(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
        </div>
      </div>

      <h2 className="jet-h">Choose a tour</h2>
      {place ? (
        <p className="muted" style={{ marginTop: -4 }}>
          {estimates.length} tour{estimates.length !== 1 ? "s" : ""} in {destInput?.city}
          {matched ? ", including our destination guide's picks" : ""}. Estimates are per person below.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: -4 }}>Search a city or airport code above to see tours to choose from.</p>
      )}
      {estimates.length > 0 && (
        <div className="jet-cards" role="radiogroup" aria-label="Tour">
          <button type="button" role="radio" aria-checked={tourName === "any"} className="card jet-card" onClick={() => setTourName("any")}>
            <b>Best available</b>
            <span className="muted">We recommend the right tour for your dates and group.</span>
          </button>
          {estimates.map((e) => (
            <button
              type="button"
              role="radio"
              aria-checked={tourName === e.tour.name}
              key={e.tour.name}
              className="card jet-card"
              onClick={() => setTourName(e.tour.name)}
            >
              <b>{e.tour.name}</b>
              <span className="tiny">{e.tour.tier} · {DURATION_LABEL[e.tour.duration]}</span>
              <span className="jet-price">{money(e.low * travelers, "USD").replace(".00", "")} – {money(e.high * travelers, "USD").replace(".00", "")}</span>
              <span className="tiny">total, {travelers} traveler{travelers > 1 ? "s" : ""}</span>
            </button>
          ))}
        </div>
      )}
      <p className="tiny">
        Estimates use 2026 market-average rates for the tier and duration. Final pricing depends on the operator, season and group size.
      </p>

      <div className="card section" style={{ marginTop: 16 }}>
        <h2>Your details</h2>
        <p>We&apos;ll send availability and exact pricing, usually within a few hours.</p>
        <div className="form-grid two">
          <label className="input">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="input">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="input">Phone, with country code<input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="input">Anything else? (optional)
            <input placeholder="Dietary needs, pace, accessibility…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? "Sending…" : "Request a quote"}
        </button>
        {!signedIn && (
          <p className="tiny" style={{ marginTop: 10 }}>
            <Link href="/account/login?next=/tours" style={{ color: "var(--brand)" }}>Sign in</Link> first to track this request under My trips.
          </p>
        )}
      </div>
    </form>
  );
}
