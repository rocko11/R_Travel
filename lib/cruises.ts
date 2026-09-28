/**
 * Luxury cruise lines and ships. Pure data + functions, safe to use in the browser.
 * Per-night rates are 2026 published brochure averages for a veranda suite, double
 * occupancy, all-inclusive (ultra-luxury lines) or premium-inclusive (premium-luxury
 * lines) fare. Port charges, gratuities policy and flights vary by sailing —
 * R Travel confirms the exact price with the line before booking.
 */

export type CruiseTier = "ultra_luxury" | "premium_luxury";
export type CruiseRegion =
  | "Mediterranean"
  | "Caribbean"
  | "Northern Europe & Fjords"
  | "Alaska"
  | "Asia & Japan"
  | "South America & Antarctica"
  | "World Cruise";

export const REGIONS: CruiseRegion[] = [
  "Mediterranean",
  "Caribbean",
  "Northern Europe & Fjords",
  "Alaska",
  "Asia & Japan",
  "South America & Antarctica",
  "World Cruise",
];

export type SuiteCategory = "veranda" | "grand" | "owners";
export const SUITE_LABEL: Record<SuiteCategory, string> = {
  veranda: "Veranda suite",
  grand: "Grand / penthouse suite",
  owners: "Owner's / signature suite",
};
// Multiplier over the base per-night rate for a higher suite category.
const SUITE_MULT: Record<SuiteCategory, number> = { veranda: 1, grand: 1.6, owners: 2.4 };

export interface CruiseShip {
  id: string;
  line: string;
  ship: string;
  tier: CruiseTier;
  guests: number;
  launched: number;
  regions: CruiseRegion[];
  perNight: [number, number]; // USD per person, per night, veranda suite, double occupancy
  allInclusive: boolean; // gratuities, wine/spirits, WiFi and (ultra-luxury) shore excursions included
  highlights: string;
}

export const CRUISE_SHIPS: CruiseShip[] = [
  {
    id: "silversea-nova",
    line: "Silversea",
    ship: "Silver Nova",
    tier: "ultra_luxury",
    guests: 728,
    launched: 2023,
    regions: ["Mediterranean", "Northern Europe & Fjords", "Caribbean"],
    perNight: [1100, 1500],
    allInclusive: true,
    highlights: "Asymmetric design for ocean-view dining from every restaurant; silent battery-powered propulsion in port; some of the largest suites in ultra-luxury cruising.",
  },
  {
    id: "regent-splendor",
    line: "Regent Seven Seas",
    ship: "Seven Seas Splendor",
    tier: "ultra_luxury",
    guests: 750,
    launched: 2020,
    regions: ["Mediterranean", "Caribbean", "Northern Europe & Fjords"],
    perNight: [1000, 1400],
    allInclusive: true,
    highlights: "All-suite, all-balcony; unlimited shore excursions, premium wines and a free 1-night pre-cruise hotel included in every fare.",
  },
  {
    id: "seabourn-pursuit",
    line: "Seabourn",
    ship: "Seabourn Pursuit",
    tier: "ultra_luxury",
    guests: 264,
    launched: 2023,
    regions: ["South America & Antarctica", "Caribbean", "Alaska"],
    perNight: [1200, 1700],
    allInclusive: true,
    highlights: "Purpose-built expedition ship with a submarine and kayaks aboard; small enough for Antarctic landings, still with Seabourn's all-suite comfort.",
  },
  {
    id: "crystal-serenity",
    line: "Crystal Cruises",
    ship: "Crystal Serenity",
    tier: "ultra_luxury",
    guests: 740,
    launched: 2003,
    regions: ["World Cruise", "Mediterranean", "Asia & Japan"],
    perNight: [900, 1300],
    allInclusive: true,
    highlights: "The line that pioneered ultra-luxury world cruises, relaunched in 2023 under new ownership with a full refurbishment.",
  },
  {
    id: "ritz-carlton-evrima",
    line: "The Ritz-Carlton Yacht Collection",
    ship: "Evrima",
    tier: "ultra_luxury",
    guests: 298,
    launched: 2022,
    regions: ["Mediterranean", "Caribbean"],
    perNight: [1300, 1900],
    allInclusive: true,
    highlights: "A true superyacht, not a cruise ship: marina platform for water sports, Ritz-Carlton hospitality, and no more than 298 guests aboard.",
  },
  {
    id: "explora-i",
    line: "Explora Journeys",
    ship: "Explora I",
    tier: "premium_luxury",
    guests: 922,
    launched: 2023,
    regions: ["Mediterranean", "Northern Europe & Fjords", "Caribbean"],
    perNight: [700, 1000],
    allInclusive: false,
    highlights: "MSC's new luxury line: residence-style suites, an ocean-facing infinity pool, and a slower, destination-immersive pace.",
  },
  {
    id: "four-seasons-i",
    line: "Four Seasons Yachts",
    ship: "Four Seasons I",
    tier: "ultra_luxury",
    guests: 95,
    launched: 2026,
    regions: ["Caribbean", "Mediterranean"],
    perNight: [1800, 2600],
    allInclusive: true,
    highlights: "Four Seasons' first yacht, debuting 2026: 95 all-suite staterooms, a marina platform, and full Four Seasons service and cuisine at sea.",
  },
];

const TIER_NAME: Record<CruiseTier, string> = { ultra_luxury: "Ultra-luxury", premium_luxury: "Premium luxury" };
export const tierName = (t: CruiseTier) => TIER_NAME[t];

export function shipsForRegion(region: CruiseRegion | "any") {
  return region === "any" ? CRUISE_SHIPS : CRUISE_SHIPS.filter((s) => s.regions.includes(region));
}

export interface CruiseEstimate {
  ship: CruiseShip;
  low: number;
  high: number;
}

/** One price estimate per matching ship: per-person, suite category, for the whole sailing. */
export function estimateCruises(region: CruiseRegion | "any", nights: number, suite: SuiteCategory): CruiseEstimate[] {
  const mult = SUITE_MULT[suite];
  return shipsForRegion(region).map((ship) => {
    const round = (n: number) => Math.round(n / 50) * 50;
    return {
      ship,
      low: round(ship.perNight[0] * mult * nights),
      high: round(ship.perNight[1] * mult * nights),
    };
  });
}
