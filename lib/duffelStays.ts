import "server-only";
import { config } from "./config";
import { SupplierError } from "./duffel";

/**
 * Duffel Stays — live hotel search & booking. Same account/token as flights, but Stays is a
 * separate product Duffel has to switch on for this account ("Contact sales" in the dashboard).
 * Until then every call here throws a SupplierError (403) — that's expected, not a bug.
 *
 * Flow: search -> fetchAllRates -> createQuote -> createBooking.
 * https://duffel.com/docs/guides/getting-started-with-stays
 */

const API = "https://api.duffel.com";

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
      err?.message || `Duffel Stays request failed (${res.status})`,
      res.status,
      err?.code
    );
  }
  return body.data as T;
}

export interface StaysGuest {
  type: "adult" | "child";
  age?: number;
}

export interface StaysSearchParams {
  /** Either a location (lat/lng) or a specific accommodation search. */
  location?: { radius: number; geographic_coordinates: { latitude: number; longitude: number } };
  /** Duffel Stays accommodation IDs, when searching specific properties instead of an area. */
  accommodation?: { ids: string[] };
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  guests: StaysGuest[];
  rooms?: number;
}

export interface StaysAccommodation {
  id: string;
  name: string;
  rating?: number;
  location?: { address?: { line_one?: string; city_name?: string; country_code?: string } };
  photos?: { url: string }[];
  cheapest_rate_total_amount?: string;
  cheapest_rate_currency?: string;
}

export interface StaysSearchResult {
  searchResultId: string;
  accommodations: StaysAccommodation[];
}

/** Step 1 — POST /stays/search. Returns a search_result id plus a first page of accommodations. */
export async function searchStays(q: StaysSearchParams): Promise<StaysSearchResult> {
  const data = await call<any>("/stays/search", {
    method: "POST",
    body: JSON.stringify({
      data: {
        check_in_date: q.checkInDate,
        check_out_date: q.checkOutDate,
        guests: q.guests,
        rooms: q.rooms ?? 1,
        ...(q.location ? { location: q.location } : {}),
        ...(q.accommodation ? { accommodation: q.accommodation } : {}),
      },
    }),
  });
  return {
    searchResultId: data.search_result_id ?? data.id,
    accommodations: data.results ?? data.accommodations ?? [],
  };
}

export interface StaysRate {
  id: string;
  totalAmount: string;
  currency: string;
  boardType?: string;
  refundable?: boolean;
  roomName?: string;
}

/** Step 2 — POST /stays/search_results/{id}/actions/fetch_all_rates. Rates expire (~30 min). */
export async function fetchAllRates(searchResultId: string): Promise<StaysRate[]> {
  const data = await call<any>(
    `/stays/search_results/${encodeURIComponent(searchResultId)}/actions/fetch_all_rates`,
    { method: "POST", body: JSON.stringify({ data: {} }) }
  );
  const rates = data.accommodation?.rooms?.flatMap((r: any) => r.rates ?? []) ?? data.rates ?? [];
  return rates.map((r: any) => ({
    id: r.id,
    totalAmount: r.total_amount,
    currency: r.total_currency,
    boardType: r.board_type,
    refundable: r.conditions?.refundable_until != null,
    roomName: r.room?.name,
  }));
}

export interface StaysQuote {
  id: string;
  totalAmount: string;
  currency: string;
  expiresAt: string;
}

/** Step 3 — POST /stays/quotes. Locks a rate's price for booking (short-lived). */
export async function createQuote(rateId: string): Promise<StaysQuote> {
  const data = await call<any>("/stays/quotes", {
    method: "POST",
    body: JSON.stringify({ data: { rate_id: rateId } }),
  });
  return {
    id: data.id,
    totalAmount: data.total_amount,
    currency: data.total_currency,
    expiresAt: data.expires_at,
  };
}

export interface StaysGuestInput {
  givenName: string;
  familyName: string;
  email?: string;
  phoneNumber?: string;
  bornOn?: string;
}

export interface StaysPaymentInput {
  type: "balance";
  amount: string;
  currency: string;
}

/** Step 4 — POST /stays/bookings. Confirms the stay against a still-valid quote. */
export async function createBooking(args: {
  quoteId: string;
  email: string;
  phoneNumber: string;
  guests: StaysGuestInput[];
  accommodationSpecialRequests?: string;
}): Promise<{ id: string; reference?: string; status: string }> {
  const data = await call<any>("/stays/bookings", {
    method: "POST",
    body: JSON.stringify({
      data: {
        quote_id: args.quoteId,
        email: args.email,
        phone_number: args.phoneNumber,
        guests: args.guests.map((g) => ({
          given_name: g.givenName,
          family_name: g.familyName,
          born_on: g.bornOn,
        })),
        accommodation_special_requests: args.accommodationSpecialRequests,
      },
    }),
  });
  return { id: data.id, reference: data.reference, status: data.status };
}

export async function getBooking(id: string): Promise<any> {
  return call<any>(`/stays/bookings/${encodeURIComponent(id)}`);
}

export async function listBookings(): Promise<any[]> {
  const data = await call<any[]>("/stays/bookings");
  return data;
}

export async function cancelBooking(id: string): Promise<any> {
  return call<any>(`/stays/bookings/${encodeURIComponent(id)}/actions/cancel`, {
    method: "POST",
    body: JSON.stringify({ data: {} }),
  });
}

export async function updateBooking(id: string, patch: { accommodationSpecialRequests?: string }): Promise<any> {
  return call<any>(`/stays/bookings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      data: { accommodation_special_requests: patch.accommodationSpecialRequests },
    }),
  });
}

/** True once Duffel has actually turned Stays on for this account. Cheap probe, call sparingly. */
export async function staysEnabled(): Promise<boolean> {
  try {
    await call<any>("/stays/bookings");
    return true;
  } catch (e) {
    if (e instanceof SupplierError && e.status === 403) return false;
    return true; // any other error means Stays responded — it's on, just errored for another reason
  }
}
