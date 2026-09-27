import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import { JET_CLASSES, type JetCategory } from "./jets";
import { ValidationError } from "./validate";

export type JetRequestStatus = "new" | "quoted" | "booked" | "closed";

export interface JetRequest {
  id: string;
  createdAt: string;
  status: JetRequestStatus;
  from: { iata: string; label: string };
  to: { iata: string; label: string };
  departDate: string;
  departTime: string;
  returnDate?: string;
  returnTime?: string;
  passengers: number;
  category: JetCategory | "any";
  estimate?: { low: number; high: number };
  name: string;
  email: string;
  phone: string;
  notes: string;
  userId?: string;
  adminNote?: string;
}

const NS = "jet-requests";
const INDEX = "jet-requests-index";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const IATA = /^[A-Z]{3}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseJetRequest(b: Record<string, unknown>, userId?: string): JetRequest {
  const place = (v: unknown) => {
    const o = (v ?? {}) as Record<string, unknown>;
    return { iata: String(o.iata ?? "").toUpperCase(), label: String(o.label ?? "").slice(0, 80) };
  };
  const from = place(b.from), to = place(b.to);
  const today = new Date().toISOString().slice(0, 10);
  const r: JetRequest = {
    id: `jet_${crypto.randomBytes(8).toString("base64url")}`,
    createdAt: new Date().toISOString(),
    status: "new",
    from,
    to,
    departDate: String(b.departDate ?? ""),
    departTime: String(b.departTime ?? ""),
    returnDate: b.returnDate ? String(b.returnDate) : undefined,
    returnTime: b.returnTime ? String(b.returnTime) : undefined,
    passengers: Number(b.passengers),
    category: (String(b.category ?? "any") as JetRequest["category"]),
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
  if (!IATA.test(from.iata) || !IATA.test(to.iata)) throw new ValidationError("Choose departure and destination airports.");
  if (from.iata === to.iata) throw new ValidationError("Departure and destination must differ.");
  if (!DATE.test(r.departDate) || r.departDate < today) throw new ValidationError("Choose a departure date from today on.");
  if (!TIME.test(r.departTime)) throw new ValidationError("Choose a departure time.");
  if (r.returnDate && (!DATE.test(r.returnDate) || r.returnDate < r.departDate)) throw new ValidationError("Return must be on or after departure.");
  if (r.returnDate && r.returnTime && !TIME.test(r.returnTime)) throw new ValidationError("Choose a valid return time.");
  if (!Number.isInteger(r.passengers) || r.passengers < 1 || r.passengers > 19) throw new ValidationError("Passengers must be 1–19.");
  if (r.category !== "any" && !JET_CLASSES.some((c) => c.id === r.category)) throw new ValidationError("Unknown aircraft category.");
  if (r.name.length < 2) throw new ValidationError("Enter your name.");
  if (!EMAIL.test(r.email)) throw new ValidationError("Enter a valid email.");
  if (!/^\+?\d{7,15}$/.test(r.phone)) throw new ValidationError("Enter a phone number with country code.");
  return r;
}

export async function saveJetRequest(r: JetRequest) {
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
  const all = await Promise.all(ids.map((id) => kvGet<JetRequest>(NS, id)));
  return all.filter((x): x is JetRequest => Boolean(x));
}

export async function allJetRequests() {
  return load((await kvGet<string[]>(INDEX, "all")) ?? []);
}

export async function jetRequestsForUser(userId: string) {
  return load((await kvGet<string[]>(INDEX, userId)) ?? []);
}

export function updateJetRequest(id: string, patch: Partial<Pick<JetRequest, "status" | "adminNote">>) {
  return serial(async () => {
    const cur = await kvGet<JetRequest>(NS, id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await kvSet(NS, id, next);
    return next;
  });
}

/** Admins are the accounts whose email is listed in ADMIN_EMAILS (comma-separated). */
export function isAdmin(email?: string | null) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
