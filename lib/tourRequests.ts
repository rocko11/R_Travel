import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import { ValidationError } from "./validate";

export type TourRequestStatus = "new" | "quoted" | "booked" | "closed";

export interface TourRequest {
  id: string;
  createdAt: string;
  status: TourRequestStatus;
  destination: string; // e.g. "Paris (CDG)"
  slug?: string; // matched destination guide, if any
  tourName?: string; // specific tour, or unset for "best available"
  date: string; // YYYY-MM-DD
  travelers: number;
  estimate?: { low: number; high: number };
  name: string;
  email: string;
  phone: string;
  notes: string;
  userId?: string;
  adminNote?: string;
}

const NS = "tour-requests";
const INDEX = "tour-requests-index";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseTourRequest(b: Record<string, unknown>, userId?: string): TourRequest {
  const today = new Date().toISOString().slice(0, 10);
  const r: TourRequest = {
    id: `tour_${crypto.randomBytes(8).toString("base64url")}`,
    createdAt: new Date().toISOString(),
    status: "new",
    destination: String(b.destination ?? "").trim().slice(0, 80),
    slug: b.slug ? String(b.slug) : undefined,
    tourName: b.tourName ? String(b.tourName).slice(0, 120) : undefined,
    date: String(b.date ?? ""),
    travelers: Number(b.travelers),
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
  if (r.destination.length < 2) throw new ValidationError("Enter a city or destination.");
  if (!DATE.test(r.date) || r.date < today) throw new ValidationError("Choose a tour date from today on.");
  if (!Number.isInteger(r.travelers) || r.travelers < 1 || r.travelers > 20) throw new ValidationError("Travelers must be 1–20.");
  if (r.name.length < 2) throw new ValidationError("Enter your name.");
  if (!EMAIL.test(r.email)) throw new ValidationError("Enter a valid email.");
  if (!/^\+?\d{7,15}$/.test(r.phone)) throw new ValidationError("Enter a phone number with country code.");
  return r;
}

export async function saveTourRequest(r: TourRequest) {
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
  const all = await Promise.all(ids.map((id) => kvGet<TourRequest>(NS, id)));
  return all.filter((x): x is TourRequest => Boolean(x));
}

export async function allTourRequests() {
  return load((await kvGet<string[]>(INDEX, "all")) ?? []);
}

export async function tourRequestsForUser(userId: string) {
  return load((await kvGet<string[]>(INDEX, userId)) ?? []);
}

export function updateTourRequest(id: string, patch: Partial<Pick<TourRequest, "status" | "adminNote">>) {
  return serial(async () => {
    const cur = await kvGet<TourRequest>(NS, id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await kvSet(NS, id, next);
    return next;
  });
}
