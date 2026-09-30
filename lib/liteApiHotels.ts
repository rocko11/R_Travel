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
  /** Pass this straight to prebookOffer() to book this exact rate. Absent if this rate isn't bookable online. */
  offerId?: string;
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
      offerId: roomType?.offerId ? String(roomType.offerId) : undefined,
    });
  }
  return out;
}

export interface PrebookResult {
  prebookId: string;
  hotelId: string;
  total: number;
  currency: string;
  cancellationPolicies?: unknown;
  roomName?: string;
  boardName?: string;
}

/** Re-prices and locks a rate ahead of booking. Call right before showing the guest the checkout page. */
export async function prebookOffer(offerId: string): Promise<PrebookResult> {
  const res = await fetch(`${HOST}/rates/prebook`, {
    method: "POST",
    headers: { "X-API-Key": config.liteApiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ offerId, usePaymentSdk: false }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LiteApiError(body?.error?.message || body?.message || `liteAPI prebook failed (${res.status})`, res.status);
  }
  const data = body?.data ?? body;
  const roomType = data?.roomTypes?.[0];
  const rate = roomType?.rates?.[0];
  const total = rate?.offerRetailRate?.[0]?.amount ?? data?.offerRetailRate?.[0]?.amount;
  const currency = rate?.offerRetailRate?.[0]?.currency ?? data?.offerRetailRate?.[0]?.currency ?? "USD";
  if (!data?.prebookId || !total) throw new LiteApiError("This rate is no longer available. Please search again.", 410);
  return {
    prebookId: String(data.prebookId),
    hotelId: String(data.hotelId ?? ""),
    total: Number(total),
    currency,
    cancellationPolicies: rate?.cancellationPolicies,
    roomName: rate?.name ?? roomType?.name,
    boardName: rate?.boardName,
  };
}

export interface BookGuest {
  firstName: string;
  lastName: string;
  email?: string;
}

export interface BookResult {
  bookingId: string;
  confirmationCode?: string;
  status?: string;
}

/**
 * Confirms a prebooked rate. Settles against R Travel's Nuitee Connect account (the
 * "Account Credit Card" on file in the dashboard) rather than the guest's card — the guest
 * already paid R Travel directly via Stripe before this call is made.
 */
export async function bookPrebook(args: {
  prebookId: string;
  holder: BookGuest;
  guests: BookGuest[];
  clientReference: string;
}): Promise<BookResult> {
  const res = await fetch(`${HOST}/rates/book`, {
    method: "POST",
    headers: { "X-API-Key": config.liteApiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      prebookId: args.prebookId,
      holder: { firstName: args.holder.firstName, lastName: args.holder.lastName, email: args.holder.email },
      guests: args.guests.map((g) => ({ firstName: g.firstName, lastName: g.lastName, email: g.email })),
      payment: { method: "ACC_CREDIT_CARD" },
      clientReference: args.clientReference,
    }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LiteApiError(body?.error?.message || body?.message || `liteAPI booking failed (${res.status})`, res.status);
  }
  const data = body?.data ?? body;
  const bookingId = data?.bookingId ?? data?.id;
  if (!bookingId) throw new LiteApiError("Booking confirmation was unclear. Our team will verify and follow up.", 502);
  return {
    bookingId: String(bookingId),
    confirmationCode: data?.hotelConfirmationCode ?? data?.supplierConfirmationCode,
    status: data?.status,
  };
}
