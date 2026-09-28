import { EXTRAS, NEW_GUIDES } from "./guides20";
import { MORE } from "./guides20b";

/**
 * Destination guides. Plain data, safe in the browser.
 * iata lists every code a search might use for the place (city code + airports).
 */

export interface Destination {
  slug: string;
  name: string;
  country: string;
  iata: string[];
  mainAirport: string;
  tagline: string;
  intro: string;
  bestTime: string;
  todo: { title: string; text: string }[];
  neighborhoods: string;
  tip: string;
  // Full-guide fields (top-20 cities)
  region?: string;
  arrivals?: string; // e.g. "30.3M international visitors (2025)"
  airport?: string;
  gettingAround?: string;
  food?: string[];
  currency?: string;
  language?: string;
  goodToKnow?: string[];
  tours?: Tour[];
  hotels?: { name: string; area: string; tier: "Luxury" | "Mid-range" | "Value" }[];
  transit?: string[];
  events?: { name: string; when: string; text: string }[];
  nightlife?: string;
  sports?: string;
  /** Entry requirement for a US passport holder, as of Sept 2026. Rules change — always verify with the embassy or airline before booking. */
  visaUS?: string;
}

/** Tours R Travel plans to offer; shown as "coming soon" with a notify-me signup. */
export interface Tour {
  id: string;
  name: string;
  duration: string;
  summary: string;
  highlights: string[];
}

