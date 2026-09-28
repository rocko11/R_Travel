import "server-only";
import type { CabinClass, CabinInfo, Offer, Place, SearchParams, Segment, Slice } from "./types";

/** Demo data: a small airport list with coordinates, used when no Duffel token is set. */
const AIRPORTS: (Place & { lat: number; lon: number; tz: number })[] = [
  { iata: "JFK", name: "John F. Kennedy Intl", city: "New York", country: "US", type: "airport", lat: 40.64, lon: -73.78, tz: -4 },
  { iata: "EWR", name: "Newark Liberty Intl", city: "New York", country: "US", type: "airport", lat: 40.69, lon: -74.17, tz: -4 },
  { iata: "LGA", name: "LaGuardia", city: "New York", country: "US", type: "airport", lat: 40.78, lon: -73.87, tz: -4 },
  { iata: "BOS", name: "Logan Intl", city: "Boston", country: "US", type: "airport", lat: 42.36, lon: -71.01, tz: -4 },
  { iata: "MIA", name: "Miami Intl", city: "Miami", country: "US", type: "airport", lat: 25.79, lon: -80.29, tz: -4 },
  { iata: "ORD", name: "O'Hare Intl", city: "Chicago", country: "US", type: "airport", lat: 41.97, lon: -87.9, tz: -5 },
  { iata: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "US", type: "airport", lat: 33.94, lon: -118.41, tz: -7 },
  { iata: "SFO", name: "San Francisco Intl", city: "San Francisco", country: "US", type: "airport", lat: 37.62, lon: -122.38, tz: -7 },
  { iata: "LAS", name: "Harry Reid Intl", city: "Las Vegas", country: "US", type: "airport", lat: 36.08, lon: -115.15, tz: -7 },
  { iata: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "CA", type: "airport", lat: 43.68, lon: -79.63, tz: -4 },
  { iata: "CUN", name: "Cancún Intl", city: "Cancún", country: "MX", type: "airport", lat: 21.04, lon: -86.87, tz: -5 },
  { iata: "LHR", name: "Heathrow", city: "London", country: "GB", type: "airport", lat: 51.47, lon: -0.45, tz: 1 },
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", type: "airport", lat: 49.01, lon: 2.55, tz: 2 },
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL", type: "airport", lat: 52.31, lon: 4.76, tz: 2 },
  { iata: "FRA", name: "Frankfurt", city: "Frankfurt", country: "DE", type: "airport", lat: 50.04, lon: 8.56, tz: 2 },
  { iata: "MAD", name: "Barajas", city: "Madrid", country: "ES", type: "airport", lat: 40.49, lon: -3.57, tz: 2 },
  { iata: "BCN", name: "El Prat", city: "Barcelona", country: "ES", type: "airport", lat: 41.3, lon: 2.08, tz: 2 },
  { iata: "FCO", name: "Fiumicino", city: "Rome", country: "IT", type: "airport", lat: 41.8, lon: 12.25, tz: 2 },
  { iata: "ATH", name: "Athens Intl", city: "Athens", country: "GR", type: "airport", lat: 37.94, lon: 23.94, tz: 3 },
  { iata: "IST", name: "Istanbul", city: "Istanbul", country: "TR", type: "airport", lat: 41.26, lon: 28.74, tz: 3 },
  { iata: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "IL", type: "airport", lat: 32.01, lon: 34.89, tz: 3 },
  { iata: "DXB", name: "Dubai Intl", city: "Dubai", country: "AE", type: "airport", lat: 25.25, lon: 55.36, tz: 4 },
  { iata: "DEL", name: "Indira Gandhi Intl", city: "Delhi", country: "IN", type: "airport", lat: 28.56, lon: 77.1, tz: 5.5 },
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "TH", type: "airport", lat: 13.69, lon: 100.75, tz: 7 },
  { iata: "SIN", name: "Changi", city: "Singapore", country: "SG", type: "airport", lat: 1.36, lon: 103.99, tz: 8 },
  { iata: "HND", name: "Haneda", city: "Tokyo", country: "JP", type: "airport", lat: 35.55, lon: 139.78, tz: 9 },
  { iata: "SYD", name: "Kingsford Smith", city: "Sydney", country: "AU", type: "airport", lat: -33.94, lon: 151.18, tz: 10 },
  { iata: "GRU", name: "Guarulhos", city: "São Paulo", country: "BR", type: "airport", lat: -23.43, lon: -46.47, tz: -3 },
  { iata: "EZE", name: "Ezeiza", city: "Buenos Aires", country: "AR", type: "airport", lat: -34.82, lon: -58.54, tz: -3 },
  { iata: "JNB", name: "O. R. Tambo", city: "Johannesburg", country: "ZA", type: "airport", lat: -26.14, lon: 28.24, tz: 2 },
];

