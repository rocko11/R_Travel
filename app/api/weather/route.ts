import { NextRequest, NextResponse } from "next/server";
import { weatherFor } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const iata = (req.nextUrl.searchParams.get("iata") ?? "").toUpperCase();
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  if (!/^[A-Z]{3}$/.test(iata) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return NextResponse.json({ weather: null }, { status: 400 });
  }
  try {
    return NextResponse.json(
      { weather: await weatherFor(iata, date) },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
    );
  } catch {
    return NextResponse.json({ weather: null });
  }
}
