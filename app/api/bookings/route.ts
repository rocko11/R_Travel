import { NextRequest, NextResponse } from "next/server";
import { startBooking } from "@/lib/booking";
import { freshOffer } from "@/lib/provider";
import { parseContact, parsePassengers, ValidationError } from "@/lib/validate";
import { fail } from "@/lib/http";
import { currentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const offerId = String(body.offerId ?? "");
    if (!offerId) throw new ValidationError("Missing fare.");
    const quotedTotal = Number(body.quotedTotal);
    if (!Number.isFinite(quotedTotal)) throw new ValidationError("Missing quoted price.");
    const offer = await freshOffer(offerId);
    const passengers = parsePassengers(body.passengers, offer.passengers.map((p) => p.id));
    const contact = parseContact(body.contact ?? {});
    const user = await currentUser();
    const result = await startBooking({ offerId, passengers, contact, quotedTotal, userId: user?.id });
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