const CARRIERS = [
  { iata: "DL", name: "Delta Air Lines", hubs: ["JFK", "LAX", "BOS"] },
  { iata: "UA", name: "United Airlines", hubs: ["EWR", "ORD", "SFO"] },
  { iata: "AA", name: "American Airlines", hubs: ["MIA", "ORD", "JFK"] },
  { iata: "B6", name: "JetBlue", hubs: ["JFK", "BOS"] },
  { iata: "BA", name: "British Airways", hubs: ["LHR"] },
  { iata: "AF", name: "Air France", hubs: ["CDG"] },
  { iata: "LH", name: "Lufthansa", hubs: ["FRA"] },
  { iata: "TK", name: "Turkish Airlines", hubs: ["IST"] },
  { iata: "LY", name: "El Al", hubs: ["TLV"] },
  { iata: "EK", name: "Emirates", hubs: ["DXB"] },
];

export function demoPlaces(query: string): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  )
    .slice(0, 8)
    .map(({ iata, name, city, country, type, lat, lon }) => ({ iata, name, city, country, type, lat, lon }));
}

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Local wall-clock ISO (no offset), matching how airlines publish times. */
function localIso(utcMs: number, tz: number) {
  const d = new Date(utcMs + tz * 3600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

function airport(iata: string) {
  return AIRPORTS.find((a) => a.iata === iata);
}

function buildSlice(
  from: string,
  to: string,
  date: string,
  r: () => number,
  carrier: (typeof CARRIERS)[number],
  stops: number
): Slice | null {
  const A = airport(from), B = airport(to);
  if (!A || !B) return null;
  // Connect through the carrier's hub if it's roughly on the way, else a big connecting hub.
  const direct = distanceKm(A, B);
  const detour = (h: (typeof AIRPORTS)[number]) => (distanceKm(A, h) + distanceKm(h, B)) / direct;
  const candidates = AIRPORTS.filter(
    (h) => h.iata !== from && h.iata !== to && distanceKm(A, h) > 300 && distanceKm(h, B) > 300
  );
  const own = candidates.filter((h) => carrier.hubs.includes(h.iata) && detour(h) < 1.25);
  const pool = own.length
    ? own
    : candidates.filter((h) => ["LHR", "CDG", "FRA", "AMS", "IST", "DXB", "ORD", "MIA", "MAD", "SIN"].includes(h.iata));
  const via = stops > 0 ? [...pool].sort((a, b) => detour(a) - detour(b))[0] : null;
  const legs = via ? [[A, via], [via, B]] : [[A, B]];
  const departLocalHour = 6 + Math.floor(r() * 16);
  const departMin = [0, 15, 30, 45][Math.floor(r() * 4)];
  let t = Date.parse(`${date}T00:00:00Z`) + (departLocalHour * 60 + departMin) * 60_000 - A.tz * 3600_000;
  const segments: Segment[] = [];
  for (const [x, y] of legs) {
    const dur = Math.round(distanceKm(x, y) / 13.5 + 35); // ~810 km/h + taxi
    segments.push({
      carrier: carrier.iata,
      carrierName: carrier.name,
      flightNumber: `${carrier.iata}${100 + Math.floor(r() * 1800)}`,
      origin: x.iata,
      destination: y.iata,
      departAt: localIso(t, x.tz),
      arriveAt: localIso(t + dur * 60_000, y.tz),
      durationMin: dur,
    });
    t += dur * 60_000 + (75 + Math.floor(r() * 150)) * 60_000; // layover
  }
  const first = segments[0], last = segments[segments.length - 1];
  const startUtc = Date.parse(first.departAt + "Z") - A.tz * 3600_000;
  const endUtc = Date.parse(last.arriveAt + "Z") - B.tz * 3600_000;
  return {
    origin: from,
    destination: to,
    departAt: first.departAt,
    arriveAt: last.arriveAt,
    durationMin: Math.round((endUtc - startUtc) / 60_000),
    stops: segments.length - 1,
    segments,
  };
}

export function demoOffers(q: SearchParams): Offer[] {
  const A = airport(q.origin), B = airport(q.destination);
  if (!A || !B || q.origin === q.destination) return [];
  const km = distanceKm(A, B);
  const cabinMult = { economy: 1, premium_economy: 1.7, business: 3.8, first: 6 }[q.cabin];
  const paxWeight = q.adults + q.childAges.reduce((s, a) => s + (a < 2 ? 0.1 : 0.75), 0);
  const offers: Offer[] = [];
  // Same seed for every cabin, so the same flights appear in each class.
  const r = rng(`${q.origin}${q.destination}${q.departDate}${q.returnDate ?? ""}`);
  for (let i = 0; i < 14; i++) {
    const carrier = CARRIERS[Math.floor(r() * CARRIERS.length)];
    const stops = km < 1500 ? (r() < 0.8 ? 0 : 1) : r() < 0.45 ? 0 : 1;
    const out = buildSlice(q.origin, q.destination, q.departDate, r, carrier, stops);
    const back = q.returnDate ? buildSlice(q.destination, q.origin, q.returnDate, r, carrier, stops) : null;
    if (!out || (q.returnDate && !back)) continue;
    const perPax = (60 + km * 0.07) * (0.8 + r() * 0.6) * (stops ? 0.85 : 1) * cabinMult * (back ? 1.8 : 1);
    const refundable = r() < 0.3;
    const bagRoll = r();
    offers.push({
      id: `demo_${Buffer.from(JSON.stringify({ q, i })).toString("base64url")}`,
      baseAmount: Math.round(perPax * paxWeight * (refundable ? 1.25 : 1) * 100) / 100,
      currency: "USD",
      owner: { name: carrier.name, iata: carrier.iata },
      slices: back ? [out, back] : [out],
      passengers: [
        ...Array.from({ length: q.adults }, (_, n) => ({ id: `pas_demo_a${n}`, type: "adult" as const })),
        ...q.childAges.map((age, n) => ({
          id: `pas_demo_c${n}`,
          type: age < 2 ? ("infant_without_seat" as const) : ("child" as const),
          age,
        })),
      ],
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      checkedBags: bagRoll < 0.4 || cabinMult > 1 ? (q.cabin === "first" ? 2 : 1) : 0,
      carryOnBags: 1,
      cabinClass: q.cabin,
      emissionsKg: Math.round(km * 0.09 * cabinMult ** 0.6 * (back ? 2 : 1)),
      refundable,
      changeable: refundable || r() < 0.5,
    });
  }
  return withDemoCabins(offers, q.cabin);
}

const DEMO_CABIN: Record<CabinClass, CabinInfo> = {
  economy: { cabinClass: "economy", marketingName: "Economy", seatType: "Standard seat", pitch: "31", legroom: "standard", wifi: "paid", power: true },
  premium_economy: { cabinClass: "premium_economy", marketingName: "Premium Economy", seatType: "Recliner", pitch: "38", legroom: "more", wifi: "paid", power: true },
  business: { cabinClass: "business", marketingName: "Business", seatType: "Lie-flat bed", pitch: "78", legroom: "more", wifi: "free", power: true },
  first: { cabinClass: "first", marketingName: "First", seatType: "Private suite", pitch: "82", legroom: "more", wifi: "free", power: true },
};
const DEMO_AIRCRAFT = [["Boeing 787-9", "789"], ["Airbus A350-900", "359"], ["Boeing 777-300ER", "77W"], ["Airbus A321neo", "32Q"], ["Boeing 737 MAX 8", "7M8"]];

/** Add cabin and aircraft details to demo segments (deterministic per flight number). */
export function withDemoCabins(offers: Offer[], cabin: CabinClass): Offer[] {
  return offers.map((o) => ({
    ...o,
    slices: o.slices.map((s) => ({
      ...s,
      fareBrand: { economy: "Standard", premium_economy: "Premium", business: "Business Flex", first: "First" }[cabin],
      segments: s.segments.map((g) => {
        const n = Number(g.flightNumber.replace(/\D/g, "")) || 0;
        const [name, code] = DEMO_AIRCRAFT[g.durationMin > 300 ? n % 3 : 3 + (n % 2)];
        return { ...g, aircraft: name, aircraftCode: code, cabin: DEMO_CABIN[cabin] };
      }),
    })),
  }));
}

export function demoOffer(id: string): Offer | null {
  if (!id.startsWith("demo_")) return null;
  try {
    const { q, i } = JSON.parse(Buffer.from(id.slice(5), "base64url").toString());
    return demoOffers(q).find((o) => o.id === id) ?? demoOffers(q)[i] ?? null;
  } catch {
    return null;
  }
}
