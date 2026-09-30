import "server-only";
import { config } from "./config";
import * as duffel from "./duffel";
import { demoOffer, demoOffers, demoPlaces } from "./demo";
import { priceOffer } from "./pricing";
import { flightKey } from "./flightKey";
import { searchFlights, isLiteApiOfferId } from "./liteApiFlights";
import type { ContactInput, Offer, PassengerInput, Place, PricedOffer, SearchParams } from "./types";

const rule = () => ({ fixed: config.markupFixed, percent: config.markupPercent });

export async function places(query: string): Promise<Place[]> {
  if (config.mode === "demo") return demoPlaces(query);
  return duffel.suggestPlaces(query);
}

/**
 * Searches Duffel and liteAPI in parallel and merges the results by price, so a search shows
 * the best fare from either provider instead of just Duffel's. liteAPI-sourced offers
 * (id prefixed "lite_") are comparison-only for now: freshOffer()/issue() below only know how
 * to re-price and book a Duffel offer, because liteAPI's flight booking endpoints haven't been
 * verified against a live call the way search has — see lib/liteApiFlights.ts for why that
 * matters on a site moving real payments. The UI should treat a lite_-prefixed offer as
 * view-only until that's done.
 */
export async function search(q: SearchParams): Promise<PricedOffer[]> {
  if (config.mode === "demo") return demoOffers(q).map((o) => priceOffer(o, rule())).sort((a, b) => a.total - b.total);
  const [duffelResult, liteApiResult] = await Promise.allSettled([duffel.searchOffers(q), searchFlights(q)]);
  const offers: Offer[] = [
    ...(duffelResult.status === "fulfilled" ? duffelResult.value : []),
    ...(liteApiResult.status === "fulfilled" ? liteApiResult.value : []),
  ];
  if (duffelResult.status === "rejected" && liteApiResult.status === "rejected") throw duffelResult.reason;
  return offers.map((o) => priceOffer(o, rule())).sort((a, b) => a.total - b.total);
}

export async function freshOffer(id: string): Promise<PricedOffer> {
  let offer: Offer | null;
  if (config.mode === "demo") offer = demoOffer(id);
  else if (isLiteApiOfferId(id)) {
    throw new duffel.SupplierError("This fare isn't bookable yet — please pick a different result.", 409);
  } else offer = await duffel.getOffer(id);
  if (!offer) throw new duffel.SupplierError("This fare is no longer available.", 404);
  if (Date.parse(offer.expiresAt) < Date.now()) {
    throw new duffel.SupplierError("This fare has expired. Please search again.", 410);
  }
  return priceOffer(offer, rule());
}

export async function issue(
  offer: Offer,
  passengers: PassengerInput[],
  contact: ContactInput
): Promise<{ orderId: string; bookingReference: string }> {
  if (config.mode === "demo") {
    const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
    return { orderId: `ord_demo_${ref}`, bookingReference: ref };
  }
  if (isLiteApiOfferId(offer.id)) {
    throw new duffel.SupplierError("This fare isn't bookable yet — please pick a different result.", 409);
  }
  return duffel.createOrder({ offer, passengers, contact });
}

/** Same flights as `key` (see flightKey), priced in every cabin class. */

const CABINS = ["economy", "premium_economy", "business", "first"] as const;

export async function compareCabins(q: SearchParams, key: string) {
  const results = await Promise.all(
    CABINS.map(async (cabin) => {
      try {
        const offers = await search({ ...q, cabin });
        const match = offers.filter((o) => flightKey(o) === key).sort((a, b) => a.total - b.total)[0];
        return [cabin, match ?? null] as const;
      } catch {
        return [cabin, null] as const;
      }
    })
  );
  return Object.fromEntries(results) as Record<(typeof CABINS)[number], PricedOffer | null>;
}
