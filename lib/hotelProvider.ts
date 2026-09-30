import "server-only";
import { amadeusEnabled } from "./config";
import { searchCityOffers } from "./amadeusHotels";
import { estimateHotels, type HotelEstimate, type HotelTier, type RoomType } from "./hotels";

/**
 * Bridges Amadeus live hotel search into R Travel's existing hotel-picker shape (HotelEstimate),
 * so the UI and the request-a-quote flow don't need to know whether a price is live or synthetic.
 * Falls back to the synthetic estimator whenever Amadeus isn't configured, returns nothing for
 * this city/dates, or errors — a hotel search should never fail just because live pricing did.
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

function tierFromRating(rating?: number): HotelTier {
  if (rating != null && rating >= 4) return "Luxury";
  if (rating != null && rating <= 2) return "Value";
  return "Mid-range";
}

export interface LiveHotelEstimate extends HotelEstimate {
  live: true;
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
  dest: { slug?: string; code: string; city: string } | undefined,
  checkIn: string,
  checkOut: string,
  guests: number,
  rooms: number,
  roomType: RoomType
): Promise<{ source: "live" | "estimate"; hotels: HotelEstimate[] }> {
  const nights = Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));
  const live = await liveHotelEstimates(dest, checkIn, checkOut, guests, rooms);
  if (live) return { source: "live", hotels: live };
  return { source: "estimate", hotels: estimateHotels(dest, nights, roomType) };
}
