import { destinationBySlug } from "./destinations";
export { matchDestination } from "./hotels";

/**
 * Local tours & activities, browseable for any destination — not just R Travel's guide cities.
 * R Travel doesn't have a live tour-supply connection yet, so a request here is sourced and
 * confirmed by the team, same as hotels and concierge bookings.
 */

export type TourTier = "Private" | "Small group" | "Group";
export type TourDuration = "2 hours" | "Half-day (4 hours)" | "Full-day (8 hours)" | "Evening (3 hours)";

export const DURATION_LABEL: Record<TourDuration, string> = {
  "2 hours": "2 hours",
  "Half-day (4 hours)": "Half-day",
  "Full-day (8 hours)": "Full-day",
  "Evening (3 hours)": "Evening",
};

// USD per person, at a baseline 2-hour duration.
const TIER_RATE: Record<TourTier, [number, number]> = {
  Private: [90, 180],
  "Small group": [45, 85],
  Group: [25, 45],
};
const DURATION_MULT: Record<TourDuration, number> = {
  "2 hours": 1,
  "Evening (3 hours)": 1.4,
  "Half-day (4 hours)": 1.8,
  "Full-day (8 hours)": 3.2,
};

export interface TourOption {
  name: string;
  duration: TourDuration;
  tier: TourTier;
  summary: string;
}

/** The curated guide's tour list for a destination slug, converted to bookable options. */
export function toursForSlug(slug?: string): TourOption[] {
  if (!slug) return [];
  const tours = destinationBySlug(slug)?.tours ?? [];
  return tours.map((t) => ({
    name: t.name,
    duration: /full/i.test(t.duration) || /day trip|8/i.test(t.duration) ? "Full-day" as TourDuration
      : /evening|night/i.test(t.duration) ? "Evening (3 hours)"
      : /half/i.test(t.duration) ? "Half-day (4 hours)"
      : "2 hours",
    tier: "Small group",
    summary: t.summary,
  }));
}

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const PRIVATE_NAMES = ["Private {city} Highlights Tour", "Private {city} with a Local Guide", "{city} Private Custom Tour"];
const SMALLGROUP_NAMES = ["{city} Walking Tour", "Best of {city} Small-Group Tour", "{city} Food & Market Tour", "{city} Old Town Tour"];
const GROUP_NAMES = ["{city} Hop-On Hop-Off Tour", "{city} Day Trip", "Classic {city} City Tour", "{city} Sightseeing Tour"];
const DURATIONS: TourDuration[] = ["2 hours", "Half-day (4 hours)", "Full-day (8 hours)", "Evening (3 hours)"];

const SUMMARY: Record<TourTier, string> = {
  Private: "A private, English-speaking guide takes you through {city}'s top sights at your own pace.",
  "Small group": "A small group (max 12) explores {city}'s highlights with a local guide.",
  Group: "A larger group tour covering {city}'s must-see sights, with hotel pickup available.",
};

const fill = (tpl: string, city: string) => tpl.replace("{city}", city);

/** Stand-in tour inventory for any destination, so every search still returns choosable tours. */
function syntheticTours(city: string, seed: string): TourOption[] {
  const r = rng(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];
  const used = new Set<string>();
  const make = (tier: TourTier, names: string[]): TourOption => {
    let name = fill(pick(names), city);
    while (used.has(name)) name = `${fill(pick(names), city)} II`;
    used.add(name);
    return { name, duration: pick(DURATIONS), tier, summary: fill(SUMMARY[tier], city) };
  };
  return [
    make("Private", PRIVATE_NAMES),
    make("Small group", SMALLGROUP_NAMES),
    make("Small group", SMALLGROUP_NAMES),
    make("Group", GROUP_NAMES),
    make("Group", GROUP_NAMES),
  ];
}

/** Every choosable tour for a destination: R Travel's own guide picks first, filled out with stand-in options. */
export function tourOptionsFor(dest: { slug?: string; code: string; city: string }): TourOption[] {
  const curated = toursForSlug(dest.slug);
  const seen = new Set(curated.map((t) => t.name));
  const filler = syntheticTours(dest.city, dest.code).filter((t) => !seen.has(t.name));
  return [...curated, ...filler].slice(0, 7);
}

export interface TourEstimate {
  tour: TourOption;
  low: number;
  high: number;
}

/** One price estimate per available tour: per person. */
export function estimateTours(dest: { slug?: string; code: string; city: string } | undefined): TourEstimate[] {
  if (!dest) return [];
  return tourOptionsFor(dest).map((tour) => {
    const [lo, hi] = TIER_RATE[tour.tier];
    const mult = DURATION_MULT[tour.duration];
    const round = (n: number) => Math.round(n / 5) * 5;
    return { tour, low: round(lo * mult), high: round(hi * mult) };
  });
}
