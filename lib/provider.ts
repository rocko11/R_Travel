import "server-only";
import { config } from "./config";
import * as duffel from "./duffel";
import { demoOffer, demoOffers, demoPlaces } from "./demo";
import { priceOffer } from "./pricing";
import type { ContactInput, Offer, PassengerInput, Place, PricedOffer, SearchParams } from "./types";

const rule = () => ({ fixed: config.markupFixed, percent: config.markupPercent });

export async function places(query: string): Promise<Place[]> {
  if (config.mode === "demo") return demoPlaces(query);
  return duffel.suggestPlaces(query);
}

export async function search(q: SearchParams): Promise<PricedOffer[]> {
  const offers = config.mode === "demo" ? demoOffers(q) : await duffel.searchOffers(q);
  return offers.map((o) => priceOffer(o, rule())).sort((a, b) => a.total - b.total);
}

export async function freshOffer(id: string): Promise<PricedOffer> {
  let offer: Offer | null;
  if (config.mode === "demo") offer = demoOffer(id);
  else offer = await duffel.getOffer(id);
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
  return duffel.createOrder({ offer, passengers, contact });
}
