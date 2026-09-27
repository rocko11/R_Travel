import { NextResponse } from "next/server";
import { getBooking } from "@/lib/store";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await getBooking(id);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { contact, passengers, ...rest } = b;
  return NextResponse.json({
    booking: { ...rest, travelers: passengers.map((p) => `${p.givenName} ${p.familyName}`), email: contact.email },
  });
}
