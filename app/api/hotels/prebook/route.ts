import { NextRequest, NextResponse } from "next/server";
import { loadPrebook } from "@/lib/hotelBooking";
import { fail } from "@/lib/http";
import { ValidationError } from "@/lib/validate";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const offerId = String(body.offerId ?? "");
    if (!offerId) throw new ValidationError("Missing rate.");
    const pre = await loadPrebook(offerId);
    return NextResponse.json(pre);
  } catch (e) {
    return fail(e);
  }
}
