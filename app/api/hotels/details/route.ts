import { NextRequest, NextResponse } from "next/server";
import { getHotelDetails } from "@/lib/liteApiHotels";
import { fail } from "@/lib/http";
import { ValidationError } from "@/lib/validate";

export const maxDuration = 20;

/** Full hotel content (photos, description, amenities, policies) for a hotel detail page. */
export async function GET(req: NextRequest) {
  try {
    const hotelId = (req.nextUrl.searchParams.get("hotelId") || "").trim();
    if (!hotelId) throw new ValidationError("Missing hotel id.");
    const details = await getHotelDetails(hotelId);
    if (!details) return NextResponse.json({ error: "We don't have extra details for this property yet." }, { status: 404 });
    return NextResponse.json({ hotel: details });
  } catch (e) {
    return fail(e);
  }
}
