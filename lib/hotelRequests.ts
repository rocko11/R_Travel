import "server-only";
import crypto from "crypto";
import { kvGet, kvSet, serial } from "./kv";
import { ROOM_LABEL, type RoomType } from "./hotels";
import { ValidationError } from "./validate";

export type HotelRequestStatus = "new" | "quoted" | "booked" | "closed";

export interface HotelRequest {
  id: string;
  createdAt: string;
  status: HotelRequestStatus;
  destination: string; // free text, e.g. "Paris, France"
  slug?: string; // matched destination guide, if any
  hotelName?: string; // specific hotel, or unset for "best available"
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
  rooms: number;
  roomType: RoomType;
  estimate?: { low: number; high: number };
  name: string;
  email: string;
  phone: string;
  notes: string;
  userId?: string;
  adminNote?: string;
}

const NS = "hotel-requests";
const INDEX = "hotel-requests-index";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROOM_TYPES = Object.keys(ROOM_LABEL) as RoomType[];

export function parseHotelRequest(b: Record<string, unknown>, userId?: string): HotelRequest {
  const today = new Date().toISOString().slice(0, 10);
  const r: HotelRequest = {
    id: `hotel_${crypto.randomBytes(8).toString("base64url")}`,
    createdAt: new Date().toISOString(),
    status: "new",
    destination: String(b.destination ?? "").trim().slice(0, 80),
    slug: b.slug ? String(b.slug) : undefined,
    hotelName: b.hotelName ? String(b.hotelName).slice(0, 120) : undefined,
    checkIn: String(b.checkIn ?? ""),
    checkOut: String(b.checkOut ?? ""),
    guests: Number(b.guests),
    rooms: Number(b.rooms),
    roomType: (String(b.roomType ?? "standard") as RoomType),
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
  if (!DATE.test(r.checkIn) || r.checkIn < today) throw new ValidationError("Choose a check-in date from today on.");
  if (!DATE.test(r.checkOut) || r.checkOut <= r.checkIn) throw new ValidationError("Check-out must be after check-in.");
  if (!Number.isInteger(r.guests) || r.guests < 1 || r.guests > 20) throw new ValidationError("Guests must be 1–20.");
  if (!Number.isInteger(r.rooms) || r.rooms < 1 || r.rooms > 10) throw new ValidationError("Rooms must be 1–10.");
  if (!ROOM_TYPES.includes(r.roomType)) throw new ValidationError("Unknown room type.");
  if (r.name.length < 2) throw new ValidationError("Enter your name.");
  if (!EMAIL.test(r.email)) throw new ValidationError("Enter a valid email.");
  if (!/^\+?\d{7,15}$/.test(r.phone)) throw new ValidationError("Enter a phone number with country code.");
  return r;
}

export async function saveHotelRequest(r: HotelRequest) {
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
  const all = await Promise.all(ids.map((id) => kvGet<HotelRequest>(NS, id)));
  return all.filter((x): x is HotelRequest => Boolean(x));
}

export async function allHotelRequests() {
  return load((await kvGet<string[]>(INDEX, "all")) ?? []);
}

export async function hotelRequestsForUser(userId: string) {
  return load((await kvGet<string[]>(INDEX, userId)) ?? []);
}

export function updateHotelRequest(id: string, patch: Partial<Pick<HotelRequest, "status" | "adminNote">>) {
  return serial(async () => {
    const cur = await kvGet<HotelRequest>(NS, id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    await kvSet(NS, id, next);
    return next;
  });
}
