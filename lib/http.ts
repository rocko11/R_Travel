import { NextResponse } from "next/server";
import { ValidationError } from "./validate";
import { BookingError } from "./booking";
import { SupplierError } from "./duffel";

export function fail(e: unknown) {
  if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof SupplierError)
    return NextResponse.json({ error: e.message }, { status: e.status >= 500 ? 502 : e.status });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
