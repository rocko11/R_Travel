import { NextRequest, NextResponse } from "next/server";
import { startHotelBooking } from "@/lib/hotelBooking";
import { parseContact, parseHotelGuests, ValidationError } from "@/lib/validate";
import { fail } from "@/lib/http";
import { currentUser } from "@/lib/auth";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const offerId = String(body.offerId ?? "");
    if (!offerId) throw new ValidationError("Missing rate.");
    const destination = String(body.destination ?? "").trim().slice(0, 80);
    const hotelName = String(body.hotelName ?? "").trim().slice(0, 120);
    const checkIn = String(body.checkIn ?? "");
    const checkOut = String(body.checkOut ?? "");
    if (!destination || !hotelName) throw new ValidationError("Missing hotel details.");
    if (!DATE.test(checkIn) || !DATE.test(checkOut) || checkOut <= checkIn) throw new ValidationError("Invalid dates.");
    const quotedTotal = Number(body.quotedTotal);
    if (!Number.isFinite(quotedTotal)) throw new ValidationError("Missing quoted price.");
    const guests = parseHotelGuests(body.guests);
    const contact = parseContact(body.contact ?? {});
    const user = await currentUser();
    const result = await startHotelBooking({
      offerId,
      destination,
      hotelName,
      checkIn,
      checkOut,
      guests,
      contact,
      quotedTotal,
      userId: user?.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
