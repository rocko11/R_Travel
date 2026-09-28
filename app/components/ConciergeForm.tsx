"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BUDGET_OPTIONS, CONCIERGE_SERVICES } from "@/lib/conciergeServices";
import { destinationBySlug } from "@/lib/destinations";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function ConciergeForm() {
  const sp = useSearchParams();
  const preset = destinationBySlug(sp.get("city") ?? "");
  const today = iso(new Date());
  const [services, setServices] = useState<string[]>(sp.get("service") ? [sp.get("service")!] : []);
  const [city, setCity] = useState(preset ? `${preset.name}, ${preset.country}` : (sp.get("dest") ?? ""));
  const [startDate, setStartDate] = useState(iso(new Date(Date.now() + 14 * 86_400_000)));
  const [endDate, setEndDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState("Flexible");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactBy, setContactBy] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
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

  const toggle = (id: string) => setServices((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/concierge/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services, city, startDate, endDate: endDate || undefined, guests, budget, details, name, email, phone, contactBy }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't send your request.");
      setSent(j.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your request.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="card section" style={{ textAlign: "center", padding: 36 }}>
        <div className="alert good" style={{ display: "inline-block" }}>Request received</div>
        <h2 style={{ fontSize: 24, margin: "8px 0" }}>Your concierge is on it</h2>
        <p className="muted">We&apos;ll contact you by {contactBy === "email" ? `email at ${email}` : contactBy === "whatsapp" ? "WhatsApp" : "phone"} with options and confirmations.</p>
        <p className="tiny">Request ID {sent}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
          {signedIn && <Link href="/account" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>My trips</Link>}
          <button className="btn ghost small" onClick={() => { setSent(""); setDetails(""); setServices([]); }}>New request</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="card section">
        <h2>What can we arrange?</h2>
        <p>Pick everything you need. One request can cover a whole trip.</p>
        <div className="svc-grid">
          {CONCIERGE_SERVICES.map((s) => (
            <label key={s.id} className={`svc ${services.includes(s.id) ? "on" : ""}`}>
              <input type="checkbox" checked={services.includes(s.id)} onChange={() => toggle(s.id)} />
              {s.label}
            </label>
          ))}
        </div>
      </div>

      <div className="card section">
        <h2>Where and when</h2>
        <div className="form-grid two">
          <label className="input">City or destination
            <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris, France" />
          </label>
          <label className="input">Guests
            <input required type="number" min={1} max={200} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
          </label>
          <label className="input">From
            <input required type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="input">To (optional)
            <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label className="input">Budget
            <select value={budget} onChange={(e) => setBudget(e.target.value)}>
              {BUDGET_OPTIONS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
        </div>
        <label className="input" style={{ marginTop: 10 }}>Tell us what you&apos;d like
          <textarea
            required
            rows={5}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Dinner for 4 at a top sushi restaurant on Friday around 8pm, a private English-speaking guide for the Louvre on Saturday morning, and airport pickup on arrival."
            className="textarea"
          />
        </label>
      </div>

      <div className="card section">
        <h2>How to reach you</h2>
        <div className="form-grid two">
          <label className="input">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="input">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="input">Phone, with country code<input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="input">Preferred contact
            <select value={contactBy} onChange={(e) => setContactBy(e.target.value)}>
              <option value="email">Email</option>
              <option value="phone">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy}>{busy ? "Sending…" : "Send to concierge"}</button>
        <p className="tiny" style={{ marginTop: 10 }}>
          No charge to ask. We confirm prices with you before booking anything.
          {!signedIn && <> <Link href="/account/login?next=/concierge" style={{ color: "var(--brand)" }}>Sign in</Link> to track requests under My trips.</>}
        </p>
      </div>
    </form>
  );
}
