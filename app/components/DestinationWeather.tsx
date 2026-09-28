"use client";

import { useEffect, useState } from "react";

export default function DestinationWeather({ iata }: { iata: string }) {
  const [w, setW] = useState<{ icon: string; label: string; temp?: number } | null>(null);
  useEffect(() => {
    fetch(`/api/weather?iata=${iata}`)
      .then((r) => r.json())
      .then((j) => setW(j.weather))
      .catch(() => {});
  }, [iata]);
  if (!w) return null;
  return (
    <span className="dest-wx">
      <span aria-hidden>{w.icon}</span> {w.temp}°F · {w.label} right now{" "}
      <a className="wx-credit" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">(Weather data by Open-Meteo.com)</a>
    </span>
  );
}
