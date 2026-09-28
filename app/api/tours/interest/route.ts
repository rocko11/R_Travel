import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addTourInterest } from "@/lib/tourInterest";
import { destinationBySlug } from "@/lib/destinations";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const city = String(b.city ?? "");
  const tourId = String(b.tourId ?? "");
  const email = String(b.email ?? "").trim().toLowerCase();
  const tour = destinationBySlug(city)?.tours?.find((t) => t.id === tourId);
  if (!tour) return NextResponse.json({ error: "Unknown tour." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const user = await currentUser();
  await addTourInterest({ city, tourId, tourName: tour.name, email, userId: user?.id });
  return NextResponse.json({ ok: true });
}
