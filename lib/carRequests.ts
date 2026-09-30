import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import { CLASS_LABEL, type CarClass } from "./cars";
import { ValidationError } from "./validate";

export type CarRequestStatus = "new" | "quoted" | "booked" | "closed";

export interface CarRequest {
  id: string;
  createdAt: string;
  status: CarRequestStatus;
  pickupLocation: string; // free text, e.g. "Paris, France" or an airport code
  slug?: string; // matched destination guide, if any
  dropoffLocation?: string; // unset when same as pickup
  pickupDate: string; // YYYY-MM-DD
  dropoffDate: string; // YYYY-MM-DD
  carClass: CarClass;
  driverAge: "25plus" | "21to24" | "under21";
  estimate?: { low: number; high: number };
  name: string;
  email: string;
  phone: string;
  notes: string;
  userId?: string;
  adminNote?: string;
}

const NS = "car-requests";
const INDEX = "car-requests-index";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLASSES = Object.keys(CLASS_LABEL) as CarClass[];
const AGES = ["25plus", "21to24", "under21"] as const;

export function parseCarRequest(b: Record<string, unknown>, userId?: string): CarRequest {
  const today = new Date().toISOString().slice(0, 10);
  const dropoff = b.dropoffLocation ? String(b.dropoffLocation).trim().slice(0, 80) : "";
  const r: CarRequest = {
    id: `car_${crypto.randomBytes(8).toString("base64url")}`,
    createdAt: new Date().toISOString(),
    status: "new",
    pickupLocation: String(b.pickupLocation ?? "").trim().slice(0, 80),
    slug: b.slug ? String(b.slug) : undefined,
    dropoffLocation: dropoff || undefined,
    pickupDate: String(b.pickupDate ?? ""),
    dropoffDate: String(b.dropoffDate ?? ""),
    carClass: (String(b.carClass ?? "compact") as CarClass),
    driverAge: (String(b.driverAge ?? "25plus") as CarRequest["driverAge"]),
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
  if (r.pickupLocation.length < 2) throw new ValidationError("Enter a pickup city or airport.");
  if (!DATE.test(r.pickupDate) || r.pickupDate < today) throw new ValidationError("Choose a pickup date from today on.");
  if (!DATE.test(r.dropoffDate) || r.dropoffDate <= r.pickupDate) throw new ValidationError("Drop-off must be after pickup.");
  if (!CLASSES.includes(r.carClass)) throw new ValidationError("Unknown car class.");
  if (!AGES.includes(r.driverAge)) throw new ValidationError("Unknown driver age range.");
  if (r.name.length < 2) throw new ValidationError("Enter your name.");
  if (!EMAIL.test(r.email)) throw new ValidationError("Enter a valid email.");
  if (!/^\+?\d{7,15}$/.test(r.phone)) throw new ValidationError("Enter a phone number with country code.");
  return r;
}

export async function saveCarRequest(r: CarRequest) {
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
  const all = await Promise.all(ids.map((id) => kvGet<CarRequest>(NS, id)));
  return all.filter((x): x is CarRequest => Boolean(x));
}

export async function allCarRequests() {
  return load((await kvGet<string[]>(INDEX, "all")) ?? []);
}

export async function carRequestsForUser(userId: string) {
  return load((await kvGet<string[]>(INDEX, userId)) ?? []);
}

export function updateCarRequest(id: string, patch: Partial<Pick<CarRequest, "status" | "adminNote">>) {
  return serial(async () => {
    const cur = await kvGet<CarRequest>(NS, id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await kvSet(NS, id, next);
    return next;
  });
}
