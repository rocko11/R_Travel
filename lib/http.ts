import { NextResponse } from "next/server";
import { ValidationError } from "./validate";
import { BookingError } from "./booking";
import { HotelBookingError } from "./hotelBooking";
import { LiteApiError } from "./liteApiHotels";
import { SupplierError } from "./duffel";
import { AuthError } from "./auth";

export function fail(e: unknown) {
  if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof HotelBookingError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof LiteApiError)
    return NextResponse.json({ error: e.message }, { status: e.status >= 500 ? 502 : e.status });
  if (e instanceof SupplierError)
    return NextResponse.json({ error: e.message }, { status: e.status >= 500 ? 502 : e.status });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
