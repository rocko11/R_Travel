import type { SearchLeg, SearchParams } from "./types";

/**
 * The full ordered list of flights a search represents: one-way is 1 leg, round trip is 2
 * (the return leg derived from origin/destination/returnDate), multi-city is however many
 * legs the user built (extraLegs holds leg 2 onward). Used by both the real Duffel search
 * and the demo generator so they build the same itinerary shape.
 */
export function searchLegs(q: SearchParams): SearchLeg[] {
  const first: SearchLeg = { origin: q.origin, destination: q.destination, departDate: q.departDate };
  if (q.extraLegs?.length) return [first, ...q.extraLegs];
  if (q.returnDate) return [first, { origin: q.destination, destination: q.origin, departDate: q.returnDate }];
  return [first];
}
