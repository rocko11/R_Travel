import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { parseCarRequest, saveCarRequest } from "@/lib/carRequests";
import { fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await currentUser();
    const r = await saveCarRequest(parseCarRequest(body, user?.id));
    return NextResponse.json({ id: r.id });
  } catch (e) {
    return fail(e);
  }
}
