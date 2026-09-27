"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AirportInput, { type PlaceValue } from "./AirportInput";
import { distanceNm, estimateJets, hoursLabel, JET_CLASSES, type JetCategory } from "@/lib/jets";
import { money } from "@/lib/format";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function JetForm() {
  const today = iso(new Date());
  const [from, setFrom] = useState<PlaceValue | null>(null);
  const [to, setTo] = useState<PlaceValue | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [departDate, setDepartDate] = useState(iso(new Date(Date.now() + 14 * 86_400_000)));
  const [departTime, setDepartTime] = useState("10:00");
  const [returnDate, setReturnDate] = useState(iso(new Date(Date.now() + 17 * 86_400_000)));
  const [returnTime, setReturnTime] = useState("16:00");
  const [pax, setPax] = useState(4);
  const [category, setCategory] = useState<JetCategory | "any">("any");
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

  useEffect(() => {
    if (returnDate < departDate) setReturnDate(departDate);
  }, [departDate, returnDate]);

  const nm = useMemo(() => {
    if (from?.lat == null || from?.lon == null || to?.lat == null || to?.lon == null) return null;
    return distanceNm({ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon });
  }, [from, to]);

  const estimates = useMemo(() => (nm ? estimateJets(nm, pax, roundTrip) : null), [nm, pax, roundTrip]);
  const chosen = estimates?.find((e) => e.category.id === category);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return setError("Choose departure and destination airports.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/jets/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: { iata: from.iata, label: from.label },
          to: { iata: to.iata, label: to.label },
          departDate,
          departTime,
          returnDate: roundTrip ? returnDate : undefined,
          returnTime: roundTrip ? returnTime : undefined,
          passengers: pax,
          category,
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
        <h2 style={{ fontSize: 24, margin: "8px 0" }}>We&apos;re sourcing your jet</h2>
        <p className="muted">
          We&apos;ll contact you at {email} with available aircraft and exact prices, usually within a few hours.
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
        <div className="search-top">
          <div className="seg" role="group" aria-label="Trip type">
            <button type="button" aria-pressed={!roundTrip} onClick={() => setRoundTrip(false)}>One way</button>
            <button type="button" aria-pressed={roundTrip} onClick={() => setRoundTrip(true)}>Round trip</button>
          </div>
          <label className="pax-inline">
            Passengers
            <select value={pax} onChange={(e) => setPax(Number(e.target.value))}>
              {Array.from({ length: 19 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
        </div>
        <div className="jet-grid">
          <AirportInput id="jfrom" label="From" placeholder="City or airport" value={from} onChange={setFrom} />
          <AirportInput id="jto" label="To" placeholder="City or airport" value={to} onChange={setTo} />
          <div className="field">
            <label htmlFor="jdate">Depart</label>
            <input id="jdate" type="date" min={today} value={departDate} onChange={(e) => setDepartDate(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="jtime">Time</label>
            <input id="jtime" type="time" step={900} value={departTime} onChange={(e) => setDepartTime(e.target.value)} required />
          </div>
          {roundTrip && (
            <>
              <div className="field">
                <label htmlFor="rdate">Return</label>
                <input id="rdate" type="date" min={departDate} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="rtime">Time</label>
                <input id="rtime" type="time" step={900} value={returnTime} onChange={(e) => setReturnTime(e.target.value)} required />
              </div>
            </>
          )}
        </div>
      </div>

      <h2 className="jet-h">Choose an aircraft</h2>
      {!estimates && <p className="muted" style={{ marginTop: -4 }}>Pick your airports to see estimated prices.</p>}
      {estimates && nm && (
        <p className="muted" style={{ marginTop: -4 }}>
          {Math.round(nm).toLocaleString()} nautical miles{roundTrip ? " each way" : ""}. Estimates for the whole trip.
        </p>
      )}
      <div className="jet-cards" role="radiogroup" aria-label="Aircraft category">
        <button type="button" role="radio" aria-checked={category === "any"} className="card jet-card" onClick={() => setCategory("any")}>
          <b>Best available</b>
          <span className="muted">We recommend the right aircraft for your route and group.</span>
        </button>
        {(estimates ?? JET_CLASSES.map((c) => ({ category: c, fits: pax <= c.seats, low: 0, high: 0, hoursPerLeg: 0, fuelStops: 0 }))).map((e) => (
          <button
            type="button"
            role="radio"
            aria-checked={category === e.category.id}
            key={e.category.id}
            className="card jet-card"
            disabled={!e.fits}
            onClick={() => setCategory(e.category.id)}
          >
            <b>{e.category.name}</b>
            <span className="tiny">{e.category.examples}</span>
            <span className="muted">Up to {e.category.seats} seats</span>
            {e.low > 0 && (
              <>
                <span className="jet-price">{money(e.low, "USD").replace(".00", "")} – {money(e.high, "USD").replace(".00", "")}</span>
                <span className="tiny">
                  ~{hoursLabel(e.hoursPerLeg)} per leg{e.fuelStops ? ` · ${e.fuelStops} fuel stop${e.fuelStops > 1 ? "s" : ""}` : " · nonstop"}
                </span>
              </>
            )}
            {!e.fits && <span className="tiny" style={{ color: "var(--bad)" }}>Too small for {pax}</span>}
          </button>
        ))}
      </div>
      <p className="tiny">
        Estimates use typical 2026 hourly charter rates. They exclude the 7.5% US federal excise tax, positioning, airport fees
        and crew overnights. Your final price comes in the quote.
      </p>

      <div className="card section" style={{ marginTop: 16 }}>
        <h2>Your details</h2>
        <p>We&apos;ll send options and exact prices, usually within a few hours.</p>
        <div className="form-grid two">
          <label className="input">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="input">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="input">Phone, with country code<input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="input">Anything else? (optional)
            <input placeholder="Pets, catering, flexible times…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? "Sending…" : "Request a quote"}
        </button>
        {!signedIn && (
          <p className="tiny" style={{ marginTop: 10 }}>
            <Link href="/account/login?next=/jets" style={{ color: "var(--brand)" }}>Sign in</Link> first to track this request under My trips.
          </p>
        )}
      </div>
    </form>
  );
}
