import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import type { PlanDay } from "./planner";
import { ValidationError } from "./validate";

export interface SavedPlan {
  id: string;
  userId: string;
  city: string; // destination label, e.g. "Lisbon (LIS)"
  iata?: string;
  title: string;
  start: string;
  days: PlanDay[];
  createdAt: string;
  updatedAt: string;
}

const NS = "plans";
const INDEX = "plans-index";
const TIMES = ["Morning", "Afternoon", "Evening"];
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export function parsePlan(b: Record<string, unknown>, userId: string, existing?: SavedPlan): SavedPlan {
  const city = clean(b.city, 80);
  if (city.length < 2) throw new ValidationError("Choose a destination.");
  const iata = clean(b.iata, 3).toUpperCase();
  const start = clean(b.start, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new ValidationError("Choose a start date.");
  const raw = Array.isArray(b.days) ? b.days.slice(0, 10) : [];
  if (!raw.length) throw new ValidationError("Your plan has no days.");
  const days: PlanDay[] = raw.map((d: Record<string, unknown>, i: number) => ({
    day: i + 1,
    theme: clean(d.theme, 80) || `Day ${i + 1}`,
    slots: (Array.isArray(d.slots) ? d.slots.slice(0, 12) : []).map((s: Record<string, unknown>) => ({
      time: (TIMES.includes(String(s.time)) ? String(s.time) : "Afternoon") as PlanDay["slots"][number]["time"],
      title: clean(s.title, 120) || "Activity",
      text: clean(s.text, 600),
      book: s.book === "concierge" || s.book === "tour" ? s.book : undefined,
    })),
  }));
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? `pl_${crypto.randomBytes(8).toString("base64url")}`,
    userId,
    city,
    iata: /^[A-Z]{3}$/.test(iata) ? iata : undefined,
    title: clean(b.title, 100) || `${city} trip`,
    start,
    days,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function savePlan(p: SavedPlan) {
  await kvSet(NS, p.id, p);
  await serial(async () => {
    const ids = (await kvGet<string[]>(INDEX, p.userId)) ?? [];
    if (!ids.includes(p.id)) await kvSet(INDEX, p.userId, [p.id, ...ids]);
  });
  return p;
}

export async function getPlan(id: string) {
  return kvGet<SavedPlan>(NS, id);
}

export async function plansForUser(userId: string) {
  const ids = (await kvGet<string[]>(INDEX, userId)) ?? [];
  const all = await Promise.all(ids.map((id) => kvGet<SavedPlan>(NS, id)));
  return all.filter((p): p is SavedPlan => Boolean(p));
}

export async function deletePlan(userId: string, id: string) {
  await serial(async () => {
    const ids = (await kvGet<string[]>(INDEX, userId)) ?? [];
    await kvSet(INDEX, userId, ids.filter((x) => x !== id));
  });
}
