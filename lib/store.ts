import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import type { Booking } from "./types";

const NS = "bookings";
const USER_INDEX = "user-bookings";

export function newBookingId() {
  return `bk_${crypto.randomBytes(9).toString("base64url")}`;
}

export async function saveBooking(b: Booking) {
  await kvSet(NS, b.id, b);
  if (b.userId) await linkBookingToUser(b.userId, b.id);
  return b;
}

export function getBooking(id: string): Promise<Booking | null> {
  return kvGet<Booking>(NS, id);
}

/** Update a booking through fn; returning null from fn leaves it unchanged. */
export function updateBooking(id: string, fn: (b: Booking) => Booking | null) {
  return serial(async () => {
    const cur = await kvGet<Booking>(NS, id);
    if (!cur) return null;
    const next = fn(cur);
    if (!next) return cur;
    await kvSet(NS, id, next);
    return next;
  });
}

export function linkBookingToUser(userId: string, bookingId: string) {
  return serial(async () => {
    const ids = (await kvGet<string[]>(USER_INDEX, userId)) ?? [];
    if (!ids.includes(bookingId)) await kvSet(USER_INDEX, userId, [bookingId, ...ids]);
  });
}

export async function bookingsForUser(userId: string): Promise<Booking[]> {
  const ids = (await kvGet<string[]>(USER_INDEX, userId)) ?? [];
  const all = await Promise.all(ids.map((id) => getBooking(id)));
  return all.filter((b): b is Booking => Boolean(b));
}
