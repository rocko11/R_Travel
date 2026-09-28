"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { money, CABIN_LABEL, duration } from "@/lib/format";
import { flightKey } from "@/lib/flightKey";
import type { CabinInfo, PricedOffer, Segment } from "@/lib/types";

const WIFI: Record<string, string> = { free: "Free Wi-Fi", paid: "Wi-Fi (paid)", yes: "Wi-Fi", no: "No Wi-Fi" };
const CLASSES = ["economy", "premium_economy", "business", "first"] as const;

const SEAT: Record<string, string> = {
  standard: "Standard seat",
  recliner: "Recliner",
  angle_flat: "Angled lie-flat seat",
  full_flat: "Lie-flat bed",
  full_flat_pod: "Lie-flat pod with aisle access",
  suite: "Private suite",
};
function seatLabel(t?: string) {
  if (!t) return undefined;
  if (SEAT[t]) return SEAT[t];
  const s = t.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function legroomLabel(l?: string) {
  if (!l || l === "n/a") return undefined;
  if (l === "more") return "More legroom";
  if (l === "less") return "Less legroom";
  if (l === "standard") return "Standard legroom";
  return l;
}

function cabinFacts(c?: CabinInfo) {
  if (!c) return [];
  return [
    seatLabel(c.seatType),
    c.pitch ? `${c.pitch}" seat pitch` : undefined,
    legroomLabel(c.legroom),
    c.wifi ? WIFI[c.wifi] : undefined,
    c.power === true ? "Power outlet" : c.power === false ? "No power outlet" : undefined,
  ].filter(Boolean) as string[];
}

function SegmentCard({ g }: { g: Segment }) {
  const facts = cabinFacts(g.cabin);
  return (
    <div className="cab-seg">
      <div className="cab-seg-head">
        <b>{g.flightNumber.replace(/^([A-Z0-9]{2})(\d)/, "$1 $2")}</b> · {g.origin} → {g.destination} · {duration(g.durationMin)}
      </div>
      <div className="cab-plane">
        <span aria-hidden>✈</span> {g.aircraft ?? "Aircraft not announced yet"}
        {g.aircraftCode ? <span className="tiny"> ({g.aircraftCode})</span> : null}
        {g.operatedBy ? <span className="tiny"> · operated by {g.operatedBy}</span> : null}
      </div>
      <div className="cab-name">{g.cabin?.marketingName ?? (g.cabin?.cabinClass ? CABIN_LABEL[g.cabin.cabinClass] : "Cabin")}</div>
      {facts.length ? (
        <ul className="cab-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>
      ) : (
        <div className="tiny">The airline hasn&apos;t shared seat and amenity details for this flight.</div>
      )}
    </div>
  );
}

function fareFacts(o: PricedOffer) {
  const f: string[] = [];
  const brand = o.slices[0]?.fareBrand;
  if (brand) f.push(`Fare: ${brand}`);
  if (o.carryOnBags != null) f.push(`${o.carryOnBags} carry-on bag${o.carryOnBags === 1 ? "" : "s"}`);
  f.push(o.checkedBags ? `${o.checkedBags} checked bag${o.checkedBags === 1 ? "" : "s"}` : "No checked bag");
  f.push(o.refundable ? `Refundable${o.refundPenalty ? ` (fee ${money(o.refundPenalty, o.currency)})` : ""}` : "Non-refundable");
  f.push(o.changeable ? `Changes allowed${o.changePenalty ? ` (fee ${money(o.changePenalty, o.currency)})` : ""}` : "No changes");
  if (o.emissionsKg) f.push(`~${Math.round(o.emissionsKg).toLocaleString()} kg CO₂`);
  return f;
}

/** Row value for the class comparison table. */
function firstCabin(o: PricedOffer) {
  return o.slices[0]?.segments[0]?.cabin;
}

export default function CabinPanel({ offer, allowCompare = true, startOpen = false }: { offer: PricedOffer; allowCompare?: boolean; startOpen?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(startOpen);
  const [cmp, setCmp] = useState<Record<string, PricedOffer | null> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const compare = async () => {
    setLoading(true);
    setErr("");
    try {
      const q = new URLSearchParams(sp.toString());
      q.set("key", flightKey(offer));
      const r = await fetch(`/api/cabins?${q}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't load other classes.");
      setCmp(j.cabins);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load other classes.");
    } finally {
      setLoading(false);
    }
  };

  const cols = cmp ? CLASSES.filter((c) => cmp[c]) : [];
  const rows: [string, (o: PricedOffer) => string][] = [
    ["Total price", (o) => money(o.total, o.currency)],
    ["Cabin", (o) => firstCabin(o)?.marketingName ?? CABIN_LABEL[o.cabinClass ?? "economy"]],
    ["Seat", (o) => seatLabel(firstCabin(o)?.seatType) ?? "—"],
    ["Seat pitch", (o) => (firstCabin(o)?.pitch ? `${firstCabin(o)!.pitch}"` : "—")],
    ["Legroom", (o) => legroomLabel(firstCabin(o)?.legroom) ?? "—"],
    ["Wi-Fi", (o) => (firstCabin(o)?.wifi ? WIFI[firstCabin(o)!.wifi!] : "—")],
    ["Power", (o) => (firstCabin(o)?.power == null ? "—" : firstCabin(o)!.power ? "Yes" : "No")],
    ["Carry-on", (o) => (o.carryOnBags != null ? String(o.carryOnBags) : "—")],
    ["Checked bags", (o) => String(o.checkedBags)],
    ["Refundable", (o) => (o.refundable ? "Yes" : "No")],
    ["Changes", (o) => (o.changeable ? "Allowed" : "No")],
    ["Fare", (o) => o.slices[0]?.fareBrand ?? "—"],
  ];

  return (
    <div className="cab">
      <button type="button" className="cab-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? "Hide plane and cabin details ▲" : "Plane and cabin details ▼"}
      </button>
      {open && (
        <div className="cab-body">
          {offer.slices.map((s, i) => (
            <div key={i}>
              {offer.slices.length > 1 && <div className="cab-dir">{i === 0 ? "Outbound" : "Return"}</div>}
              <div className="cab-segs">{s.segments.map((g, j) => <SegmentCard key={j} g={g} />)}</div>
            </div>
          ))}
          <ul className="cab-fare">{fareFacts(offer).map((f) => <li key={f}>{f}</li>)}</ul>

          {allowCompare && !cmp && (
            <button type="button" className="btn ghost small" onClick={compare} disabled={loading}>
              {loading ? "Checking every class…" : "Compare all classes on this flight"}
            </button>
          )}
          {err && <div className="alert bad" style={{ marginTop: 10 }}>{err}</div>}
          {cmp && cols.length === 0 && <p className="tiny">No other classes are for sale on this flight.</p>}
          {cmp && cols.length > 0 && (
            <div className="cab-table-wrap">
              <table className="cab-table">
                <thead>
                  <tr>
                    <th />
                    {cols.map((c) => <th key={c}>{CABIN_LABEL[c]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, fn]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {cols.map((c) => <td key={c}>{fn(cmp[c]!)}</td>)}
                    </tr>
                  ))}
                  <tr>
                    <th />
                    {cols.map((c) => (
                      <td key={c}>
                        <button
                          type="button"
                          className="btn small"
                          onClick={() => router.push(`/book/${encodeURIComponent(cmp[c]!.id)}?t=${cmp[c]!.total}`)}
                        >
                          Select
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {CLASSES.filter((c) => !cmp[c]).length > 0 && (
                <p className="tiny">
                  Not sold on this flight: {CLASSES.filter((c) => !cmp[c]).map((c) => CABIN_LABEL[c]).join(", ")}.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
