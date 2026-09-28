"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AirportInput, { type PlaceValue } from "./AirportInput";
import { destinationBySlug, destinationForIata } from "@/lib/destinations";
import type { PlanDay, PlanSlot, TripPlan } from "@/lib/planner";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const DRAFT_KEY = "rt-plan-draft";
const TIMES: PlanSlot["time"][] = ["Morning", "Afternoon", "Evening"];
const STYLE_IDS: TripPlan["id"][] = ["highlights", "local", "relaxed"];
const STYLE_NAMES = ["Best of the trip", "Like a local", "Relaxed and premium"];

type Slot = TripPlan | "loading" | { error: string } | null;

function dateLabel(start: string, i: number) {
  return new Date(Date.parse(start) + i * 86_400_000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
const isPlan = (p: Slot): p is TripPlan => Boolean(p && typeof p === "object" && "days" in p);

export default function TripPlanner() {
  const sp = useSearchParams();
  const router = useRouter();
  const guideFromSlug = destinationBySlug(sp.get("city") ?? "");
  const initialPlace: PlaceValue | null = sp.get("iata")
    ? { iata: sp.get("iata")!, label: sp.get("label") || sp.get("iata")! }
    : guideFromSlug
      ? { iata: guideFromSlug.mainAirport, label: `${guideFromSlug.name} (${guideFromSlug.mainAirport})` }
      : null;

  const [dest, setDest] = useState<PlaceValue | null>(initialPlace);
  const [start, setStart] = useState(sp.get("start") || iso(new Date(Date.now() + 21 * 86_400_000)));
  const [days, setDays] = useState(Math.min(10, Math.max(1, Number(sp.get("days")) || 3)));
  const [travelers, setTravelers] = useState(Math.max(1, Number(sp.get("travelers")) || 2));
  const [request, setRequest] = useState("");
  const arriveTime = sp.get("arrive") || undefined;
  const leaveTime = sp.get("leave") || undefined;
  const fromFlight = Boolean(sp.get("iata") && sp.get("start"));

  const [plans, setPlans] = useState<Slot[]>([null, null, null]);
  const [source, setSource] = useState<"ai" | "guide" | null>(null);
  const [active, setActive] = useState(0);
  const [custom, setCustom] = useState<PlanDay[] | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<{ kind: "good" | "bad"; text: string; login?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const guide = destinationForIata(dest?.iata);
  const conciergeHref = guide ? `/concierge?city=${guide.slug}` : `/concierge?dest=${encodeURIComponent(dest?.label ?? "")}`;
  const plan = isPlan(plans[active]) ? (plans[active] as TripPlan) : null;
  const readyPlans = plans.filter(isPlan) as TripPlan[];

  useEffect(() => {
    const id = sp.get("plan");
    if (id) {
      fetch(`/api/plans/${encodeURIComponent(id)}`)
        .then(async (r) => ({ ok: r.ok, j: await r.json() }))
        .then(({ ok, j }) => {
          if (!ok) return setMsg({ kind: "bad", text: j.error || "Couldn't load the plan." });
          setDest({ iata: j.plan.iata ?? "", label: j.plan.city });
          setStart(j.plan.start);
          setDays(j.plan.days.length);
          setCustom(j.plan.days);
          setTitle(j.plan.title);
          setPlanId(j.plan.id);
        });
      return;
    }
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (draft && sp.get("restore") === "1") {
        setDest(draft.dest); setStart(draft.start); setDays(draft.days.length); setCustom(draft.days); setTitle(draft.title || "");
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
    } catch { /* storage unavailable */ }
    if (fromFlight) build(initialPlace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function build(place = dest) {
    if (!place) return setMsg({ kind: "bad", text: "Choose where you're going." });
    setMsg(null);
    setCustom(null);
    setPlanId(null);
    setActive(0);
    setPlans(["loading", "loading", "loading"]);
    STYLE_IDS.forEach(async (style, i) => {
      try {
        const r = await fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ style, destination: place.label, iata: place.iata, start, days, travelers, request, arriveTime, leaveTime }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Couldn't build this plan.");
        setSource(j.source);
        setPlans((p) => p.map((x, k) => (k === i ? j.plan : x)));
      } catch (e) {
        setPlans((p) => p.map((x, k) => (k === i ? { error: e instanceof Error ? e.message : "Couldn't build this plan." } : x)));
      }
    });
  }

  const startCustomizing = () => {
    if (!plan) return;
    setCustom(clone(plan.days));
    setTitle((t) => t || `${dest?.label ?? "My"} trip`);
    setMsg(null);
  };
  const editSlot = (di: number, si: number, patch: Partial<PlanSlot>) =>
    setCustom((c) => c && c.map((day, i) => (i !== di ? day : { ...day, slots: day.slots.map((s, j) => (j === si ? { ...s, ...patch } : s)) })));
  const removeSlot = (di: number, si: number) =>
    setCustom((c) => c && c.map((day, i) => (i !== di ? day : { ...day, slots: day.slots.filter((_, j) => j !== si) })));
  const addSlot = (di: number) =>
    setCustom((c) => c && c.map((day, i) => (i !== di ? day : { ...day, slots: [...day.slots, { time: "Evening", title: "My own plan", text: "" }] })));
  const replaceDay = (di: number, p: TripPlan) =>
    setCustom((c) => c && c.map((day, i) => (i !== di || !p.days[di] ? day : { ...clone(p.days[di]), day: di + 1 })));
  const swapSlot = (di: number, si: number, p: TripPlan) => {
    const cur = custom?.[di]?.slots[si];
    const alt = p.days[di]?.slots.find((s) => s.time === cur?.time) ?? p.days[di]?.slots[si];
    if (alt) editSlot(di, si, clone(alt));
  };

  const save = async (daysToSave: PlanDay[]) => {
    if (!dest) return;
    setSaving(true);
    setMsg(null);
    const body = { city: dest.label, iata: dest.iata, start, title: title || `${dest.label} trip`, days: daysToSave };
    try {
      const r = await fetch(planId ? `/api/plans/${planId}` : "/api/plans", {
        method: planId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (r.status === 401) {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ dest, start, days: daysToSave, title })); } catch { /* ignore */ }
        setMsg({ kind: "bad", text: "Sign in to save your plan. Your changes are kept.", login: true });
        return;
      }
      if (!r.ok) throw new Error(j.error || "Couldn't save.");
      setPlanId(j.id);
      if (!custom) setCustom(clone(daysToSave));
      setMsg({ kind: "good", text: "Saved to My trips." });
      router.replace(`/planner?plan=${j.id}`, { scroll: false });
    } catch (e) {
      setMsg({ kind: "bad", text: e instanceof Error ? e.message : "Couldn't save." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!planId) return;
    await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    setPlanId(null);
    setCustom(null);
    setMsg({ kind: "good", text: "Plan deleted." });
    router.replace("/planner", { scroll: false });
  };

  const BookLink = ({ s }: { s: PlanSlot }) =>
    s.book === "concierge" ? <Link href={conciergeHref} className="plan-book">Book with concierge →</Link>
    : s.book === "tour" && guide ? <Link href={`/destinations/${guide.slug}#tours`} className="plan-book">See the R Travel tour →</Link>
    : null;

  const loginHref = `/account/login?next=${encodeURIComponent("/planner?restore=1")}`;
  const flightHref = dest?.iata
    ? `/search?${new URLSearchParams({ origin: "JFK", destination: dest.iata, fromLabel: "New York (JFK)", toLabel: dest.label, departDate: start, returnDate: iso(new Date(Date.parse(start) + days * 86_400_000)), adults: String(travelers), cabin: "economy" })}`
    : null;

  return (
    <div>
      <form className="card search" onSubmit={(e) => { e.preventDefault(); build(); }}>
        {fromFlight && <div className="alert good" style={{ marginBottom: 12 }}>Planning around your flight to {dest?.label}{arriveTime ? `, arriving ${arriveTime}` : ""}.</div>}
        <div className="planner-grid">
          <AirportInput id="pl-dest" label="Destination" placeholder="Any city in the world" value={dest} onChange={setDest} />
          <div className="field">
            <label htmlFor="pl-start">Arriving</label>
            <input id="pl-start" type="date" min={iso(new Date())} value={start} disabled={Boolean(custom)} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pl-days">Days</label>
            <select id="pl-days" value={days} disabled={Boolean(custom)} onChange={(e) => setDays(Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} day{n > 1 ? "s" : ""}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pl-trav">Travelers</label>
            <input id="pl-trav" type="number" min={1} max={50} value={travelers} onChange={(e) => setTravelers(Number(e.target.value))} />
          </div>
        </div>
        <label className="input" style={{ marginTop: 10 }}>What do you want from this trip? (optional)
          <textarea className="textarea" rows={2} value={request} onChange={(e) => setRequest(e.target.value)}
            placeholder="Traveling with two kids, love food markets and beaches, no museums, one fancy dinner." />
        </label>
        {!custom && <button className="btn" style={{ marginTop: 12 }}>{readyPlans.length ? "Rebuild my 3 plans" : "Build my 3 plans"}</button>}
      </form>

      {msg && (
        <div className={`alert ${msg.kind}`} style={{ marginTop: 14 }}>
          {msg.text}
          {msg.login && <> <Link href={loginHref} style={{ color: "inherit", fontWeight: 700 }}>Sign in</Link></>}
          {msg.kind === "good" && planId && <> <Link href="/account" style={{ color: "inherit", fontWeight: 700 }}>View My trips</Link></>}
        </div>
      )}

      {!custom && plans.some(Boolean) && (
        <>
          <div className="plan-tabs" role="tablist" aria-label="Plan options">
            {plans.map((p, i) => (
              <button key={i} role="tab" aria-selected={i === active} className="card plan-tab" onClick={() => setActive(i)}>
                <span className="plan-opt">Option {i + 1}{isPlan(p) ? ` · ${p.pace}` : ""}</span>
                <b>{isPlan(p) ? p.name : STYLE_NAMES[i]}</b>
                <span className="muted" style={{ fontSize: 13 }}>
                  {p === "loading" ? "Writing your plan…" : isPlan(p) ? p.summary : p && "error" in p ? p.error : ""}
                </span>
              </button>
            ))}
          </div>
          {plans[active] === "loading" && [0, 1].map((k) => <div key={k} className="skeleton" style={{ height: 180 }} />)}
          {plan && (
            <>
              <div className="plan-actions">
                <button className="btn small" onClick={() => save(plan.days)} disabled={saving}>{saving ? "Saving…" : "Save this plan"}</button>
                <button className="btn ghost small" onClick={startCustomizing}>Customize or mix options</button>
              </div>
              <div className="plan-days">
                {plan.days.map((day, di) => (
                  <div key={di} className="card plan-day">
                    <div className="plan-day-h"><b>Day {di + 1}</b><span className="muted">{dateLabel(start, di)} · {day.theme}</span></div>
                    {day.slots.map((s, i) => (
                      <div key={i} className="plan-slot">
                        <span className="plan-time">{s.time}</span>
                        <div><b>{s.title}</b><div className="muted" style={{ fontSize: 14 }}>{s.text}</div><BookLink s={s} /></div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {custom && (
        <>
          <div className="card section" style={{ marginTop: 16 }}>
            <label className="input">Plan name
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${dest?.label ?? ""} trip`} />
            </label>
            <p className="tiny" style={{ margin: "8px 0 0" }}>
              Edit any activity, swap in another option&apos;s version, replace a whole day, or add your own plans.
            </p>
            <div className="plan-actions" style={{ marginTop: 12 }}>
              <button className="btn small" onClick={() => save(custom)} disabled={saving}>{saving ? "Saving…" : planId ? "Save changes" : "Save plan"}</button>
              {!planId && readyPlans.length > 0 && <button className="btn ghost small" onClick={() => setCustom(null)}>Back to the 3 options</button>}
              {planId && <button className="btn ghost small" onClick={remove}>Delete plan</button>}
            </div>
          </div>
          <div className="plan-days">
            {custom.map((day, di) => (
              <div key={di} className="card plan-day">
                <div className="plan-day-h" style={{ justifyContent: "space-between" }}>
                  <span><b>Day {di + 1}</b> <span className="muted">{dateLabel(start, di)}</span></span>
                  {readyPlans.length > 0 && (
                    <select className="plan-select" value="" onChange={(e) => e.target.value && replaceDay(di, readyPlans[Number(e.target.value)])} aria-label={`Replace day ${di + 1}`}>
                      <option value="">Replace whole day with…</option>
                      {readyPlans.map((p, i) => <option key={p.id} value={i}>{p.name}</option>)}
                    </select>
                  )}
                </div>
                <input className="plan-theme" value={day.theme} onChange={(e) => setCustom((c) => c && c.map((x, i) => (i === di ? { ...x, theme: e.target.value } : x)))} aria-label="Day theme" />
                {day.slots.map((s, si) => (
                  <div key={si} className="plan-slot plan-edit">
                    <select className="plan-select" value={s.time} onChange={(e) => editSlot(di, si, { time: e.target.value as PlanSlot["time"] })} aria-label="Time of day">
                      {TIMES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <div>
                      <input className="plan-input" value={s.title} onChange={(e) => editSlot(di, si, { title: e.target.value })} aria-label="Activity" />
                      <textarea className="plan-input" rows={2} value={s.text} onChange={(e) => editSlot(di, si, { text: e.target.value })} aria-label="Details" />
                      <div className="plan-row-actions">
                        {readyPlans.length > 0 && (
                          <select className="plan-select" value="" onChange={(e) => e.target.value && swapSlot(di, si, readyPlans[Number(e.target.value)])} aria-label="Swap activity">
                            <option value="">Swap with…</option>
                            {readyPlans.map((p, i) => {
                              const alt = p.days[di]?.slots.find((x) => x.time === s.time);
                              return alt ? <option key={p.id} value={i}>{p.name}: {alt.title}</option> : null;
                            })}
                          </select>
                        )}
                        <button type="button" className="linkbtn" onClick={() => removeSlot(di, si)}>Remove</button>
                        <BookLink s={s} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="linkbtn" style={{ color: "var(--brand)", marginTop: 8 }} onClick={() => addSlot(di)}>+ Add activity</button>
              </div>
            ))}
          </div>
        </>
      )}

      {dest && (plan || custom) && (
        <>
          <div className="dest-cta">
            {flightHref && !fromFlight && <Link href={flightHref} className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Find flights for these dates</Link>}
            <Link href={conciergeHref} className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Have the concierge book this plan</Link>
            {guide && <Link href={`/destinations/${guide.slug}`} className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>{guide.name} guide</Link>}
          </div>
          <p className="tiny">
            {source === "ai" ? "Plans are written by AI for your trip; " : "Plans are suggestions; "}
            check opening hours and event dates, and book popular places ahead.
          </p>
        </>
      )}
    </div>
  );
}
