import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({}));
    const user = await signUp({ name: String(b.name ?? ""), email: String(b.email ?? ""), password: String(b.password ?? "") });
    return NextResponse.json({ user });
  } catch (e) {
    return fail(e);
  }
}
