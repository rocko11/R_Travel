/**
 * Car rental browsing and pricing. Pure functions, safe in the browser.
 * Daily rates are 2026 market-average estimates per class. R Travel doesn't have a live
 * rental-car supply connection yet (every self-serve option — Amadeus, Expedia, DiscoverCars —
 * is either sales-gated or requires existing traffic) — a request here is sourced and confirmed
 * by the team, same as cruises and tours.
 */

export type CarClass = "economy" | "compact" | "suv" | "luxury";

export const CLASS_LABEL: Record<CarClass, string> = {
  economy: "Economy",
  compact: "Compact / midsize",
  suv: "SUV",
  luxury: "Luxury / premium",
};

// USD per day, by class.
const CLASS_RATE: Record<CarClass, [number, number]> = {
  economy: [35, 55],
  compact: [50, 80],
  suv: [80, 140],
  luxury: [150, 320],
};

const CLASS_SEATS: Record<CarClass, number> = { economy: 4, compact: 5, suv: 7, luxury: 5 };

export interface CarOption {
  model: string;
  class: CarClass;
  seats: number;
  transmission: "Automatic" | "Manual";
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

const MODELS: Record<CarClass, string[]> = {
  economy: ["Toyota Yaris or similar", "Kia Rio or similar", "Chevrolet Spark or similar"],
  compact: ["Toyota Corolla or similar", "Volkswagen Golf or similar", "Hyundai Elantra or similar"],
  suv: ["Toyota RAV4 or similar", "Jeep Grand Cherokee or similar", "Kia Sorento or similar"],
  luxury: ["BMW 5 Series or similar", "Mercedes-Benz E-Class or similar", "Audi Q7 or similar"],
};

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

/** Stand-in car inventory for a destination — same idea as the synthetic hotel/flight generators, seeded so the same destination always shows the same list. */
function syntheticCars(seed: string): CarOption[] {
  const r = rng(seed);
  const classes: CarClass[] = ["economy", "compact", "suv", "luxury"];
  return classes.map((cls) => ({
    model: pick(r, MODELS[cls]),
    class: cls,
    seats: CLASS_SEATS[cls],
    transmission: cls === "economy" && r() < 0.3 ? "Manual" : "Automatic",
  }));
}

/** Every choosable car for a destination. */
export function carOptionsFor(dest: { slug?: string; code: string; city: string }): CarOption[] {
  return syntheticCars(dest.slug ?? dest.code);
}

export interface CarEstimate {
  car: CarOption;
  low: number;
  high: number;
}

/** One price estimate per available car class: total for the whole rental. */
export function estimateCars(dest: { slug?: string; code: string; city: string } | undefined, days: number): CarEstimate[] {
  if (!dest) return [];
  return carOptionsFor(dest).map((car) => {
    const [lo, hi] = CLASS_RATE[car.class];
    const round = (n: number) => Math.round(n / 5) * 5;
    return { car, low: round(lo * days), high: round(hi * days) };
  });
}
