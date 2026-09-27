import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { fail } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json().catch(() => ({}));
    const user = await signIn({ email: String(b.email ?? ""), password: String(b.password ?? "") });
    return NextResponse.json({ user });
  } catch (e) {
    return fail(e);
  }
}
