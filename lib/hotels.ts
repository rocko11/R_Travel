import { DESTINATIONS, destinationBySlug, type Destination } from "./destinations";

/**
 * Hotel browsing and pricing. Pure functions, safe in the browser.
 * Nightly rates are 2026 market-average estimates per tier, by room type.
 * R Travel doesn't have a live hotel supply connection yet — a request
 * here is sourced and confirmed by the team, same as concierge bookings.
 */

export type HotelTier = "Luxury" | "Mid-range" | "Value";
export type RoomType = "standard" | "deluxe" | "suite";

export const ROOM_LABEL: Record<RoomType, string> = {
  standard: "Standard room",
  deluxe: "Deluxe room",
  suite: "Suite",
};
const ROOM_MULT: Record<RoomType, number> = { standard: 1, deluxe: 1.5, suite: 2.6 };

// USD per room, per night, by tier, at the "standard" room type.
const TIER_RATE: Record<HotelTier, [number, number]> = {
  Luxury: [450, 900],
  "Mid-range": [180, 320],
  Value: [80, 150],
};

export interface HotelOption {
  name: string;
  area: string;
  tier: HotelTier;
  /** Real photo URL, present only for a live-priced hotel (liteAPI/Amadeus). */
  photo?: string;
  /** Real star rating (1-5), present only for a live-priced hotel. */
  stars?: number;
}

/** The curated guide's hotel list for a destination slug, or none if there's no guide match. */
export function hotelsForSlug(slug?: string): HotelOption[] {
  if (!slug) return [];
  return destinationBySlug(slug)?.hotels ?? [];
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

const LUXURY_NAMES = ["The Grand {city}", "{city} Palace Hotel", "The Sovereign {city}", "Villa Aurelia {city}", "The Meridian {city}"];
const MID_NAMES = ["{city} Central Hotel", "Hotel {city} Plaza", "The Traveler's Inn {city}", "{city} Garden Hotel", "Hotel Bellevue {city}"];
const VALUE_NAMES = ["{city} Budget Inn", "EasyStay {city}", "{city} Rooms & Suites", "The Backpacker {city}", "SimpleStay {city}"];
const AREAS = ["City Center", "Old Town", "Downtown", "Near the Airport", "Waterfront District", "Business District", "Historic Quarter", "Station Area"];

const fill = (tpl: string, city: string) => tpl.replace("{city}", city);

/**
 * Stand-in hotel inventory for a destination that has no R Travel guide yet, so every
 * search still returns choosable options — same idea as the demo flight generator, seeded
 * so the same destination always shows the same list. Replace with real supply once connected.
 */
function syntheticHotels(city: string, seed: string): HotelOption[] {
  const r = rng(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const used = new Set<string>();
  const make = (tier: HotelTier, names: string[]): HotelOption => {
    let name = fill(pick(names), city);
    while (used.has(name)) name = `${fill(pick(names), city)} II`;
    used.add(name);
    return { name, area: pick(AREAS), tier };
  };
  return [make("Luxury", LUXURY_NAMES), make("Mid-range", MID_NAMES), make("Mid-range", MID_NAMES), make("Value", VALUE_NAMES), make("Value", VALUE_NAMES)];
}

/** Every choosable hotel for a destination: R Travel's own guide picks first, filled out with stand-in options. */
export function hotelOptionsFor(dest: { slug?: string; code: string; city: string }): HotelOption[] {
  const curated = hotelsForSlug(dest.slug);
  const seen = new Set(curated.map((h) => h.name));
  const filler = syntheticHotels(dest.city, dest.code).filter((h) => !seen.has(h.name));
  return [...curated, ...filler].slice(0, 8);
}

/** Find a destination guide by its display name (case-insensitive), for free-text city input. */
function destinationByName(name: string): Destination | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return DESTINATIONS.find((d) => n === d.name.toLowerCase() || n.startsWith(`${d.name.toLowerCase()},`) || n === `${d.name.toLowerCase()}, ${d.country.toLowerCase()}`);
}

/** Find a destination guide by IATA city or airport code (e.g. "CDG", "PAR", "par"). */
function destinationByCode(code: string): Destination | undefined {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return undefined;
  return DESTINATIONS.find((d) => d.iata.includes(c) || d.mainAirport === c);
}

/**
 * Match a destination guide from free-text search input: a bare or trailing airport/city
 * code ("CDG", "Paris (CDG)") takes priority, otherwise falls back to matching the name.
 */
export function matchDestination(input: string): Destination | undefined {
  const raw = input.trim();
  if (!raw) return undefined;
  const trailingCode = raw.match(/\(([A-Za-z]{3})\)\s*$/);
  if (trailingCode) {
    const byCode = destinationByCode(trailingCode[1]);
    if (byCode) return byCode;
  }
  if (/^[A-Za-z]{3}$/.test(raw)) {
    const byCode = destinationByCode(raw);
    if (byCode) return byCode;
  }
  return destinationByName(raw);
}

export interface HotelEstimate {
  hotel: HotelOption;
  low: number;
  high: number;
  /** True when this is a real live-priced rate (liteAPI or Amadeus), not a synthetic estimate. */
  live?: boolean;
  /** Present only when this exact rate can be booked online right now (liteAPI only). */
  offerId?: string;
}

/** One price estimate per available hotel: per room, for the whole stay. */
export function estimateHotels(dest: { slug?: string; code: string; city: string } | undefined, nights: number, room: RoomType): HotelEstimate[] {
  if (!dest) return [];
  const mult = ROOM_MULT[room];
  return hotelOptionsFor(dest).map((hotel) => {
    const [lo, hi] = TIER_RATE[hotel.tier];
    const round = (n: number) => Math.round(n / 10) * 10;
    return { hotel, low: round(lo * mult * nights), high: round(hi * mult * nights) };
  });
}
