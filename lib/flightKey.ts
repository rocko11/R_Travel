/** Identifies an itinerary by its flight numbers: "-" within a slice, "|" between slices. */
export function flightKey(o: { slices: { segments: { flightNumber: string }[] }[] }) {
  return o.slices.map((s) => s.segments.map((g) => g.flightNumber).join("-")).join("|");
}
