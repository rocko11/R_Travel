import { NextRequest, NextResponse } from "next/server";
import { places } from "@/lib/provider";
import { fail } from "@/lib/http";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ places: [] });
  try {
    return NextResponse.json({ places: await places(q.slice(0, 40)) });
  } catch (e) {
    return fail(e);
  }
}
