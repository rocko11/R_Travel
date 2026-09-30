import "server-only";
import { config } from "./config";
import { searchLegs } from "./legs";
import type { CabinClass, Offer, OfferPassenger, Segment, Slice, SearchParams } from "./types";

/**
 * Nuitee Connect / liteAPI — Flights search (self-service, same API key as hotels).
 * https://docs.liteapi.travel/reference/post_flights-rates
 *
 * Added alongside Duffel (not instead of it) so a search shows the best fare from either
 * provider: broader coverage and, on some routes, a cheaper price than Duffel alone finds.
 *
 * Response shape below was confirmed against a live sandbox call in the Nuitee Connect API
 * Playground (2026-09-30), not assumed from the docs alone — the hotels integration shipped
 * with an unverified envelope-shape assumption that silently broke it in production, so this
 * client verifies actual field names before mapping rather than after.
 *
 * Confirmed: POST /flights/rates returns { data: [ { journeys: [ ... ] } ] } — journeys[].segments,
 * journeys[].offers (and journeys[].cheapestOffer, the same shape as one entry of offers[]) all
 * match the documented schema exactly, including segments[].carrier/flight/duration and
 * offers[].pricing/fare/terms/baggage/segmentFares. One divergence from the docs: offers[] in a
 * live sandbox response did not include a `provider` field, so it's treated as optional here.
 *
 * Booking (verify/prebook/bookings) is NOT wired into the checkout flow yet — this file only
 * covers search. liteAPI's own request/response shapes for those three endpoints haven't been
 * verified against a live call the way search has, and this is a production site moving real
 * payments, so shipping an unverified booking mapper isn't worth the risk of a silent failure
 * mid-purchase. liteAPI-sourced offers show up in search results for comparison, but issuing
 * still routes through Duffel only (see lib/provider.ts).
 */

const HOST = "https://api.liteapi.travel/v3.0";
const ID_PREFIX = "lite_";

export class LiteApiFlightsError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

