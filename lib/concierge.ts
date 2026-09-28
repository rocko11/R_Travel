import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import { ValidationError } from "./validate";

import { CONCIERGE_SERVICES, type ConciergeService } from "./conciergeServices";
export { CONCIERGE_SERVICES, type ConciergeService };
export type ConciergeStatus = "new" | "in_progress" | "confirmed" | "closed";

export interface ConciergeRequest {
  id: string;
  createdAt: string;
  status: ConciergeStatus;
  services: ConciergeService[];
  city: string;
  startDate: string;
  endDate?: string;
  guests: number;
  budget: string;
  details: string;
  name: string;
  email: string;
  phone: string;
  contactBy: "email" | "phone" | "whatsapp";
  userId?: string;
  adminNote?: string;
}

const NS = "concierge";
const INDEX = "concierge-index";
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BUDGETS = ["", "Flexible", "Up to $500", "$500–$2,000", "$2,000–$10,000", "$10,000+"];

export function parseConcierge(b: Record<string, unknown>, userId?: string): ConciergeRequest {
  const ids = CONCIERGE_SERVICES.map((s) => s.id) as string[];
  const services = (Array.isArray(b.services) ? b.services : []).map(String).filter((s) => ids.includes(s)) as ConciergeService[];
  const today = new Date().toISOString().slice(0, 10);
  const r: ConciergeRequest = {
    id: `cc_${crypto.randomBytes(8).toString("base64url")}`,
    createdAt: new Date().toISOString(),
    status: "new",
    services: [...new Set(services)],
    city: String(b.city ?? "").trim().slice(0, 80),
    startDate: String(b.startDate ?? ""),
    endDate: b.endDate ? String(b.endDate) : undefined,
    guests: Number(b.guests),
    budget: String(b.budget ?? ""),
    details: String(b.details ?? "").trim().slice(0, 2000),
    name: String(b.name ?? "").trim().slice(0, 80),
    email: String(b.email ?? "").trim().toLowerCase().slice(0, 120),
    phone: String(b.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20),
    contactBy: (["email", "phone", "whatsapp"].includes(String(b.contactBy)) ? String(b.contactBy) : "email") as ConciergeRequest["contactBy"],
    userId,
  };
  if (!r.services.length) throw new ValidationError("Choose at least one service.");
  if (r.city.length < 2) throw new ValidationError("Enter the city or destination.");
  if (!DATE.test(r.startDate) || r.startDate < today) throw new ValidationError("Choose a date from today on.");
  if (r.endDate && (!DATE.test(r.endDate) || r.endDate < r.startDate)) throw new ValidationError("End date must be on or after the start date.");
  if (!Number.isInteger(r.guests) || r.guests < 1 || r.guests > 200) throw new ValidationError("Guests must be 1–200.");
  if (!BUDGETS.includes(r.budget)) throw new ValidationError("Choose a budget.");
  if (r.details.length < 10) throw new ValidationError("Tell us a bit about what you'd like (at least a sentence).");
  if (r.name.length < 2) throw new ValidationError("Enter your name.");
  if (!EMAIL.test(r.email)) throw new ValidationError("Enter a valid email.");
  if (!/^\+?\d{7,15}$/.test(r.phone)) throw new ValidationError("Enter a phone number with country code.");
  return r;
}

export async function saveConcierge(r: ConciergeRequest) {
  await kvSet(NS, r.id, r);
  await serial(async () => {
    const all = (await kvGet<string[]>(INDEX, "all")) ?? [];
    await kvSet(INDEX, "all", [r.id, ...all]);
    if (r.userId) {
      const mine = (await kvGet<string[]>(INDEX, r.userId)) ?? [];
      await kvSet(INDEX, r.userId, [r.id, ...mine]);
    }
  });
  return r;
}

async function load(ids: string[]) {
  const all = await Promise.all(ids.map((id) => kvGet<ConciergeRequest>(NS, id)));
  return all.filter((x): x is ConciergeRequest => Boolean(x));
}

export async function allConcierge() {
  return load((await kvGet<string[]>(INDEX, "all")) ?? []);
}

export async function conciergeForUser(userId: string) {
  return load((await kvGet<string[]>(INDEX, userId)) ?? []);
}

export function updateConcierge(id: string, patch: Partial<Pick<ConciergeRequest, "status" | "adminNote">>) {
  return serial(async () => {
    const cur = await kvGet<ConciergeRequest>(NS, id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await kvSet(NS, id, next);
    return next;
  });
}

export const CONCIERGE_STATUS_LABEL: Record<ConciergeStatus, string> = {
  new: "Received",
  in_progress: "Being arranged",
  confirmed: "Confirmed",
  closed: "Closed",
};
