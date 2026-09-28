"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { destinationForIata } from "@/lib/destinations";

interface W {
  iata: string;
  city: string;
  kind: "forecast" | "now";
  date?: string;
  icon: string;
  label: string;
  high?: number;
  low?: number;
  temp?: number;
}

function useWeather(iata?: string, date?: string) {
  const [w, setW] = useState<W | null | undefined>(undefined);
  useEffect(() => {
    if (!iata) return;
    const q = new URLSearchParams({ iata });
    if (date) q.set("date", date);
    fetch(`/api/weather?${q}`)
      .then((r) => r.json())
      .then((j) => setW(j.weather))
      .catch(() => setW(null));
  }, [iata, date]);
  return w;
}

function Cell({ w, role }: { w: W | null | undefined; role: string }) {
  if (w === undefined) return <div className="wx"><span className="wx-icon wx-load" /> <span className="tiny">{role}…</span></div>;
  if (!w) return null;
  return (
    <div className="wx" title={w.label}>
      <span className="wx-icon" aria-hidden>{w.icon}</span>
      <div>
        <div className="wx-city">{w.city} <span className="tiny">({w.iata})</span></div>
        <div className="tiny">
          {w.kind === "forecast"
            ? `${w.label} · ${w.high}° / ${w.low}°F on ${new Date(w.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
            : `${w.label} · ${w.temp}°F now`}
        </div>
      </div>
    </div>
  );
}

/** Weather at departure (on the departure date) and destination (on arrival day). */
export default function WeatherStrip({ origin, destination, date }: { origin: string; destination: string; date?: string }) {
  const a = useWeather(origin, date);
  const b = useWeather(destination, date);
  const guide = destinationForIata(destination);
  return (
    <div className="card wx-strip">
      <Cell w={a} role="Departure" />
      <span className="wx-arrow" aria-hidden>→</span>
      <Cell w={b} role="Destination" />
      <a className="wx-credit" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather data by Open-Meteo.com</a>
      {guide && (
        <Link href={`/destinations/${guide.slug}`} className="wx-guide">
          Things to do in {guide.name} →
        </Link>
      )}
    </div>
  );
}
