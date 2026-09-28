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
}

/** The curated guide's hotel list for a destination slug, or none if there's no guide match. */
export function hotelsForSlug(slug?: string): HotelOption[] {
  if (!slug) return [];
  return destinationBySlug(slug)?.hotels ?? [];
}

/** Find a destination guide by its display name (case-insensitive), for free-text city input. */
export function destinationByName(name: string): Destination | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  return DESTINATIONS.find((d) => n === d.name.toLowerCase() || n.startsWith(`${d.name.toLowerCase()},`) || n === `${d.name.toLowerCase()}, ${d.country.toLowerCase()}`);
}

export interface HotelEstimate {
  hotel: HotelOption;
  low: number;
  high: number;
}

/** One price estimate per hotel in the guide: per room, for the whole stay. */
export function estimateHotels(slug: string | undefined, nights: number, room: RoomType): HotelEstimate[] {
  const mult = ROOM_MULT[room];
  return hotelsForSlug(slug).map((hotel) => {
    const [lo, hi] = TIER_RATE[hotel.tier];
    const round = (n: number) => Math.round(n / 10) * 10;
    return { hotel, low: round(lo * mult * nights), high: round(hi * mult * nights) };
  });
}
