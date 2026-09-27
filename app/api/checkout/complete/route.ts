import { NextRequest, NextResponse } from "next/server";
import { completeCheckout } from "@/lib/booking";

export async function GET(req: NextRequest) {
  const booking = req.nextUrl.searchParams.get("booking") ?? "";
  const session = req.nextUrl.searchParams.get("session_id") ?? "";
  try {
    await completeCheckout(booking, session);
  } catch (e) {
    console.error(e);
  }
  return NextResponse.redirect(new URL(`/booking/${encodeURIComponent(booking)}`, req.url));
}
