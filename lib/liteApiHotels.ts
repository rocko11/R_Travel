import "server-only";
import { config } from "./config";

/**
 * Nuitee Connect / liteAPI — Hotel Rates search (self-service, single API key).
 * https://docs.liteapi.travel/reference/post_hotels-rates
 *
 * One call does city search + live pricing together (unlike Amadeus's two-step list+price
 * flow), and liteAPI's own pricing model is built for exactly R Travel's use case: a public,
 * consumer-facing resale site. The `margin` param lets us apply R Travel's markup server-side
 * instead of layering our own on top of a net rate.
 *
 * A key starting with "sand_" only ever returns sandbox (test) data regardless of host, so the
 * same client code works for both sandbox and a future production key.
 */

const HOST = "https://api.liteapi.travel/v3.0";

export class LiteApiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export interface LiteApiHotelInfo {
  id: string;
  name: string;
  mainPhoto?: string;
  address?: string;
  cityName?: string;
  rating?: number;
  stars?: number;
}

export interface LiteApiRoomRate {
  name: string;
  offerRetailRate: number;
  currency: string;
  boardName?: string;
  refundable?: boolean;
}

export interface LiteApiOffer {
  hotelId: string;
  hotel?: LiteApiHotelInfo;
  cheapest: LiteApiRoomRate;
}

/** Hotel rates search by city/country — one call returns hotel data + live priced offers. */
export async function searchCityRates(args: {
  countryCode: string;
  cityName: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency?: string;
  guestNationality?: string;
  marginPercent?: number;
}): Promise<LiteApiOffer[]> {
  if (!config.liteApiKey) return [];
  const occupancies = Array.from({ length: Math.max(1, args.rooms) }, () => ({
    adults: Math.max(1, Math.round(args.adults / Math.max(1, args.rooms))) || 1,
  }));
  const res = await fetch(`${HOST}/hotels/rates`, {
    method: "POST",
    headers: {
      "X-API-Key": config.liteApiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      countryCode: args.countryCode,
      cityName: args.cityName,
      checkin: args.checkin,
      checkout: args.checkout,
      currency: args.currency ?? "USD",
      guestNationality: args.guestNationality ?? "US",
      occupancies,
      maxRatesPerHotel: 1,
      includeHotelData: true,
      limit: 40,
      ...(args.marginPercent != null ? { margin: args.marginPercent } : {}),
    }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LiteApiError(body?.error?.message || body?.message || `liteAPI request failed (${res.status})`, res.status);
  }
  const hotelsById = new Map<string, LiteApiHotelInfo>();
  for (const h of body?.data?.hotels ?? []) {
    hotelsById.set(h.id, {
      id: h.id,
      name: h.name,
      mainPhoto: h.main_photo,
      address: h.address,
      cityName: h.city_name,
      rating: h.rating != null ? Number(h.rating) : undefined,
      stars: h.stars != null ? Number(h.stars) : undefined,
    });
  }
  const out: LiteApiOffer[] = [];
  for (const entry of body?.data?.data ?? body?.data ?? []) {
    const roomType = entry.roomTypes?.[0];
    const rate = roomType?.rates?.[0];
    if (!rate) continue;
    const total = rate.offerRetailRate?.[0]?.amount ?? rate.retailRate?.total?.[0]?.amount;
    const currency = rate.offerRetailRate?.[0]?.currency ?? rate.retailRate?.total?.[0]?.currency ?? "USD";
    if (!total) continue;
    out.push({
      hotelId: entry.hotelId,
      hotel: hotelsById.get(entry.hotelId),
      cheapest: {
        name: rate.name ?? roomType?.name ?? "Room",
        offerRetailRate: Number(total),
        currency,
        boardName: rate.boardName,
        refundable: rate.cancellationPolicies ? undefined : undefined,
      },
    });
  }
  return out;
}
