import "server-only";
import { config } from "./config";

/**
 * Amadeus for Developers — Hotel List + Hotel Search (self-service, OAuth2 client credentials).
 * https://developers.amadeus.com/self-service/category/hotels
 *
 * Flow: token -> hotelsByCity (get hotelIds for a city) -> hotelOffers (price those hotels for
 * the requested dates). Only search is implemented — booking still goes through R Travel's own
 * "request a quote" flow, same as today, since Amadeus's Booking API needs a separate contracted
 * payment/guarantee setup per supplier.
 *
 * Test-environment credentials (AMADEUS_CLIENT_ID/SECRET) are free and self-serve at
 * developers.amadeus.com — no sales call needed. Production access needs the app submitted for
 * approval. Until credentials are set, hotel search falls back to R Travel's synthetic estimates.
 */

const HOST = config.amadeusEnv === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

export class AmadeusError extends Error {
  constructor(message: string, public status = 502, public code?: string) {
    super(message);
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 10_000) return cachedToken.value;
  const res = await fetch(`${HOST}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.amadeusClientId,
      client_secret: config.amadeusClientSecret,
    }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AmadeusError(body?.error_description || `Amadeus auth failed (${res.status})`, res.status, body?.error);
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in ?? 1800) * 1000 };
  return cachedToken.value;
}

async function call<T>(path: string): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${HOST}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.errors?.[0];
    throw new AmadeusError(err?.detail || err?.title || `Amadeus request failed (${res.status})`, res.status, err?.code);
  }
  return body.data as T;
}

export interface AmadeusHotelListing {
  hotelId: string;
  name: string;
  rating?: number;
  cityName?: string;
}

/** Hotel List API — every hotel Amadeus has mapped in a city, by IATA city code (e.g. "PAR", "NYC"). */
export async function hotelsByCity(cityCode: string): Promise<AmadeusHotelListing[]> {
  const data = await call<any[]>(`/v1/reference-data/locations/hotels/by-city?cityCode=${encodeURIComponent(cityCode)}`);
  return (data || []).map((h) => ({
    hotelId: h.hotelId,
    name: h.name,
    rating: h.rating != null ? Number(h.rating) : undefined,
    cityName: h.address?.cityName,
  }));
}

export interface AmadeusOffer {
  hotelId: string;
  offerId: string;
  name: string;
  rating?: number;
  area?: string;
  roomDescription?: string;
  boardType?: string;
  currency: string;
  total: number; // for the whole stay, for the requested room quantity
  refundable?: boolean;
}

/** Hotel Search API (v3 shopping/hotel-offers) — live rates for a specific set of hotel ids. Max 20 ids per call. */
export async function hotelOffers(args: {
  hotelIds: string[];
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  roomQuantity?: number;
  currency?: string;
}): Promise<AmadeusOffer[]> {
  if (!args.hotelIds.length) return [];
  const q = new URLSearchParams({
    hotelIds: args.hotelIds.slice(0, 20).join(","),
    checkInDate: args.checkInDate,
    checkOutDate: args.checkOutDate,
    adults: String(Math.max(1, args.adults)),
    roomQuantity: String(Math.max(1, args.roomQuantity ?? 1)),
    currency: args.currency ?? "USD",
    bestRateOnly: "true",
  });
  const data = await call<any[]>(`/v3/shopping/hotel-offers?${q}`);
  const out: AmadeusOffer[] = [];
  for (const entry of data || []) {
    if (entry.available === false) continue;
    const offer = entry.offers?.[0];
    if (!offer) continue;
    out.push({
      hotelId: entry.hotel?.hotelId,
      offerId: offer.id,
      name: entry.hotel?.name,
      rating: entry.hotel?.rating != null ? Number(entry.hotel.rating) : undefined,
      area: entry.hotel?.address?.lines?.[0] || entry.hotel?.address?.cityName,
      roomDescription: offer.room?.typeEstimated?.category || offer.room?.description?.text,
      boardType: offer.boardType,
      currency: offer.price?.currency,
      total: Number(offer.price?.total ?? 0),
      refundable: offer.policies?.cancellations?.some((c: any) => c.type === "FULL_STAY") ?? undefined,
    });
  }
  return out;
}

/** Combined search: this account's mapped hotels in a city, priced for the given stay. */
export async function searchCityOffers(args: {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  roomQuantity?: number;
}): Promise<AmadeusOffer[]> {
  const listed = await hotelsByCity(args.cityCode);
  if (!listed.length) return [];
  return hotelOffers({
    hotelIds: listed.map((h) => h.hotelId),
    checkInDate: args.checkInDate,
    checkOutDate: args.checkOutDate,
    adults: args.adults,
    roomQuantity: args.roomQuantity,
  });
}