const BASE: Destination[] = [
  {
    slug: "tel-aviv", name: "Tel Aviv", country: "Israel", iata: ["TLV"], mainAirport: "TLV",
    tagline: "Beaches, Bauhaus and a city that never slows down.",
    intro: "Tel Aviv packs Mediterranean beaches, a serious food scene and ancient Jaffa into one compact, walkable city.",
    bestTime: "April–June and September–November: warm sea, fewer heatwaves.",
    todo: [
      { title: "Old Jaffa and the port", text: "Walk the stone alleys, the flea market and the harbor at sunset." },
      { title: "Carmel Market", text: "Street food, spices and fresh juice; go hungry, before noon." },
      { title: "The promenade", text: "Cycle or walk the seafront from Jaffa to the Tel Aviv Port." },
      { title: "White City", text: "UNESCO-listed Bauhaus buildings around Rothschild Boulevard." },
      { title: "Neve Tzedek", text: "Boutiques and cafés in the city's first neighborhood." },
      { title: "Day trip to Jerusalem", text: "About an hour by train to the Old City." },
    ],
    neighborhoods: "Stay near the beach (Gordon, Frishman) or in Neve Tzedek for a quieter base.",
    tip: "Much of the city pauses from Friday afternoon to Saturday evening; plan transport around it.",
  },
  {
    slug: "london", name: "London", country: "United Kingdom", iata: ["LON", "LHR", "LGW", "STN", "LCY", "LTN"], mainAirport: "LHR",
    tagline: "Royal history, world-class museums, pubs on every corner.",
    intro: "London mixes centuries of history with galleries, theatre and neighborhoods that each feel like their own town.",
    bestTime: "May–September for long days; December for the festive lights.",
    todo: [
      { title: "Westminster and the South Bank", text: "Big Ben, the Abbey, then walk the river to Tate Modern." },
      { title: "Free museums", text: "British Museum, National Gallery and the Natural History Museum cost nothing." },
      { title: "Tower of London", text: "See the Crown Jewels, then cross Tower Bridge." },
      { title: "West End show", text: "Book ahead or try the TKTS booth in Leicester Square." },
      { title: "Borough Market", text: "London's best food market, near London Bridge." },
      { title: "Notting Hill and Hyde Park", text: "Pastel houses, Portobello Road, then a long park walk." },
    ],
    neighborhoods: "Covent Garden and South Bank are central; Shoreditch for nightlife.",
    tip: "Tap a contactless card on the Tube; fares cap daily automatically.",
  },
  {
    slug: "paris", name: "Paris", country: "France", iata: ["PAR", "CDG", "ORY"], mainAirport: "CDG",
    tagline: "Cafés, boulevards and the greatest museums on earth.",
    intro: "Paris rewards slow days: long lunches, river walks and a museum or two in between.",
    bestTime: "April–June and September–October.",
    todo: [
      { title: "Louvre and Musée d'Orsay", text: "Book timed tickets; go early or on late-opening nights." },
      { title: "Eiffel Tower", text: "Go up at sunset, or picnic on the Champ de Mars." },
      { title: "Le Marais", text: "Falafel on Rue des Rosiers, galleries and the Place des Vosges." },
      { title: "Montmartre", text: "Sacré-Cœur views and the old painters' square." },
      { title: "Seine at night", text: "A river cruise or a walk along the lit quays." },
      { title: "Day trip to Versailles", text: "About 40 minutes by RER C." },
    ],
    neighborhoods: "Saint-Germain for classic Paris, Le Marais for energy.",
    tip: "Many museums close Monday or Tuesday; check before planning your week.",
  },
  {
    slug: "rome", name: "Rome", country: "Italy", iata: ["ROM", "FCO", "CIA"], mainAirport: "FCO",
    tagline: "Three thousand years of history, and the pasta to match.",
    intro: "Rome is an open-air museum where you trip over ancient ruins on the way to dinner.",
    bestTime: "April–May and late September–October.",
    todo: [
      { title: "Colosseum and Forum", text: "One ticket covers both plus the Palatine Hill." },
      { title: "Vatican Museums", text: "Sistine Chapel and St. Peter's; book the first entry slot." },
      { title: "Pantheon and Piazza Navona", text: "Walk between them through the old center." },
      { title: "Trevi Fountain", text: "Visit very early or late to beat the crowds." },
      { title: "Trastevere", text: "Cobbled lanes and the city's best trattorias." },
      { title: "Borghese Gallery", text: "Bernini and Caravaggio; reservations required." },
    ],
    neighborhoods: "Centro Storico to walk everywhere; Trastevere for evenings.",
    tip: "Fill water bottles at the free public fountains (nasoni).",
  },
  {
    slug: "barcelona", name: "Barcelona", country: "Spain", iata: ["BCN"], mainAirport: "BCN",
    tagline: "Gaudí, beaches and tapas until midnight.",
    intro: "Barcelona pairs modernist architecture with a city beach and a late-night food culture.",
    bestTime: "May–June and September.",
    todo: [
      { title: "Sagrada Família", text: "Gaudí's basilica; book tower access in advance." },
      { title: "Park Güell", text: "Mosaic terraces and city views; timed entry." },
      { title: "Gothic Quarter", text: "Medieval streets around the cathedral." },
      { title: "La Boqueria", text: "The famous market off La Rambla." },
      { title: "Barceloneta beach", text: "Swim, then seafood on the promenade." },
      { title: "Montjuïc", text: "Cable car, castle and the Miró Foundation." },
    ],
    neighborhoods: "Eixample for elegance, El Born for bars and boutiques.",
    tip: "Dinner starts around 9pm; lunch is the main meal.",
  },
  {
    slug: "miami", name: "Miami", country: "United States", iata: ["MIA", "FLL"], mainAirport: "MIA",
    tagline: "Art deco, ocean, and Latin flavor year-round.",
    intro: "Miami is beach days, Cuban coffee and a nightlife and art scene that runs late.",
    bestTime: "November–April, before the humid season.",
    todo: [
      { title: "South Beach and Ocean Drive", text: "Art deco hotels and a wide sandy beach." },
      { title: "Wynwood Walls", text: "Outdoor street-art museum and galleries." },
      { title: "Little Havana", text: "Calle Ocho, cafecito and domino park." },
      { title: "Everglades", text: "Airboat tours about an hour away." },
      { title: "Key Biscayne", text: "Quieter beaches and a lighthouse state park." },
      { title: "Design District", text: "Architecture, galleries and flagship stores." },
    ],
    neighborhoods: "South Beach for the classic trip; Brickell for a city base.",
    tip: "Hurricane season runs June–November; look at flexible fares.",
  },
  {
    slug: "cancun", name: "Cancún", country: "Mexico", iata: ["CUN"], mainAirport: "CUN",
    tagline: "Turquoise water and Maya ruins.",
    intro: "Cancún is the gateway to the Riviera Maya: reef-lined beaches, cenotes and ancient cities.",
    bestTime: "December–April, the dry season.",
    todo: [
      { title: "Isla Mujeres", text: "Ferry over, rent a golf cart, swim at Playa Norte." },
      { title: "Chichén Itzá", text: "The great Maya pyramid; leave early." },
      { title: "Cenotes", text: "Swim in freshwater sinkholes near Tulum and Valladolid." },
      { title: "Tulum", text: "Cliff-top ruins above the Caribbean." },
      { title: "Snorkeling", text: "The underwater museum (MUSA) and reef tours." },
      { title: "Playa del Carmen", text: "Fifth Avenue's shops and beach clubs." },
    ],
    neighborhoods: "Hotel Zone for beaches; Playa del Carmen for a town feel.",
    tip: "Use reef-safe sunscreen; it is required at many cenotes and parks.",
  },
  {
    slug: "tokyo", name: "Tokyo", country: "Japan", iata: ["TYO", "HND", "NRT"], mainAirport: "HND",
    tagline: "Neon, temples and the best food of your life.",
    intro: "Tokyo moves from quiet shrines to glowing crossings in a single subway stop.",
    bestTime: "Late March–April (cherry blossom) and October–November.",
    todo: [
      { title: "Shibuya and Harajuku", text: "The famous crossing, then Meiji Shrine next door." },
      { title: "Asakusa", text: "Sensō-ji temple and Nakamise shopping street." },
      { title: "Tsukiji Outer Market", text: "Sushi and street snacks for breakfast." },
      { title: "Shinjuku by night", text: "Omoide Yokocho alleys and city views." },
      { title: "teamLab", text: "Immersive digital art; book ahead." },
      { title: "Day trip to Nikko or Hakone", text: "Temples or hot springs with Mt. Fuji views." },
    ],
    neighborhoods: "Shinjuku or Shibuya for transport links; Ginza for calm.",
    tip: "Get a Suica or Pasmo card on your phone for trains and shops.",
  },
  {
    slug: "dubai", name: "Dubai", country: "United Arab Emirates", iata: ["DXB", "DWC"], mainAirport: "DXB",
    tagline: "Skyscrapers, desert and luxury on every level.",
    intro: "Dubai is record-breaking towers, beach resorts and desert dunes a short drive away.",
    bestTime: "November–March, when days are warm, not scorching.",
    todo: [
      { title: "Burj Khalifa", text: "Book a sunset slot for the observation deck." },
      { title: "Desert safari", text: "Dune drive, camel ride and dinner under the stars." },
      { title: "Old Dubai", text: "Abra boat across the Creek to the gold and spice souks." },
      { title: "Dubai Mall and fountain show", text: "Shows every evening at the tower's base." },
      { title: "Beaches", text: "JBR and Kite Beach are free and lively." },
      { title: "Museum of the Future", text: "Striking building and exhibits; timed tickets." },
    ],
    neighborhoods: "Downtown for sights; Dubai Marina or JBR for the beach.",
    tip: "Dress modestly in malls and older districts.",
  },
  {
    slug: "bangkok", name: "Bangkok", country: "Thailand", iata: ["BKK", "DMK"], mainAirport: "BKK",
    tagline: "Golden temples, street food, river life.",
    intro: "Bangkok is a sensory rush of temples, markets and some of the world's best street food.",
    bestTime: "November–February, the cool dry season.",
    todo: [
      { title: "Grand Palace and Wat Pho", text: "The Reclining Buddha is next door." },
      { title: "Wat Arun", text: "Cross the river by boat; stunning at sunset." },
      { title: "Chao Phraya ferry", text: "The cheapest river tour in town." },
      { title: "Chinatown food", text: "Yaowarat Road comes alive after dark." },
      { title: "Chatuchak Market", text: "Huge weekend market with everything." },
      { title: "Rooftop bars", text: "Skyline views from Silom and Sukhumvit." },
    ],
    neighborhoods: "Riverside for sights; Sukhumvit for food and nightlife.",
    tip: "Cover shoulders and knees at temples.",
  },
  {
    slug: "athens", name: "Athens", country: "Greece", iata: ["ATH"], mainAirport: "ATH",
    tagline: "The Acropolis, then the islands.",
    intro: "Athens is ancient history in a lively modern city, and the jumping-off point for the Greek islands.",
    bestTime: "April–June and September–October.",
    todo: [
      { title: "Acropolis", text: "Go at opening time; then the Acropolis Museum." },
      { title: "Plaka and Anafiotika", text: "Whitewashed lanes under the Acropolis." },
      { title: "Ancient Agora", text: "The heart of ancient Athens." },
      { title: "Lycabettus Hill", text: "Sunset over the whole city." },
      { title: "Athens Riviera", text: "Beaches and seafood a tram ride away." },
      { title: "Island ferry", text: "Aegina or Hydra make easy day trips from Piraeus." },
    ],
    neighborhoods: "Plaka or Koukaki, within walking distance of the Acropolis.",
    tip: "Summer midday heat is intense; do sights in the morning.",
  },
  {
    slug: "new-york", name: "New York", country: "United States", iata: ["NYC", "JFK", "EWR", "LGA"], mainAirport: "JFK",
    tagline: "The city that has everything.",
    intro: "New York is five boroughs of museums, food, Broadway and skyline views.",
    bestTime: "April–June and September–November.",
    todo: [
      { title: "Central Park", text: "Rent a bike or walk from the Plaza to the Reservoir." },
      { title: "Brooklyn Bridge to DUMBO", text: "Walk over for the skyline views." },
      { title: "The Met and MoMA", text: "Two of the world's great art museums." },
      { title: "Broadway", text: "Discount tickets at the TKTS booth in Times Square." },
      { title: "The High Line", text: "Elevated park ending at Hudson Yards." },
      { title: "Statue of Liberty", text: "Or take the free Staten Island Ferry for the view." },
    ],
    neighborhoods: "Midtown for sights; the West Village or Williamsburg for local life.",
    tip: "Tap a contactless card on the subway; fares cap weekly.",
  },
  {
    slug: "lisbon", name: "Lisbon", country: "Portugal", iata: ["LIS"], mainAirport: "LIS",
    tagline: "Hills, trams, pastries and Atlantic light.",
    intro: "Lisbon's tiled streets, viewpoints and seafood make it one of Europe's easiest cities to love.",
    bestTime: "March–June and September–October.",
    todo: [
      { title: "Alfama", text: "Oldest quarter; fado music in the evening." },
      { title: "Tram 28", text: "The classic ride through the old hills." },
      { title: "Belém", text: "Jerónimos Monastery and the original pastéis de nata." },
      { title: "Miradouros", text: "Viewpoints like Senhora do Monte at sunset." },
      { title: "LX Factory", text: "Shops, cafés and street art in an old mill." },
      { title: "Day trip to Sintra", text: "Fairy-tale palaces, 40 minutes by train." },
    ],
    neighborhoods: "Chiado or Baixa for access; Príncipe Real for boutique stays.",
    tip: "Wear shoes with grip; the stone pavements are slippery.",
  },
  {
    slug: "amsterdam", name: "Amsterdam", country: "Netherlands", iata: ["AMS"], mainAirport: "AMS",
    tagline: "Canals, cycling and masterpieces.",
    intro: "Amsterdam is best by bike and boat, with world-class museums along the way.",
    bestTime: "April–May for tulips; June–August for long days.",
    todo: [
      { title: "Rijksmuseum", text: "Rembrandt and Vermeer; book ahead." },
      { title: "Van Gogh Museum", text: "Timed tickets sell out, reserve early." },
      { title: "Anne Frank House", text: "Tickets released online only; book weeks ahead." },
      { title: "Canal cruise", text: "See the Golden Age houses from the water." },
      { title: "Jordaan", text: "Quiet canals, cafés and markets." },
      { title: "Keukenhof (spring)", text: "Seven million tulips, a short trip away." },
    ],
    neighborhoods: "The canal ring or Jordaan for charm; De Pijp for food.",
    tip: "Watch for bikes; stay out of red bike lanes.",
  },
];

