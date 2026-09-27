import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getStore } from "@netlify/blobs";
import type { Booking } from "./types";

/** On Netlify, bookings live in Netlify Blobs; locally, in .data/bookings.json. */
const onNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);
const blobs = () => getStore({ name: "bookings", consistency: "strong" });

/**
 * Minimal file-backed booking store so the prototype runs with zero setup.
 * Before launch, move to Postgres for reporting and refunds: one "bookings" table
 * with these fields maps 1:1.
 */
const FILE = path.join(process.cwd(), ".data", "bookings.json");

let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

async function readAll(): Promise<Record<string, Booking>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeAll(all: Record<string, Booking>) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(all, null, 2));
  await fs.rename(tmp, FILE);
}

export function newBookingId() {
  return `bk_${crypto.randomBytes(9).toString("base64url")}`;
}

export function saveBooking(b: Booking) {
  if (onNetlify) return blobs().setJSON(b.id, b).then(() => b);
  return serial(async () => {
    const all = await readAll();
    all[b.id] = b;
    await writeAll(all);
    return b;
  });
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (onNetlify) return ((await blobs().get(id, { type: "json" })) as Booking | null) ?? null;
  const all = await readAll();
  return all[id] ?? null;
}

/** Atomically update a booking; returns the updated record. */
export function updateBooking(id: string, fn: (b: Booking) => Booking | null) {
  if (onNetlify)
    return serial(async () => {
      const cur = ((await blobs().get(id, { type: "json" })) as Booking | null) ?? null;
      if (!cur) return null;
      const next = fn(cur);
      if (!next) return cur;
      await blobs().setJSON(id, next);
      return next;
    });
  return serial(async () => {
    const all = await readAll();
    const cur = all[id];
    if (!cur) return null;
    const next = fn(cur);
    if (!next) return cur;
    all[id] = next;
    await writeAll(all);
    return next;
  });
}