async function call<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${HOST}${path}`, {
    method: "POST",
    headers: { "X-API-Key": config.liteApiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new LiteApiFlightsError(json?.error?.message || json?.message || `liteAPI flights request failed (${res.status})`, res.status);
  }
  return json as T;
}

function mapCabinClass(raw?: string): CabinClass | undefined {
  if (!raw) return undefined;
  const c = raw.toLowerCase();
  if (c.startsWith("premium")) return "premium_economy";
  if (c.startsWith("business")) return "business";
  if (c.startsWith("first")) return "first";
  if (c.startsWith("econom")) return "economy";
  return undefined;
}

function mapSegment(seg: any, segmentFares: any[]): Segment {
  const fare = segmentFares.find((f) => f.segmentKey === seg.segmentKey);
  const marketingCode = seg.carrier?.marketingCode ?? "";
  const operatingCode = seg.carrier?.operatingCode;
  return {
    carrier: marketingCode,
    carrierName: seg.carrier?.marketingName ?? "",
    flightNumber: `${marketingCode}${seg.flight?.marketingNumber ?? ""}`,
    origin: seg.originCode,
    destination: seg.destinationCode,
    departAt: seg.departureTime,
    arriveAt: seg.arrivalTime,
    durationMin: seg.duration?.minutes ?? 0,
    operatedBy: operatingCode && operatingCode !== marketingCode ? seg.carrier?.operatingName : undefined,
    cabin: fare ? { cabinClass: mapCabinClass(fare.cabin), marketingName: fare.fareFamily } : undefined,
    fareBasis: fare?.fareBasisCode,
  };
}

/** Builds R Travel's Slice[] by grouping a journey's flat segment list by OUTBOUND/INBOUND direction. */
function mapSlices(journey: any): Slice[] {
  const segmentFares = journey.cheapestOffer?.segmentFares ?? [];
  const byDirection = new Map<string, any[]>();
  for (const seg of journey.segments ?? []) {
    const dir = seg.direction ?? "OUTBOUND";
    if (!byDirection.has(dir)) byDirection.set(dir, []);
    byDirection.get(dir)!.push(seg);
  }
  const order = ["OUTBOUND", "INBOUND"];
  const legDurations: any[] = journey.legDurations ?? [];
  return order
    .filter((dir) => byDirection.has(dir))
    .map((dir) => {
      const segs = byDirection.get(dir)!;
      const mapped = segs.map((s) => mapSegment(s, segmentFares));
      const legDur = legDurations.find((l) => l.direction === dir);
      return {
        origin: mapped[0]?.origin,
        destination: mapped[mapped.length - 1]?.destination,
        departAt: mapped[0]?.departAt,
        arriveAt: mapped[mapped.length - 1]?.arriveAt,
        durationMin: legDur?.duration?.minutes ?? mapped.reduce((sum, s) => sum + s.durationMin, 0),
        stops: mapped.length - 1,
        segments: mapped,
        fareBrand: journey.cheapestOffer?.fare?.family,
      } as Slice;
    });
}

function passengersFor(q: SearchParams): OfferPassenger[] {
  const out: OfferPassenger[] = [];
  for (let i = 0; i < q.adults; i++) out.push({ id: `pax_${out.length}`, type: "adult" });
  for (const age of q.childAges) {
    out.push({ id: `pax_${out.length}`, type: age < 2 ? "infant_without_seat" : "child", age });
  }
  return out;
}

/** Maps one journey's cheapest offer into R Travel's Offer shape. One Offer per journey. */
function mapJourney(journey: any, passengers: OfferPassenger[]): Offer | null {
  const offer = journey.cheapestOffer;
  if (!offer?.offerId || offer.pricing?.display?.total == null) return null;
  const slices = mapSlices(journey);
  if (!slices.length) return null;
  const checkedBag = (offer.baggage?.included ?? []).find((b: any) => b.bagType === "checked");
  const carryOnBag = (offer.baggage?.included ?? []).find((b: any) => b.bagType === "cabin");
  const firstCarrier = journey.segments?.[0]?.carrier;
  const changeFeeAmt = offer.terms?.changeFee?.pricing?.display?.amount;
  const refundFeeAmt = offer.terms?.refundFee?.pricing?.display?.amount;
  return {
    id: `${ID_PREFIX}${offer.offerId}`,
    baseAmount: Number(offer.pricing.display.total),
    currency: offer.pricing.display.currency,
    owner: {
      name: firstCarrier?.marketingName ?? "",
      iata: firstCarrier?.marketingCode ?? "",
      logo: firstCarrier?.marketingLogo,
    },
    slices,
    passengers,
    expiresAt: offer.expiration,
    checkedBags: checkedBag?.pieces ?? 0,
    carryOnBags: carryOnBag?.pieces,
    refundable: Boolean(offer.terms?.refundable),
    changeable: Boolean(offer.terms?.changeable),
    refundPenalty: refundFeeAmt != null ? Number(refundFeeAmt) : undefined,
    changePenalty: changeFeeAmt != null ? Number(changeFeeAmt) : undefined,
    cabinClass: mapCabinClass(offer.segmentFares?.[0]?.cabin) ?? undefined,
  };
}

/** True when this offer id came from liteAPI rather than Duffel. */
export function isLiteApiOfferId(id: string): boolean {
  return id.startsWith(ID_PREFIX);
}

export async function searchFlights(q: SearchParams): Promise<Offer[]> {
  if (!config.liteApiKey) return [];
  const legs = searchLegs(q).map((l) => ({ origin: l.origin, destination: l.destination, date: l.departDate }));
  const passengers = passengersFor(q);
  const cabinClass = q.cabin.toUpperCase() as "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
  try {
    const body = await call<any>("/flights/rates", {
      legs,
      adults: q.adults,
      childrenAges: q.childAges.length ? q.childAges : undefined,
      cabinClass,
      currency: "USD",
    });
    const journeys = (body?.data ?? []).flatMap((batch: any) => batch.journeys ?? []);
    return journeys
      .map((j: any) => mapJourney(j, passengers))
      .filter((o: Offer | null): o is Offer => o !== null);
  } catch {
    // A liteAPI flights outage should never take down flight search as a whole — Duffel
    // results still show. See lib/provider.ts, which calls this alongside Duffel.
    return [];
  }
}