/**
 * Visa/entry requirement for a US passport holder, by destination slug, as of Sept 2026.
 * Domestic US cities need none. Everything else: always double-check with the embassy or
 * airline before booking — rules like the UK ETA and EU ETIAS have been changing this year.
 */
const VISA_US: Record<string, string> = {
  "tel-aviv": "No visa needed. Visa-free entry for up to 90 days.",
  london: "Electronic Travel Authorisation (ETA) required before you fly — apply online, about £20 (~$27), approval usually within minutes to a few days. Valid 2 years / unlimited trips; each stay up to 6 months.",
  paris: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. The EU's ETIAS pre-registration has been delayed to 2027 and isn't required yet.",
  rome: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. ETIAS pre-registration is delayed to 2027, not required yet.",
  barcelona: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. ETIAS pre-registration is delayed to 2027, not required yet.",
  miami: "No visa needed — domestic travel for US citizens.",
  cancun: "No visa needed. A tourist card (FMM) is required — usually included in your airfare or issued on arrival — for stays up to 180 days.",
  tokyo: "No visa needed. Visa-free entry for up to 90 days.",
  dubai: "No visa needed. Free visa on arrival for up to 30 days for US passport holders, extendable.",
  bangkok: "No visa needed for short visits. Visa-exempt stays were cut from 60 to 30 days as of September 15, 2026.",
  athens: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. ETIAS pre-registration is delayed to 2027, not required yet.",
  "new-york": "No visa needed — domestic travel for US citizens.",
  lisbon: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. ETIAS pre-registration is delayed to 2027, not required yet.",
  amsterdam: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. ETIAS pre-registration is delayed to 2027, not required yet.",
  "hong-kong": "No visa needed. Visa-free entry for up to 90 days (Hong Kong SAR has its own entry rules, separate from mainland China).",
  macau: "No visa needed. Visa-free entry for up to 90 days (Macau SAR has its own entry rules, separate from mainland China).",
  istanbul: "e-Visa required — apply online before you fly (roughly $50), multiple entry, valid for stays up to 90 days in any 180-day period.",
  mecca: "A Saudi tourist e-visa is available online, but it does not grant access to Mecca or Madinah themselves — the holy sites and their city centers are restricted to Muslims only. Visiting for Hajj or Umrah requires a separate religious visa with proof of faith, arranged through an authorized agent.",
  antalya: "e-Visa required — apply online before you fly (roughly $50), multiple entry, valid for stays up to 90 days in any 180-day period.",
  "kuala-lumpur": "No visa needed. Visa-free entry for up to 90 days.",
  madrid: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. ETIAS pre-registration is delayed to 2027, not required yet.",
  milan: "No visa needed for stays up to 90 days in any 180-day period (Schengen area). Since April 2026, first entries are registered biometrically (EES) at the border — no advance application. ETIAS pre-registration is delayed to 2027, not required yet.",
  singapore: "No visa needed. Visa-free entry for up to 90 days.",
  seoul: "No visa needed for stays up to 90 days. South Korea's K-ETA is temporarily waived for US citizens through the end of 2026 — check before booking in case it's reinstated.",
  osaka: "No visa needed. Visa-free entry for up to 90 days.",
  taipei: "No visa needed. Visa-free entry for up to 90 days.",
  kyoto: "No visa needed. Visa-free entry for up to 90 days.",
};

/** Short guides, upgraded to full guides where extra data exists, plus the new top-20 guides. */
export const DESTINATIONS: Destination[] = [...BASE.map((d) => ({ ...d, ...EXTRAS[d.slug] })), ...NEW_GUIDES].map((d) => ({
  ...d,
  ...MORE[d.slug],
  visaUS: VISA_US[d.slug],
}));

/** The 20 most-visited / top-ranked cities (Euromonitor 2025). */
export const TOP20 = [
  "bangkok", "hong-kong", "london", "macau", "istanbul", "dubai", "mecca", "antalya", "paris", "kuala-lumpur",
  "madrid", "tokyo", "rome", "milan", "singapore", "seoul", "osaka", "taipei", "kyoto", "new-york",
];

export function destinationForIata(iata?: string | null) {
  if (!iata) return undefined;
  return DESTINATIONS.find((d) => d.iata.includes(iata.toUpperCase()));
}

export function destinationBySlug(slug: string) {
  return DESTINATIONS.find((d) => d.slug === slug);
}
