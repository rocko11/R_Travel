export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface Place {
  iata: string;
  name: string;
  city: string;
  country?: string;
  type: "airport" | "city";
}

export interface SearchParams {
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD, round trip when set
  adults: number;
  childAges: number[];
  cabin: CabinClass;
}

export interface Segment {
  carrier: string; // IATA code of marketing carrier
  carrierName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departAt: string; // local ISO without offset, as airlines publish
  arriveAt: string;
  durationMin: number;
  aircraft?: string;
}

export interface Slice {
  origin: string;
  destination: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  stops: number;
  segments: Segment[];
}

export interface OfferPassenger {
  id: string;
  type: "adult" | "child" | "infant_without_seat";
  age?: number;
}

/** Offer as the supplier prices it (no markup). */
export interface Offer {
  id: string;
  baseAmount: number; // airline total incl. taxes, all passengers
  currency: string;
  owner: { name: string; iata: string; logo?: string };
  slices: Slice[];
  passengers: OfferPassenger[];
  expiresAt: string;
  checkedBags: number; // per passenger on first segment
  refundable: boolean;
  changeable: boolean;
}

/** Offer with the customer-facing price. */
export interface PricedOffer extends Offer {
  markup: number;
  total: number; // what the customer pays
}

export interface PassengerInput {
  id: string; // offer passenger id
  title: "mr" | "ms" | "mrs" | "miss" | "dr";
  givenName: string;
  familyName: string;
  gender: "m" | "f";
  bornOn: string; // YYYY-MM-DD
}

export interface ContactInput {
  email: string;
  phone: string; // E.164, e.g. +19175551234
}

export type BookingStatus = "pending_payment" | "confirmed" | "failed";

export interface Booking {
  id: string;
  status: BookingStatus;
  createdAt: string;
  offerId: string;
  offer: PricedOffer;
  passengers: PassengerInput[];
  contact: ContactInput;
  baseAmount: number;
  markup: number;
  total: number;
  currency: string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  supplierOrderId?: string;
  bookingReference?: string;
  failureReason?: string;
  mode: "demo" | "test" | "live";
}
