"use client";

import { useEffect, useState } from "react";
import type { Tour } from "@/lib/destinations";

function NotifyForm({ city, tour, defaultEmail }: { city: string; tour: Tour; defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  useEffect(() => setEmail((e) => e || defaultEmail), [defaultEmail]);

  if (state === "done") return <div className="tour-done">You&apos;re on the list. We&apos;ll email you when it launches.</div>;
  return (
    <form
      className="tour-notify"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("busy");
        setErr("");
        const r = await fetch("/api/tours/interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, tourId: tour.id, email }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setErr(j.error || "Couldn't save. Try again.");
          setState("idle");
        } else setState("done");
      }}
    >
      <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email for tour updates" />
      <button className="btn small" disabled={state === "busy"}>{state === "busy" ? "…" : "Notify me"}</button>
      {err && <div className="tiny" style={{ color: "var(--bad)", width: "100%" }}>{err}</div>}
    </form>
  );
}

export default function TourCards({ city, tours }: { city: string; tours: Tour[] }) {
  const [email, setEmail] = useState("");
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => j.user && setEmail(j.user.email)).catch(() => {});
  }, []);
  return (
    <div className="tour-grid">
      {tours.map((t) => (
        <div key={t.id} className="card tour-card">
          <span className="tour-soon">Coming soon</span>
          <b className="tour-name">{t.name}</b>
          <span className="tiny">{t.duration}</span>
          <p>{t.summary}</p>
          <ul>{t.highlights.map((h) => <li key={h}>{h}</li>)}</ul>
          <NotifyForm city={city} tour={t} defaultEmail={email} />
        </div>
      ))}
    </div>
  );
}
