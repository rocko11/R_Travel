import { NextRequest, NextResponse } from "next/server";
import { hotelEstimatesFor } from "@/lib/hotelProvider";
import { matchDestination, type RoomType } from "@/lib/hotels";
import { fail } from "@/lib/http";
import { ValidationError } from "@/lib/validate";

export const maxDuration = 20;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROOM_TYPES: RoomType[] = ["standard", "deluxe", "suite"];

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const code = (sp.get("code") || "").trim();
    const city = (sp.get("city") || code).trim();
    const country = (sp.get("country") || "").trim().toUpperCase() || undefined;
    const checkIn = sp.get("checkIn") || "";
    const checkOut = sp.get("checkOut") || "";
    const guests = Number(sp.get("guests") || 2);
    const rooms = Number(sp.get("rooms") || 1);
    const roomType = (sp.get("roomType") || "standard") as RoomType;

    if (!code) throw new ValidationError("Choose a city or airport.");
    if (!DATE.test(checkIn) || !DATE.test(checkOut) || checkOut <= checkIn) {
      throw new ValidationError("Choose valid check-in and check-out dates.");
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) throw new ValidationError("Guests must be 1–20.");
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 10) throw new ValidationError("Rooms must be 1–10.");
    if (!ROOM_TYPES.includes(roomType)) throw new ValidationError("Unknown room type.");

    const matched = matchDestination(code);
    const dest = { slug: matched?.slug, code, city, country };
    // Temporary ops escape hatch: ?debugLiteApi=1 surfaces the real liteAPI error instead of
    // silently falling back to synthetic estimates, to diagnose a key/config problem in prod.
    const debugLiteApi = sp.get("debugLiteApi") === "1";
    const result = await hotelEstimatesFor(dest, checkIn, checkOut, guests, rooms, roomType, debugLiteApi);
    if (debugLiteApi) {
      const { config, liteApiEnabled } = await import("@/lib/config");
      return NextResponse.json({
        ...result,
        slug: matched?.slug,
        _debug: { liteApiEnabled: liteApiEnabled(), keyLen: config.liteApiKey.length, keyPrefix: config.liteApiKey.slice(0, 8) },
      });
    }
    return NextResponse.json({ ...result, slug: matched?.slug });
  } catch (e) {
    return fail(e);
  }
}
