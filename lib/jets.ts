/**
 * Private jet charter estimates. Pure functions, safe to use in the browser.
 * Hourly rate ranges: Paramount Business Jets, 2026 published averages.
 * Estimates exclude the 7.5% US federal excise tax, positioning flights,
 * airport/FBO fees, crew overnights and catering. Operators quote the final price.
 */

export type JetCategory = "very_light" | "light" | "midsize" | "super_midsize" | "heavy" | "ultra_long";

export interface JetClass {
  id: JetCategory;
  name: string;
  seats: number;
  rangeNm: number; // typical max nonstop range
  speedKts: number; // typical cruise
  rate: [number, number]; // USD per flight hour
  examples: string;
}

export const JET_CLASSES: JetClass[] = [
  { id: "very_light", name: "Very light jet", seats: 4, rangeNm: 1300, speedKts: 340, rate: [2900, 3400], examples: "Phenom 100, Citation M2" },
  { id: "light", name: "Light jet", seats: 7, rangeNm: 1800, speedKts: 400, rate: [3750, 4200], examples: "Phenom 300, Citation CJ4" },
  { id: "midsize", name: "Midsize jet", seats: 8, rangeNm: 2300, speedKts: 430, rate: [4700, 5500], examples: "Citation XLS+, Learjet 60" },
  { id: "super_midsize", name: "Super midsize jet", seats: 9, rangeNm: 3300, speedKts: 460, rate: [6200, 7500], examples: "Challenger 350, Citation Longitude" },
  { id: "heavy", name: "Heavy jet", seats: 13, rangeNm: 4500, speedKts: 470, rate: [8500, 10000], examples: "Gulfstream G450, Falcon 900" },
  { id: "ultra_long", name: "Ultra long range", seats: 14, rangeNm: 7000, speedKts: 490, rate: [12000, 17000], examples: "Gulfstream G650, Global 7500" },
];

export function distanceNm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 3440.1, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export interface JetEstimate {
  category: JetClass;
  hoursPerLeg: number;
  fuelStops: number;
  low: number;
  high: number;
  fits: boolean; // enough seats
}

/** One estimate per category for a route. */
export function estimateJets(nm: number, passengers: number, roundTrip: boolean): JetEstimate[] {
  return JET_CLASSES.map((c) => {
    const fuelStops = Math.max(0, Math.ceil(nm / c.rangeNm) - 1);
    // Airborne time + ~20 min taxi/climb per leg + ~45 min per fuel stop.
    const hoursPerLeg = nm / c.speedKts + 0.33 + fuelStops * 0.75;
    const billable = Math.max(1, hoursPerLeg) * (roundTrip ? 2 : 1);
    const round = (n: number) => Math.round(n / 100) * 100;
    return {
      category: c,
      hoursPerLeg: Math.round(hoursPerLeg * 10) / 10,
      fuelStops,
      low: round(billable * c.rate[0]),
      high: round(billable * c.rate[1]),
      fits: passengers <= c.seats,
    };
  });
}

export function hoursLabel(h: number) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${hh}h${mm ? ` ${String(mm).padStart(2, "0")}m` : ""}`;
}
