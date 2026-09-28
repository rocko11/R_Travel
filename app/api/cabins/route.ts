import { NextRequest, NextResponse } from "next/server";
import { compareCabins } from "@/lib/provider";
import { parseSearch, ValidationError } from "@/lib/validate";
import { fail } from "@/lib/http";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const key = String(params.key ?? "");
    if (!/^[A-Z0-9|-]{3,120}$/.test(key)) throw new ValidationError("Missing flight.");
    const q = parseSearch({ ...params, cabin: "economy" });
    return NextResponse.json({ cabins: await compareCabins(q, key) });
  } catch (e) {
    return fail(e);
  }
}
