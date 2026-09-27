import { day, dayShift, duration, time } from "@/lib/format";
import type { Slice } from "@/lib/types";

export function CarrierLogo({ iata, logo }: { iata: string; logo?: string }) {
  return (
    <div className="logo" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo ? <img src={logo} alt="" /> : iata}
    </div>
  );
}

export function SliceRow({ slice, iata, logo, showDate }: { slice: Slice; iata: string; logo?: string; showDate?: boolean }) {
  const shift = dayShift(slice.departAt, slice.arriveAt);
  const via = slice.segments.slice(0, -1).map((s) => s.destination).join(", ");
  return (
    <div className="leg">
      <CarrierLogo iata={iata} logo={logo} />
      <div className="leg-line">
        <div>
          <div className="leg-time">{time(slice.departAt)}</div>
          <div className="leg-code">{slice.origin}{showDate ? ` · ${day(slice.departAt)}` : ""}</div>
        </div>
        <div className="leg-mid">
          {duration(slice.durationMin)}
          <div className="bar">
            {slice.segments.slice(0, -1).map((_, i) => (
              <i key={i} style={{ left: `${((i + 1) / slice.segments.length) * 100}%` }} />
            ))}
          </div>
          {slice.stops === 0 ? <span className="nonstop">Nonstop</span> : `${slice.stops} stop${slice.stops > 1 ? "s" : ""} · ${via}`}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="leg-time">
            {time(slice.arriveAt)}
            {shift > 0 && <sup>+{shift}</sup>}
          </div>
          <div className="leg-code">{slice.destination}</div>
        </div>
      </div>
    </div>
  );
}

export function SliceDetail({ slice }: { slice: Slice }) {
  return (
    <div>
      {slice.segments.map((s, i) => {
        const next = slice.segments[i + 1];
        const layover = next ? Math.round((Date.parse(next.departAt + "Z") - Date.parse(s.arriveAt + "Z")) / 60000) : 0;
        return (
          <div key={i} className="seg-detail">
            {day(s.departAt)} · {s.flightNumber} {s.carrierName} · {s.origin} {time(s.departAt)} → {s.destination} {time(s.arriveAt)} · {duration(s.durationMin)}
            {s.aircraft ? ` · ${s.aircraft}` : ""}
            {next && <div className="tiny">Layover in {s.destination}{layover > 0 ? ` · ${duration(layover)}` : ""}</div>}
          </div>
        );
      })}
    </div>
  );
}
