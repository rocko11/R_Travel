"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AirportInput, { type PlaceValue } from "./AirportInput";
import { CABIN_LABEL } from "@/lib/format";
import type { CabinClass } from "@/lib/types";

export interface ExtraLegInitial {
  from?: PlaceValue | null;
  to?: PlaceValue | null;
  date?: string;
}

export interface SearchInitial {
  from?: PlaceValue | null;
  to?: PlaceValue | null;
  departDate?: string;
  returnDate?: string;
  extraLegs?: ExtraLegInitial[];
  adults?: number;
  childAges?: number[];
  cabin?: CabinClass;
}

interface LegRow {
  from: PlaceValue | null;
  to: PlaceValue | null;
  date: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};

const MAX_EXTRA_LEGS = 5; // 6 flights total, counting the first leg

export default function SearchForm({ initial = {} }: { initial?: SearchInitial }) {
  const router = useRouter();
  const today = iso(new Date());
  const [tripType, setTripType] = useState<"round" | "oneway" | "multi">(
    initial.extraLegs?.length ? "multi" : initial.returnDate !== undefined ? (initial.returnDate ? "round" : "oneway") : "round"
  );
  const [from, setFrom] = useState<PlaceValue | null>(initial.from ?? null);
  const [to, setTo] = useState<PlaceValue | null>(initial.to ?? null);
  const [depart, setDepart] = useState(initial.departDate ?? addDays(today, 21));
  const [ret, setRet] = useState(initial.returnDate || addDays(today, 28));
  const [legs, setLegs] = useState<LegRow[]>(
    initial.extraLegs?.length
      ? initial.extraLegs.map((l) => ({ from: l.from ?? null, to: l.to ?? null, date: l.date || addDays(initial.departDate ?? today, 3) }))
      : [{ from: null, to: null, date: addDays(initial.departDate ?? today, 21) }]
  );
  const [adults, setAdults] = useState(initial.adults ?? 1);
  const [kids, setKids] = useState<number[]>(initial.childAges ?? []);
  const [cabin, setCabin] = useState<CabinClass>(initial.cabin ?? "economy");
  const [paxOpen, setPaxOpen] = useState(false);
  const [error, setError] = useState("");
  const paxRef = useRef<HTMLDivElement>(null);
  const roundTrip = tripType === "round";

  const addLeg = () => {
    setLegs((ls) => {
      if (ls.length >= MAX_EXTRA_LEGS) return ls;
      const prev = ls[ls.length - 1];
      return [...ls, { from: prev?.to ?? null, to: null, date: addDays(prev?.date ?? depart, 3) }];
    });
  };
  const removeLeg = (i: number) => setLegs((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));
  const updateLeg = (i: number, patch: Partial<LegRow>) =>
    setLegs((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

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
    if (tripType === "multi") {
      for (const l of legs) {
        if (!l.from || !l.to) return setError("Choose where every flight is flying from and to.");
        if (l.from.iata === l.to.iata) return setError("Each flight needs a different origin and destination.");
      }
    }
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
    if (tripType === "round") p.set("returnDate", ret);
    if (tripType === "multi") {
      p.set("extraLegs", legs.map((l) => `${l.from!.iata}|${l.to!.iata}|${l.date}`).join(","));
      p.set("extraLegsLabels", legs.map((l) => `${l.from!.label}~${l.to!.label}`).join(","));
    }
    if (kids.length) p.set("childAges", kids.join(","));
    router.push(`/search?${p}`);
  };

  return (
    <form className="card search" onSubmit={submit}>
      <div className="search-top">
        <div className="seg" role="group" aria-label="Trip type">
          <button type="button" aria-pressed={tripType === "round"} onClick={() => setTripType("round")}>Round trip</button>
          <button type="button" aria-pressed={tripType === "oneway"} onClick={() => setTripType("oneway")}>One way</button>
          <button type="button" aria-pressed={tripType === "multi"} onClick={() => setTripType("multi")}>Multi-city</button>
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

      {tripType === "multi" && (
        <div className="multi-legs">
          {legs.map((l, i) => {
            const minDate = i === 0 ? depart : legs[i - 1].date || depart;
            return (
              <div className="search-grid multi-leg-row" key={i}>
                <AirportInput
                  id={`multi-from-${i}`}
                  label={`Flight ${i + 2} from`}
                  placeholder="City or airport"
                  value={l.from}
                  onChange={(v) => updateLeg(i, { from: v })}
                />
                <span aria-hidden style={{ alignSelf: "center", textAlign: "center" }}>→</span>
                <AirportInput
                  id={`multi-to-${i}`}
                  label="To"
                  placeholder="City or airport"
                  value={l.to}
                  onChange={(v) => updateLeg(i, { to: v })}
                />
                <div className="field">
                  <label htmlFor={`multi-date-${i}`}>Depart</label>
                  <input
                    id={`multi-date-${i}`}
                    type="date"
                    min={minDate}
                    value={l.date}
                    onChange={(e) => updateLeg(i, { date: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => removeLeg(i)}
                  disabled={legs.length <= 1}
                  aria-label={`Remove flight ${i + 2}`}
                >
                  Remove
                </button>
              </div>
            );
          })}
          {legs.length < MAX_EXTRA_LEGS && (
            <button type="button" className="btn ghost small" onClick={addLeg}>
              + Add another flight
            </button>
          )}
        </div>
      )}
      {error && <div className="alert bad" style={{ marginTop: 12, marginBottom: 0 }}>{error}</div>}
    </form>
  );
}
