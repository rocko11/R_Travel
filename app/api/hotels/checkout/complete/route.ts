import { NextRequest, NextResponse } from "next/server";
import { completeHotelCheckout } from "@/lib/hotelBooking";

export async function GET(req: NextRequest) {
  const booking = req.nextUrl.searchParams.get("booking") ?? "";
  const session = req.nextUrl.searchParams.get("session_id") ?? "";
  try {
    await completeHotelCheckout(booking, session);
  } catch (e) {
    console.error(e);
  }
  return NextResponse.redirect(new URL(`/hotels/booking/${encodeURIComponent(booking)}`, req.url));
}
