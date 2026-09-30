import type { CabinClass, ContactInput, PassengerInput, SearchLeg, SearchParams } from "./types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const IATA = /^[A-Z]{3}$/;
const CABINS: CabinClass[] = ["economy", "premium_economy", "business", "first"];

export class ValidationError extends Error {}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/** "LHR|CDG|2026-11-15,CDG|FCO|2026-11-20" -> legs 2+ of a multi-city search. */
function parseExtraLegs(raw: unknown, departDate: string): SearchLeg[] | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const legs = s.split(",").map((chunk) => {
    const [origin, destination, date] = chunk.split("|");
    return { origin: (origin ?? "").toUpperCase(), destination: (destination ?? "").toUpperCase(), departDate: date ?? "" };
  });
  let prevDate = departDate;
  for (const l of legs) {
    if (!IATA.test(l.origin) || !IATA.test(l.destination)) throw new ValidationError("Choose an airport for every flight.");
    if (l.origin === l.destination) throw new ValidationError("Each flight needs a different origin and destination.");
    if (!DATE.test(l.departDate) || l.departDate < prevDate) throw new ValidationError("Each flight must be on or after the one before it.");
    prevDate = l.departDate;
  }
  if (legs.length < 1 || legs.length > 5) throw new ValidationError("Multi-city trips need 2 to 6 flights.");
  return legs;
}

export function parseSearch(input: Record<string, unknown>): SearchParams {
  const origin = String(input.origin ?? "").toUpperCase();
  const destination = String(input.destination ?? "").toUpperCase();
  const departDate = String(input.departDate ?? "");
  const returnDate = input.returnDate ? String(input.returnDate) : undefined;
  const extraLegs = parseExtraLegs(input.extraLegs, departDate);
  const adults = Number(input.adults ?? 1);
  const childAges = String(input.childAges ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const cabin = String(input.cabin ?? "economy") as CabinClass;

  if (!IATA.test(origin) || !IATA.test(destination)) throw new ValidationError("Choose where you're flying from and to.");
  if (origin === destination) throw new ValidationError("Origin and destination must differ.");
  if (!DATE.test(departDate) || departDate < todayUtc()) throw new ValidationError("Choose a departure date from today on.");
  if (extraLegs && returnDate) throw new ValidationError("A multi-city trip can't also have a return date.");
  if (returnDate && (!DATE.test(returnDate) || returnDate < departDate)) throw new ValidationError("Return must be on or after departure.");
  if (!Number.isInteger(adults) || adults < 1 || adults > 9) throw new ValidationError("1 to 9 adults per booking.");
  if (childAges.some((a) => !Number.isInteger(a) || a < 0 || a > 17)) throw new ValidationError("Child ages must be 0–17.");
  if (adults + childAges.length > 9) throw new ValidationError("Up to 9 travelers per booking.");
  if (childAges.filter((a) => a < 2).length > adults) throw new ValidationError("Each infant needs an adult.");
  if (!CABINS.includes(cabin)) throw new ValidationError("Unknown cabin class.");
  return { origin, destination, departDate, returnDate, extraLegs, adults, childAges, cabin };
}

const NAME = /^[A-Za-z][A-Za-z' -]{0,49}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9]\d{6,14}$/;

export function parsePassengers(list: unknown, expectedIds: string[]): PassengerInput[] {
  if (!Array.isArray(list) || list.length !== expectedIds.length) throw new ValidationError("Enter details for every traveler.");
  return list.map((raw: Record<string, unknown>, i) => {
    const p = {
      id: String(raw.id ?? ""),
      title: String(raw.title ?? "") as PassengerInput["title"],
      givenName: String(raw.givenName ?? "").trim(),
      familyName: String(raw.familyName ?? "").trim(),
      gender: String(raw.gender ?? "") as PassengerInput["gender"],
      bornOn: String(raw.bornOn ?? ""),
    };
    const n = `Traveler ${i + 1}`;
    if (!expectedIds.includes(p.id)) throw new ValidationError(`${n}: unknown traveler.`);
    if (!["mr", "ms", "mrs", "miss", "dr"].includes(p.title)) throw new ValidationError(`${n}: choose a title.`);
    if (!NAME.test(p.givenName) || !NAME.test(p.familyName))
      throw new ValidationError(`${n}: use the name exactly as on the passport, Latin letters only.`);
    if (!["m", "f"].includes(p.gender)) throw new ValidationError(`${n}: choose gender as on the passport.`);
    if (!DATE.test(p.bornOn) || p.bornOn >= todayUtc()) throw new ValidationError(`${n}: enter a valid date of birth.`);
    return p;
  });
}

export function parseContact(raw: Record<string, unknown>): ContactInput {
  const email = String(raw?.email ?? "").trim();
  const phone = String(raw?.phone ?? "").replace(/[\s()-]/g, "");
  if (!EMAIL.test(email)) throw new ValidationError("Enter a valid email.");
  if (!PHONE.test(phone)) throw new ValidationError("Enter the phone with country code, e.g. +1 917 555 0100.");
  return { email, phone };
}
