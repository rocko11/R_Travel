export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface Place {
  iata: string;
  name: string;
  city: string;
  country?: string;
  type: "airport" | "city";
  lat?: number;
  lon?: number;
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
  aircraftCode?: string;
  operatedBy?: string; // operating carrier name when different from marketing
  cabin?: CabinInfo;
  fareBasis?: string;
}

/** What the traveler gets in the cabin on one flight. Airlines don't always send every field. */
export interface CabinInfo {
  cabinClass?: CabinClass;
  marketingName?: string; // e.g. "Club World", "Main Cabin"
  seatType?: string; // e.g. "Lie-flat bed", "Recliner"
  pitch?: string; // inches
  legroom?: string; // "less" | "more" | "n/a" as sent
  wifi?: "free" | "paid" | "yes" | "no";
  power?: boolean;
}

export interface Slice {
  origin: string;
  destination: string;
  departAt: string;
  arriveAt: string;
  durationMin: number;
  stops: number;
  segments: Segment[];
  fareBrand?: string;
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
  carryOnBags?: number;
  refundable: boolean;
  changeable: boolean;
  refundPenalty?: number;
  changePenalty?: number;
  emissionsKg?: number;
  cabinClass?: CabinClass;
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
  userId?: string;
}
