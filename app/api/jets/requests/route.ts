import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { parseJetRequest, saveJetRequest } from "@/lib/jetRequests";
import { fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await currentUser();
    const r = await saveJetRequest(parseJetRequest(body, user?.id));
    return NextResponse.json({ id: r.id });
  } catch (e) {
    return fail(e);
  }
}
