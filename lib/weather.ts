import "server-only";
import { places } from "./provider";

/**
 * Weather from Open-Meteo. Free without a key for non-commercial use; for the live
 * business set OPEN_METEO_API_KEY (paid plan) and requests go to the customer endpoint.
 */

export interface Weather {
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

const WMO: [number[], string, string][] = [
  [[0], "☀️", "Clear"],
  [[1], "🌤️", "Mostly clear"],
  [[2], "⛅", "Partly cloudy"],
  [[3], "☁️", "Cloudy"],
  [[45, 48], "🌫️", "Fog"],
  [[51, 53, 55, 56, 57], "🌦️", "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "🌧️", "Rain"],
  [[71, 73, 75, 77, 85, 86], "❄️", "Snow"],
  [[95, 96, 99], "⛈️", "Thunderstorms"],
];

function describe(code: number) {
  const hit = WMO.find(([codes]) => codes.includes(code));
  return hit ? { icon: hit[1], label: hit[2] } : { icon: "🌡️", label: "—" };
}

async function coordsFor(iata: string) {
  const list = await places(iata);
  const p = list.find((x) => x.iata === iata) ?? list[0];
  if (!p || p.lat == null || p.lon == null) return null;
  return { lat: p.lat, lon: p.lon, city: p.city };
}

export async function weatherFor(iata: string, date?: string): Promise<Weather | null> {
  const c = await coordsFor(iata);
  if (!c) return null;
  const key = process.env.OPEN_METEO_API_KEY;
  const base = key ? "https://customer-api.open-meteo.com/v1/forecast" : "https://api.open-meteo.com/v1/forecast";
  const q = new URLSearchParams({
    latitude: c.lat.toFixed(3),
    longitude: c.lon.toFixed(3),
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    timezone: "auto",
    forecast_days: "16",
  });
  if (key) q.set("apikey", key);
  const res = await fetch(`${base}?${q}`, { next: { revalidate: 1800 } });
  if (!res.ok) return null;
  const j = await res.json();

  const i = date ? (j.daily?.time as string[] | undefined)?.indexOf(date) ?? -1 : -1;
  if (i >= 0) {
    const d = describe(j.daily.weather_code[i]);
    return {
      iata, city: c.city, kind: "forecast", date, ...d,
      high: Math.round(j.daily.temperature_2m_max[i]),
      low: Math.round(j.daily.temperature_2m_min[i]),
    };
  }
  // Travel date beyond the 16-day forecast: show conditions right now.
  const d = describe(j.current.weather_code);
  return { iata, city: c.city, kind: "now", ...d, temp: Math.round(j.current.temperature_2m) };
}
