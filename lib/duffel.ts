import "server-only";
import { config } from "./config";
import type {
  CabinInfo,
  CabinClass,
  Offer,
  PassengerInput,
  ContactInput,
  Place,
  SearchParams,
  Segment,
  Slice,
} from "./types";

const API = "https://api.duffel.com";

export class SupplierError extends Error {
  constructor(message: string, public status = 502, public code?: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.duffelToken}`,
      "Duffel-Version": "v2",
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.errors?.[0];
    throw new SupplierError(
      err?.message || `Duffel request failed (${res.status})`,
      res.status,
      err?.code
    );
  }
  return body.data as T;
}

/** "PT7H05M" / "P1DT2H" -> minutes */
export function isoDurationToMin(d?: string | null): number {
  if (!d) return 0;
  const m = d.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 1440 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapOffer(o: any): Offer {
  const slices: Slice[] = o.slices.map((s: any) => {
    const segments: Segment[] = s.segments.map((g: any) => ({
      carrier: g.marketing_carrier?.iata_code ?? "",
      carrierName: g.marketing_carrier?.name ?? "",
      flightNumber: `${g.marketing_carrier?.iata_code ?? ""}${String(g.marketing_carrier_flight_number ?? "").replace(/^0+(?=\d)/, "")}`,
      origin: g.origin?.iata_code,
      destination: g.destination?.iata_code,
      departAt: g.departing_at,
      arriveAt: g.arriving_at,
      durationMin: isoDurationToMin(g.duration),
      aircraft: g.aircraft?.name,
      aircraftCode: g.aircraft?.iata_code ?? undefined,
      operatedBy:
        g.operating_carrier?.iata_code && g.operating_carrier.iata_code !== g.marketing_carrier?.iata_code
          ? g.operating_carrier.name
          : undefined,
      cabin: mapCabin(g.passengers?.[0]),
      fareBasis: g.passengers?.[0]?.fare_basis_code ?? undefined,
    }));
    return {
      origin: s.origin?.iata_code,
      destination: s.destination?.iata_code,
      departAt: segments[0]?.departAt,
      arriveAt: segments[segments.length - 1]?.arriveAt,
      durationMin: isoDurationToMin(s.duration),
      stops: segments.length - 1,
      segments,
      fareBrand: s.fare_brand_name ?? undefined,
    };
  });
  const firstSegPax = o.slices?.[0]?.segments?.[0]?.passengers?.[0];
  const checked =
    firstSegPax?.baggages?.find((b: any) => b.type === "checked")?.quantity ?? 0;
  const carryOn = firstSegPax?.baggages?.find((b: any) => b.type === "carry_on")?.quantity;
  const penalty = (c: any) => (c?.allowed && c.penalty_amount != null ? Number(c.penalty_amount) : undefined);
  return {
    id: o.id,
    baseAmount: Number(o.total_amount),
    currency: o.total_currency,
    owner: {
      name: o.owner?.name,
      iata: o.owner?.iata_code,
      logo: o.owner?.logo_symbol_url || undefined,
    },
    slices,
    passengers: (o.passengers || []).map((p: any) => ({
      id: p.id,
      type: p.type ?? (p.age != null && p.age < 2 ? "infant_without_seat" : p.age != null && p.age < 18 ? "child" : "adult"),
      age: p.age ?? undefined,
    })),
    expiresAt: o.expires_at,
    checkedBags: checked,
    refundable: Boolean(o.conditions?.refund_before_departure?.allowed),
    changeable: Boolean(o.conditions?.change_before_departure?.allowed),
    carryOnBags: carryOn ?? undefined,
    refundPenalty: penalty(o.conditions?.refund_before_departure),
    changePenalty: penalty(o.conditions?.change_before_departure),
    emissionsKg: o.total_emissions_kg != null ? Number(o.total_emissions_kg) : undefined,
    cabinClass: firstSegPax?.cabin_class ?? undefined,
  };
}

function mapCabin(p: any): CabinInfo | undefined {
  if (!p) return undefined;
  const a = p.cabin?.amenities ?? {};
  const wifi = a.wifi
    ? a.wifi.available === true || a.wifi.available === "true"
      ? a.wifi.cost === "free" ? "free" : a.wifi.cost === "paid" ? "paid" : "yes"
      : "no"
    : undefined;
  return {
    cabinClass: p.cabin_class ?? p.cabin?.name ?? undefined,
    marketingName: p.cabin_class_marketing_name ?? p.cabin?.marketing_name ?? undefined,
    seatType: a.seat?.type ?? undefined,
    pitch: a.seat?.pitch ?? undefined,
    legroom: a.seat?.legroom ?? undefined,
    wifi,
    power: a.power ? a.power.available === true || a.power.available === "true" : undefined,
  };
}

export async function suggestPlaces(query: string): Promise<Place[]> {
  const data = await call<any[]>(
    `/places/suggestions?query=${encodeURIComponent(query)}`
  );
  return data
    .filter((p) => p.iata_code)
    .slice(0, 8)
    .map((p) => ({
      iata: p.iata_code,
      name: p.name,
      city: p.city_name || p.name,
      country: p.iata_country_code,
      type: p.type === "city" ? "city" : "airport",
      lat: p.latitude ?? p.airports?.[0]?.latitude ?? undefined,
      lon: p.longitude ?? p.airports?.[0]?.longitude ?? undefined,
    }));
}

export async function searchOffers(q: SearchParams): Promise<Offer[]> {
  const slices = [
    { origin: q.origin, destination: q.destination, departure_date: q.departDate },
  ];
  if (q.returnDate) {
    slices.push({ origin: q.destination, destination: q.origin, departure_date: q.returnDate });
  }
  const passengers = [
    ...Array.from({ length: q.adults }, () => ({ type: "adult" })),
    ...q.childAges.map((age) => ({ age })),
  ];
  const data = await call<any>(
    "/air/offer_requests?return_offers=true&supplier_timeout=20000",
    {
      method: "POST",
      body: JSON.stringify({
        data: { slices, passengers, cabin_class: q.cabin as CabinClass, max_connections: 2 },
      }),
    }
  );
  return (data.offers || []).map(mapOffer);
}

/** Re-fetch a single offer with a fresh price (fares move between search and book). */
export async function getOffer(id: string): Promise<Offer> {
  const data = await call<any>(`/air/offers/${encodeURIComponent(id)}?return_available_services=false`);
  return mapOffer(data);
}

export async function createOrder(args: {
  offer: Offer;
  passengers: PassengerInput[];
  contact: ContactInput;
}): Promise<{ orderId: string; bookingReference: string }> {
  const data = await call<any>("/air/orders", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "instant",
        selected_offers: [args.offer.id],
        payments: [
          { type: "balance", currency: args.offer.currency, amount: args.offer.baseAmount.toFixed(2) },
        ],
        passengers: args.passengers.map((p) => ({
          id: p.id,
          title: p.title,
          given_name: p.givenName,
          family_name: p.familyName,
          gender: p.gender,
          born_on: p.bornOn,
          email: args.contact.email,
          phone_number: args.contact.phone,
        })),
        metadata: { source: "web" },
      },
    }),
  });
  return { orderId: data.id, bookingReference: data.booking_reference };
}
