import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import { CRUISE_SHIPS, REGIONS, type CruiseRegion, type SuiteCategory } from "./cruises";
import { ValidationError } from "./validate";

export type CruiseRequestStatus = "new" | "quoted" | "booked" | "closed";

export interface CruiseRequest {
  id: string;
  createdAt: string;
  status: CruiseRequestStatus;
  region: CruiseRegion | "any";
  shipId?: string; // specific ship, or unset for "best available"
  departMonth: string; // YYYY-MM, approximate sail month
  nights: number;
  guests: number;
  suite: SuiteCategory;
  estimate?: { low: number; high: number };
  name: string;
  email: string;
  phone: string;
  notes: string;
  userId?: string;
  adminNote?: string;
}

const NS = "cruise-requests";
const INDEX = "cruise-requests-index";

const MONTH = /^\d{4}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUITES: SuiteCategory[] = ["veranda", "grand", "owners"];

export function parseCruiseRequest(b: Record<string, unknown>, userId?: string): CruiseRequest {
  const today = new Date().toISOString().slice(0, 7);
  const region = String(b.region ?? "any") as CruiseRequest["region"];
  const shipId = b.shipId ? String(b.shipId) : undefined;
  const r: CruiseRequest = {
    id: `cruise_${crypto.randomBytes(8).toString("base64url")}`,
    createdAt: new Date().toISOString(),
    status: "new",
    region,
    shipId,
    departMonth: String(b.departMonth ?? ""),
    nights: Number(b.nights),
    guests: Number(b.guests),
    suite: (String(b.suite ?? "veranda") as SuiteCategory),
    estimate:
      b.estimate && typeof b.estimate === "object"
        ? { low: Number((b.estimate as { low: unknown }).low) || 0, high: Number((b.estimate as { high: unknown }).high) || 0 }
        : undefined,
    name: String(b.name ?? "").trim().slice(0, 80),
    email: String(b.email ?? "").trim().toLowerCase().slice(0, 120),
    phone: String(b.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20),
    notes: String(b.notes ?? "").trim().slice(0, 1000),
    userId,
  };
  if (region !== "any" && !REGIONS.includes(region)) throw new ValidationError("Unknown region.");
  if (shipId && !CRUISE_SHIPS.some((s) => s.id === shipId)) throw new ValidationError("Unknown ship.");
  if (!MONTH.test(r.departMonth) || r.departMonth < today) throw new ValidationError("Choose a sailing month from this month on.");
  if (!Number.isInteger(r.nights) || r.nights < 3 || r.nights > 60) throw new ValidationError("Nights must be 3–60.");
  if (!Number.isInteger(r.guests) || r.guests < 1 || r.guests > 8) throw new ValidationError("Guests must be 1–8.");
  if (!SUITES.includes(r.suite)) throw new ValidationError("Unknown suite category.");
  if (r.name.length < 2) throw new ValidationError("Enter your name.");
  if (!EMAIL.test(r.email)) throw new ValidationError("Enter a valid email.");
  if (!/^\+?\d{7,15}$/.test(r.phone)) throw new ValidationError("Enter a phone number with country code.");
  return r;
}

export async function saveCruiseRequest(r: CruiseRequest) {
  await kvSet(NS, r.id, r);
  await serial(async () => {
    const ids = (await kvGet<string[]>(INDEX, "all")) ?? [];
    await kvSet(INDEX, "all", [r.id, ...ids]);
    if (r.userId) {
      const mine = (await kvGet<string[]>(INDEX, r.userId)) ?? [];
      await kvSet(INDEX, r.userId, [r.id, ...mine]);
    }
  });
  return r;
}

async function load(ids: string[]) {
  const all = await Promise.all(ids.map((id) => kvGet<CruiseRequest>(NS, id)));
  return all.filter((x): x is CruiseRequest => Boolean(x));
}

export async function allCruiseRequests() {
  return load((await kvGet<string[]>(INDEX, "all")) ?? []);
}

export async function cruiseRequestsForUser(userId: string) {
  return load((await kvGet<string[]>(INDEX, userId)) ?? []);
}

export function updateCruiseRequest(id: string, patch: Partial<Pick<CruiseRequest, "status" | "adminNote">>) {
  return serial(async () => {
    const cur = await kvGet<CruiseRequest>(NS, id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await kvSet(NS, id, next);
    return next;
  });
}
