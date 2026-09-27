import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/provider";
import { parseSearch } from "@/lib/validate";
import { fail } from "@/lib/http";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const q = parseSearch(Object.fromEntries(req.nextUrl.searchParams));
    const offers = await search(q);
    return NextResponse.json({ offers });
  } catch (e) {
    return fail(e);
  }
}
