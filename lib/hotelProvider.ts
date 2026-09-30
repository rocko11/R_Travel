import "server-only";
import { amadeusEnabled, liteApiEnabled } from "./config";
import { searchCityOffers } from "./amadeusHotels";
import { searchCityRates } from "./liteApiHotels";
import { destinationBySlug } from "./destinations";
import { estimateHotels, type HotelEstimate, type HotelTier, type RoomType } from "./hotels";

/**
 * Bridges live hotel search (liteAPI/Nuitee first, Amadeus second) into R Travel's existing
 * hotel-picker shape (HotelEstimate), so the UI and the request-a-quote flow don't need to know
 * whether a price is live or synthetic. Falls back down the chain whenever a provider isn't
 * configured, returns nothing for this city/dates, or errors — a hotel search should never fail
 * just because live pricing did.
 */

// Amadeus/IATA city codes that differ from R Travel's mainAirport code for a destination.
const AMADEUS_CITY: Record<string, string> = {
  london: "LON",
  paris: "PAR",
  rome: "ROM",
  tokyo: "TYO",
  "new-york": "NYC",
  milan: "MIL",
  seoul: "SEL",
  osaka: "OSA",
  chicago: "CHI",
  washington: "WAS",
  "buenos-aires": "BUE",
  "rio-de-janeiro": "RIO",
  "sao-paulo": "SAO",
};

function amadeusCityCode(dest: { slug?: string; code: string }): string {
  return (dest.slug && AMADEUS_CITY[dest.slug]) || dest.code;
}

// Country names (as stored in destinations.ts) -> ISO 3166-1 alpha-2, for liteAPI's countryCode param.
const COUNTRY_ISO2: Record<string, string> = {
  Israel: "IL",
  "United Kingdom": "GB",
  France: "FR",
  Italy: "IT",
  Spain: "ES",
  "United States": "US",
  Mexico: "MX",
  Japan: "JP",
  "United Arab Emirates": "AE",
  Thailand: "TH",
  Greece: "GR",
  Portugal: "PT",
  Netherlands: "NL",
};

/** Live rates from liteAPI (Nuitee Connect), or null when it's not configured/usable for this city. */
async function liteApiEstimates(
  dest: { slug?: string; code: string; city: string; country?: string } | undefined,
  checkIn: string,
  checkOut: string,
  guests: number,
  rooms: number
): Promise<LiveHotelEstimate[] | null> {
  if (!dest || !liteApiEnabled()) return null;
  // Prefer the real ISO-3166 country code Duffel's place search already gave us for whatever
  // the guest typed — that works for any city in the world, not just R Travel's own destination
  // guide. Fall back to the guide's curated name->ISO2 map only for older links (e.g.
  // /hotels?city=<slug> from a destination guide page) that never carry a country code.
  const destination = dest.slug ? destinationBySlug(dest.slug) : undefined;
  const countryCode =
    (dest.country && /^[A-Z]{2}$/.test(dest.country) ? dest.country : undefined) ??
    (destination ? COUNTRY_ISO2[destination.country] : undefined);
  if (!countryCode) return null;
  const cityName = destination?.name ?? dest.city;
  const args = {
    countryCode,
    cityName,
    checkin: checkIn,
    checkout: checkOut,
    adults: guests,
    rooms,
    marginPercent: 12,
  };
  // The sandbox occasionally times out or errors transiently under load; one retry keeps a
  // single flaky call from silently dropping a guest back to stale synthetic estimates.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const offers = await searchCityRates(args);
      if (!offers.length) return null;
      return offers
        .filter((o) => o.hotel?.name && o.cheapest.offerRetailRate > 0)
        .sort((a, b) => a.cheapest.offerRetailRate - b.cheapest.offerRetailRate)
        .slice(0, 8)
        .map((o) => ({
          hotel: { name: o.hotel!.name, area: o.hotel!.address || dest.city, tier: tierFromRating(o.hotel!.stars ?? o.hotel!.rating) },
          low: Math.round(o.cheapest.offerRetailRate),
          high: Math.round(o.cheapest.offerRetailRate),
          live: true as const,
          offerId: o.offerId,
        }));
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}

function tierFromRating(rating?: number): HotelTier {
  if (rating != null && rating >= 4) return "Luxury";
  if (rating != null && rating <= 2) return "Value";
  return "Mid-range";
}

export interface LiveHotelEstimate extends HotelEstimate {
  live: true;
  /** Present only for a real liteAPI rate that can be booked online right now via /hotels/book. */
  offerId?: string;
}

/** Live rates for a destination's stay, or null when live search isn't available/usable here. */
export async function liveHotelEstimates(
  dest: { slug?: string; code: string; city: string } | undefined,
  checkIn: string,
  checkOut: string,
  guests: number,
  rooms: number
): Promise<LiveHotelEstimate[] | null> {
  if (!dest || !amadeusEnabled()) return null;
  const cityCode = amadeusCityCode(dest);
  if (!/^[A-Z]{3}$/i.test(cityCode)) return null;
  try {
    const offers = await searchCityOffers({
      cityCode: cityCode.toUpperCase(),
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults: guests,
      roomQuantity: rooms,
    });
    if (!offers.length) return null;
    return offers
      .filter((o) => o.name && o.total > 0)
      .sort((a, b) => a.total - b.total)
      .slice(0, 8)
      .map((o) => {
        const perRoom = Math.round(o.total / Math.max(1, rooms));
        return {
          hotel: { name: o.name, area: o.area || dest.city, tier: tierFromRating(o.rating) },
          low: perRoom,
          high: perRoom,
          live: true as const,
        };
      });
  } catch {
    return null;
  }
}

/** Live rates when available, otherwise R Travel's synthetic estimate — always returns something. */
export async function hotelEstimatesFor(
  dest: { slug?: string; code: string; city: string; country?: string } | undefined,
  checkIn: string,
  checkOut: string,
  guests: number,
  rooms: number,
  roomType: RoomType
): Promise<{ source: "live" | "estimate"; hotels: HotelEstimate[] }> {
  const nights = Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));
  const liteApi = await liteApiEstimates(dest, checkIn, checkOut, guests, rooms);
  if (liteApi) return { source: "live", hotels: liteApi };
  const amadeus = await liveHotelEstimates(dest, checkIn, checkOut, guests, rooms);
  if (amadeus) return { source: "live", hotels: amadeus };
  return { source: "estimate", hotels: estimateHotels(dest, nights, roomType) };
}
