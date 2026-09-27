"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AirportInput, { type PlaceValue } from "./AirportInput";
import { CABIN_LABEL } from "@/lib/format";
import type { CabinClass } from "@/lib/types";

export interface SearchInitial {
  from?: PlaceValue | null;
  to?: PlaceValue | null;
  departDate?: string;
  returnDate?: string;
  adults?: number;
  childAges?: number[];
  cabin?: CabinClass;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

export default function SearchForm({ initial = {} }: { initial?: SearchInitial }) {
  const router = useRouter();
  const today = iso(new Date());
  const [roundTrip, setRoundTrip] = useState(initial.returnDate !== undefined ? Boolean(initial.returnDate) : true);
  const [from, setFrom] = useState<PlaceValue | null>(initial.from ?? null);
  const [to, setTo] = useState<PlaceValue | null>(initial.to ?? null);
  const [depart, setDepart] = useState(initial.departDate ?? addDays(today, 21));
  const [ret, setRet] = useState(initial.returnDate || addDays(today, 28));
  const [adults, setAdults] = useState(initial.adults ?? 1);
  const [kids, setKids] = useState<number[]>(initial.childAges ?? []);
  const [cabin, setCabin] = useState<CabinClass>(initial.cabin ?? "economy");
  const [paxOpen, setPaxOpen] = useState(false);
  const [error, setError] = useState("");
  const paxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!paxRef.current?.contains(e.target as Node)) setPaxOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (ret < depart) setRet(depart);
  }, [depart, ret]);

  const travelers = adults + kids.length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return setError("Choose where you're flying from and to.");
    if (from.iata === to.iata) return setError("Origin and destination must differ.");
    setError("");
    const p = new URLSearchParams({
      origin: from.iata,
      destination: to.iata,
      fromLabel: from.label,
      toLabel: to.label,
      departDate: depart,
      adults: String(adults),
      cabin,
    });
    if (roundTrip) p.set("returnDate", ret);
    if (kids.length) p.set("childAges", kids.join(","));
    router.push(`/search?${p}`);
  };

  return (
    <form className="card search" onSubmit={submit}>
      <div className="search-top">
        <div className="seg" role="group" aria-label="Trip type">
          <button type="button" aria-pressed={roundTrip} onClick={() => setRoundTrip(true)}>Round trip</button>
          <button type="button" aria-pressed={!roundTrip} onClick={() => setRoundTrip(false)}>One way</button>
        </div>
        <div ref={paxRef} style={{ position: "relative" }}>
          <button type="button" className="btn ghost small" onClick={() => setPaxOpen((o) => !o)} aria-expanded={paxOpen}>
            {travelers} traveler{travelers > 1 ? "s" : ""} · {CABIN_LABEL[cabin]}
          </button>
          {paxOpen && (
            <div className="pop" style={{ minWidth: 280 }}>
              <div className="pax-row">
                <div>Adults<div className="tiny">18+</div></div>
                <div className="stepper">
                  <button type="button" aria-label="Fewer adults" disabled={adults <= 1 || kids.filter((a) => a < 2).length >= adults} onClick={() => setAdults(adults - 1)}>−</button>
                  <span>{adults}</span>
                  <button type="button" aria-label="More adults" disabled={travelers >= 9} onClick={() => setAdults(adults + 1)}>+</button>
                </div>
              </div>
              <div className="pax-row">
                <div>Children<div className="tiny">0–17</div></div>
                <div className="stepper">
                  <button type="button" aria-label="Fewer children" disabled={!kids.length} onClick={() => setKids(kids.slice(0, -1))}>−</button>
                  <span>{kids.length}</span>
                  <button type="button" aria-label="More children" disabled={travelers >= 9} onClick={() => setKids([...kids, 8])}>+</button>
                </div>
              </div>
              {kids.map((age, i) => (
                <div className="pax-row" key={i}>
                  <span className="muted">Child {i + 1} age</span>
                  <select
                    value={age}
                    onChange={(e) => setKids(kids.map((a, j) => (j === i ? Number(e.target.value) : a)))}
                    aria-label={`Child ${i + 1} age`}
                  >
                    {Array.from({ length: 18 }, (_, a) => (
                      <option key={a} value={a} disabled={a < 2 && kids.filter((x, j) => x < 2 && j !== i).length >= adults}>
                        {a < 2 ? `${a} (lap infant)` : a}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="pax-row">
                <span>Cabin</span>
                <select value={cabin} onChange={(e) => setCabin(e.target.value as CabinClass)} aria-label="Cabin class">
                  {Object.entries(CABIN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="search-grid">
        <AirportInput id="from" label="From" placeholder="City or airport" value={from} onChange={setFrom} />
        <button type="button" className="swap" aria-label="Swap origin and destination" onClick={() => { setFrom(to); setTo(from); }}>⇄</button>
        <AirportInput id="to" label="To" placeholder="Anywhere in the world" value={to} onChange={setTo} />
        <div className="field">
          <label htmlFor="depart">Depart</label>
          <input id="depart" type="date" min={today} value={depart} onChange={(e) => setDepart(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="return">Return</label>
          <input id="return" type="date" min={depart} value={roundTrip ? ret : ""} disabled={!roundTrip} onChange={(e) => setRet(e.target.value)} />
        </div>
        <button className="btn" type="submit">Search</button>
      </div>
      {error && <div className="alert bad" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}
    </form>
  );
}
