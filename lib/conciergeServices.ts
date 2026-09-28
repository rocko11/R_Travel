/** Concierge service types. Plain data, safe in the browser. */
export const CONCIERGE_SERVICES = [
  { id: "private-tour", label: "Private tours and guides" },
  { id: "restaurant", label: "Restaurant reservations" },
  { id: "attraction", label: "Attraction and museum tickets" },
  { id: "event", label: "Concerts, shows and sports tickets" },
  { id: "nightlife", label: "Nightlife and VIP tables" },
  { id: "transfer", label: "Airport transfers and chauffeurs" },
  { id: "vip-airport", label: "VIP airport fast track and lounges" },
  { id: "hotel", label: "Hotel and villa bookings" },
  { id: "yacht", label: "Yacht and boat charters" },
  { id: "spa", label: "Spa and wellness" },
  { id: "celebration", label: "Birthdays, proposals and special occasions" },
  { id: "other", label: "Anything else" },
] as const;

export type ConciergeService = (typeof CONCIERGE_SERVICES)[number]["id"];

export const BUDGET_OPTIONS = ["Flexible", "Up to $500", "$500–$2,000", "$2,000–$10,000", "$10,000+"];
