import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";

export interface TourInterest {
  id: string;
  createdAt: string;
  city: string;
  tourId: string;
  tourName: string;
  email: string;
  userId?: string;
}

const NS = "tour-interest";

export async function addTourInterest(r: Omit<TourInterest, "id" | "createdAt">) {
  const rec: TourInterest = { ...r, id: `ti_${crypto.randomBytes(6).toString("base64url")}`, createdAt: new Date().toISOString() };
  await serial(async () => {
    const all = (await kvGet<TourInterest[]>(NS, "all")) ?? [];
    if (all.some((x) => x.tourId === rec.tourId && x.email === rec.email)) return;
    await kvSet(NS, "all", [rec, ...all].slice(0, 5000));
  });
  return rec;
}

export async function allTourInterest() {
  return (await kvGet<TourInterest[]>(NS, "all")) ?? [];
}
