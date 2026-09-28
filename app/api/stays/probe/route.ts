import { NextResponse } from "next/server";
import { config } from "@/lib/config";

/** Temporary diagnostic: checks whether this Duffel account has Stays (hotel) API access. Remove after use. */
export async function GET() {
  if (!config.duffelToken) return NextResponse.json({ error: "No Duffel token configured" }, { status: 400 });
  try {
    const res = await fetch("https://api.duffel.com/stays/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.duffelToken}`,
        "Duffel-Version": "v2",
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          location: { radius: 5, geographic_coordinates: { latitude: 48.8566, longitude: 2.3522 } },
          check_in_date: "2026-11-10",
          check_out_date: "2026-11-13",
          guests: [{ type: "adult" }],
          rooms: 1,
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ status: res.status, ok: res.ok, body }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
