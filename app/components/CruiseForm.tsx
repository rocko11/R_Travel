"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  REGIONS,
  SUITE_LABEL,
  estimateCruises,
  shipsForRegion,
  tierName,
  type CruiseRegion,
  type SuiteCategory,
} from "@/lib/cruises";
import { money } from "@/lib/format";

const iso = (d: Date) => d.toISOString().slice(0, 7);

export default function CruiseForm() {
  const [region, setRegion] = useState<CruiseRegion | "any">("any");
  const [nights, setNights] = useState(7);
  const [guests, setGuests] = useState(2);
  const [suite, setSuite] = useState<SuiteCategory>("veranda");
  const [departMonth, setDepartMonth] = useState(iso(new Date(Date.now() + 120 * 86_400_000)));
  const [shipId, setShipId] = useState<string | "any">("any");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentId, setSentId] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        if (j.user) {
          setSignedIn(true);
          setName((n) => n || j.user.name);
          setEmail((e) => e || j.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const estimates = useMemo(() => estimateCruises(region, nights, suite), [region, nights, suite]);
  useEffect(() => {
    if (shipId !== "any" && !shipsForRegion(region).some((s) => s.id === shipId)) setShipId("any");
  }, [region, shipId]);
  const chosen = estimates.find((e) => e.ship.id === shipId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/cruises/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          shipId: shipId === "any" ? undefined : shipId,
          departMonth,
          nights,
          guests,
          suite,
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
        <h2 style={{ fontSize: 24, margin: "8px 0" }}>We&apos;re sourcing your sailing</h2>
        <p className="muted">
          We&apos;ll contact you at {email} with available cabins, exact fares and any airfare needed, usually within a few hours.
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
          <div className="field">
            <label htmlFor="cregion">Where to</label>
            <select id="cregion" value={region} onChange={(e) => setRegion(e.target.value as CruiseRegion | "any")}>
              <option value="any">Anywhere — surprise me</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cmonth">Sail month</label>
            <input id="cmonth" type="month" min={iso(new Date())} value={departMonth} onChange={(e) => setDepartMonth(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="cnights">Nights</label>
            <select id="cnights" value={nights} onChange={(e) => setNights(Number(e.target.value))}>
              {[3, 5, 7, 10, 14, 21, 28, 45, 60].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cguests">Guests</label>
            <select id="cguests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              {Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
        </div>
      </div>

      <h2 className="jet-h">Choose a suite</h2>
      <div className="seg" role="group" aria-label="Suite category" style={{ marginBottom: 12 }}>
        {(["veranda", "grand", "owners"] as SuiteCategory[]).map((s) => (
          <button key={s} type="button" aria-pressed={suite === s} onClick={() => setSuite(s)}>{SUITE_LABEL[s]}</button>
        ))}
      </div>

      <h2 className="jet-h">Choose a ship</h2>
      <p className="muted" style={{ marginTop: -4 }}>
        {estimates.length ? `${estimates.length} ship${estimates.length > 1 ? "s" : ""} sail this region.` : "No ships found for this region — try Anywhere."}{" "}
        Estimates are per person, double occupancy, for the whole sailing.
      </p>
      <div className="jet-cards" role="radiogroup" aria-label="Ship">
        <button type="button" role="radio" aria-checked={shipId === "any"} className="card jet-card" onClick={() => setShipId("any")}>
          <b>Best available</b>
          <span className="muted">We recommend the right line and ship for your dates and region.</span>
        </button>
        {estimates.map((e) => (
          <button
            type="button"
            role="radio"
            aria-checked={shipId === e.ship.id}
            key={e.ship.id}
            className="card jet-card"
            onClick={() => setShipId(e.ship.id)}
          >
            <b>{e.ship.line} — {e.ship.ship}</b>
            <span className="tiny">{tierName(e.ship.tier)} · {e.ship.guests} guests · built {e.ship.launched}</span>
            <span className="muted">{e.ship.highlights}</span>
            <span className="jet-price">{money(e.low, "USD").replace(".00", "")} – {money(e.high, "USD").replace(".00", "")} pp</span>
            <span className="tiny">{e.ship.allInclusive ? "All-inclusive fare (gratuities, wine, WiFi, excursions)" : "Premium-inclusive fare (gratuities, WiFi, some dining)"}</span>
          </button>
        ))}
      </div>
      <p className="tiny">
        Estimates use 2026 published brochure rates for the chosen suite category. Port charges, flights and pre/post hotels are
        quoted separately. Your final fare comes in the quote.
      </p>

      <div className="card section" style={{ marginTop: 16 }}>
        <h2>Your details</h2>
        <p>We&apos;ll send available sailings and exact fares, usually within a few hours.</p>
        <div className="form-grid two">
          <label className="input">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="input">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="input">Phone, with country code<input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="input">Anything else? (optional)
            <input placeholder="Anniversary, dietary needs, flexible dates…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? "Sending…" : "Request a quote"}
        </button>
        {!signedIn && (
          <p className="tiny" style={{ marginTop: 10 }}>
            <Link href="/account/login?next=/cruises" style={{ color: "var(--brand)" }}>Sign in</Link> first to track this request under My trips.
          </p>
        )}
      </div>
    </form>
  );
}
