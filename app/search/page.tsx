"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SearchForm from "../components/SearchForm";
import { SliceRow } from "../components/Itinerary";
import WeatherStrip from "../components/WeatherStrip";
import CabinPanel from "../components/CabinPanel";
import { duration, money } from "@/lib/format";
import type { CabinClass, PricedOffer } from "@/lib/types";

type Sort = "best" | "cheapest" | "fastest";

function totalMinutes(o: PricedOffer) {
  return o.slices.reduce((s, x) => s + x.durationMin, 0);
}

function Results() {
  const sp = useSearchParams();
  const router = useRouter();
  const key = sp.toString();
  const [offers, setOffers] = useState<PricedOffer[] | null>(null);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<Sort>("best");
  const [maxStops, setMaxStops] = useState<number>(2);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [bagsOnly, setBagsOnly] = useState(false);

  useEffect(() => {
    setOffers(null);
    setError("");
    const ctl = new AbortController();
    fetch(`/api/search?${key}`, { signal: ctl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Search failed.");
        setOffers(j.offers);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctl.abort();
  }, [key]);

  const airlines = useMemo(() => {
    const m = new Map<string, { name: string; min: number }>();
    for (const o of offers ?? []) {
      const cur = m.get(o.owner.iata);
      if (!cur || o.total < cur.min) m.set(o.owner.iata, { name: o.owner.name, min: o.total });
    }
    return [...m.entries()].sort((a, b) => a[1].min - b[1].min);
  }, [offers]);

  const filtered = useMemo(() => {
    const list = (offers ?? []).filter(
      (o) =>
        o.slices.every((s) => s.stops <= maxStops) &&
        !hidden.has(o.owner.iata) &&
        (!bagsOnly || o.checkedBags > 0)
    );
    if (!list.length) return list;
    const minP = Math.min(...list.map((o) => o.total)), maxP = Math.max(...list.map((o) => o.total));
    const minT = Math.min(...list.map(totalMinutes)), maxT = Math.max(...list.map(totalMinutes));
    const score = (o: PricedOffer) =>
      0.65 * ((o.total - minP) / (maxP - minP || 1)) + 0.35 * ((totalMinutes(o) - minT) / (maxT - minT || 1));
    const by = {
      cheapest: (a: PricedOffer, b: PricedOffer) => a.total - b.total,
      fastest: (a: PricedOffer, b: PricedOffer) => totalMinutes(a) - totalMinutes(b),
      best: (a: PricedOffer, b: PricedOffer) => score(a) - score(b),
    }[sort];
    return [...list].sort(by);
  }, [offers, maxStops, hidden, bagsOnly, sort]);

  const top = useMemo(() => {
    const l = filtered;
    if (!l.length) return null;
    const cheapest = [...l].sort((a, b) => a.total - b.total)[0];
    const fastest = [...l].sort((a, b) => totalMinutes(a) - totalMinutes(b))[0];
    return { cheapest, fastest };
  }, [filtered]);

  const extraLegsRaw = (sp.get("extraLegs") || "").split(",").filter(Boolean);
  const extraLegsLabels = (sp.get("extraLegsLabels") || "").split(",");
  const initial = {
    from: sp.get("origin") ? { iata: sp.get("origin")!, label: sp.get("fromLabel") || sp.get("origin")! } : null,
    to: sp.get("destination") ? { iata: sp.get("destination")!, label: sp.get("toLabel") || sp.get("destination")! } : null,
    departDate: sp.get("departDate") ?? undefined,
    returnDate: sp.get("returnDate") ?? "",
    extraLegs: extraLegsRaw.length
      ? extraLegsRaw.map((chunk, i) => {
          const [origin, destination, date] = chunk.split("|");
          const [fromLabel, toLabel] = (extraLegsLabels[i] || "").split("~");
          return {
            from: origin ? { iata: origin, label: fromLabel || origin } : null,
            to: destination ? { iata: destination, label: toLabel || destination } : null,
            date: date || "",
          };
        })
      : undefined,
    adults: Number(sp.get("adults") || 1),
    childAges: (sp.get("childAges") || "").split(",").filter(Boolean).map(Number),
    cabin: (sp.get("cabin") || "economy") as CabinClass,
  };

  return (
    <main className="wrap">
      <div style={{ paddingTop: 20 }}>
        <SearchForm key={key} initial={initial} />
      </div>

      <div className="results">
        <aside className="card filters" aria-label="Filters">
          <h3>Stops</h3>
          {[
            [2, "Any"],
            [1, "1 stop or fewer"],
            [0, "Nonstop only"],
          ].map(([v, l]) => (
            <label className="check" key={v}>
              <input type="radio" name="stops" checked={maxStops === v} onChange={() => setMaxStops(v as number)} /> {l}
            </label>
          ))}
          <h3>Bags</h3>
          <label className="check">
            <input type="checkbox" checked={bagsOnly} onChange={(e) => setBagsOnly(e.target.checked)} /> Checked bag included
          </label>
          {airlines.length > 0 && <h3>Airlines</h3>}
          {airlines.map(([iata, a]) => (
            <label className="check" key={iata}>
              <input
                type="checkbox"
                checked={!hidden.has(iata)}
                onChange={(e) => {
                  const n = new Set(hidden);
                  if (e.target.checked) n.delete(iata);
                  else n.add(iata);
                  setHidden(n);
                }}
              />
              <span style={{ flex: 1 }}>{a.name}</span>
              <span className="tiny">{money(a.min, offers![0].currency)}</span>
            </label>
          ))}
        </aside>

        <section aria-live="polite">
          {sp.get("origin") && sp.get("destination") && (
            <WeatherStrip origin={sp.get("origin")!} destination={sp.get("destination")!} date={sp.get("departDate") ?? undefined} />
          )}
          {sp.get("destination") && sp.get("departDate") && (
            <a
              className="card plan-cta"
              href={`/planner?${new URLSearchParams({
                iata: sp.get("destination")!,
                label: sp.get("toLabel") || sp.get("destination")!,
                start: sp.get("departDate")!,
                days: String(
                  sp.get("returnDate")
                    ? Math.max(1, Math.min(10, Math.round((Date.parse(sp.get("returnDate")!) - Date.parse(sp.get("departDate")!)) / 86_400_000)))
                    : 3
                ),
                travelers: String(Number(sp.get("adults") || 1) + (sp.get("childAges") || "").split(",").filter(Boolean).length),
              })}`}
            >
              <b>Plan your days in {(sp.get("toLabel") || sp.get("destination"))!.replace(/ \(.*\)$/, "")}</b>
              <span className="muted">3 day-by-day plans for your dates. Save, edit or mix them. →</span>
            </a>
          )}
          {top && (
            <div className="card sortbar" role="group" aria-label="Sort">
              <button aria-pressed={sort === "best"} onClick={() => setSort("best")}>
                <b>Best</b><span>Price and time balanced</span>
              </button>
              <button aria-pressed={sort === "cheapest"} onClick={() => setSort("cheapest")}>
                <b>Cheapest</b><span>{money(top.cheapest.total, top.cheapest.currency)}</span>
              </button>
              <button aria-pressed={sort === "fastest"} onClick={() => setSort("fastest")}>
                <b>Fastest</b><span>{duration(totalMinutes(top.fastest))} total</span>
              </button>
            </div>
          )}

          {error && <div className="card state">{error}</div>}
          {!offers && !error && (
            <>
              <p className="muted" style={{ marginTop: 0 }}>Searching airlines…</p>
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" />)}
            </>
          )}
          {offers && !filtered.length && (
            <div className="card state">
              {offers.length ? "No flights match these filters." : "No flights found for these dates. Try nearby dates or airports."}
            </div>
          )}

          {filtered.map((o) => {
            const comparisonOnly = o.id.startsWith("lite_");
            return (
              <article className="card offer" key={o.id}>
                <div className="offer-legs">
                  {o.slices.map((s, i) => (
                    <SliceRow key={i} slice={s} iata={o.owner.iata} logo={o.owner.logo} showDate={o.slices.length > 1} />
                  ))}
                  <div className="chips">
                    <span className="chip">{o.owner.name}</span>
                    {o.checkedBags > 0 && <span className="chip good">Checked bag included</span>}
                    {o.refundable && <span className="chip good">Refundable</span>}
                    {!o.refundable && o.changeable && <span className="chip">Changeable</span>}
                    {comparisonOnly && <span className="chip" title="Shown for price comparison; book the closest Select-able fare instead.">Price preview only</span>}
                  </div>
                  <CabinPanel offer={o} />
                </div>
                <div className="offer-price">
                  <div>
                    <div className="price">{money(o.total, o.currency)}</div>
                    <div className="tiny">
                      total for {o.passengers.length} traveler{o.passengers.length > 1 ? "s" : ""}, all taxes and fees
                    </div>
                  </div>
                  <button
                    className="btn small"
                    disabled={comparisonOnly}
                    title={comparisonOnly ? "This fare is shown for comparison and can't be booked yet." : undefined}
                    onClick={() => router.push(`/book/${encodeURIComponent(o.id)}?t=${o.total}`)}
                  >
                    {comparisonOnly ? "Not bookable yet" : "Select"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="wrap state">Loading…</main>}>
      <Results />
    </Suspense>
  );
}
