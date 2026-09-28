import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { parsePlan, savePlan } from "@/lib/savedPlans";
import { fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in to save your plan." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const p = await savePlan(parsePlan(body, user.id));
    return NextResponse.json({ id: p.id });
  } catch (e) {
    return fail(e);
  }
}
