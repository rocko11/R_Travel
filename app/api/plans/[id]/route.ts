import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { deletePlan, getPlan, parsePlan, savePlan } from "@/lib/savedPlans";
import { fail } from "@/lib/http";

async function owned(id: string) {
  const user = await currentUser();
  if (!user) return { error: NextResponse.json({ error: "Sign in to see your plans." }, { status: 401 }) };
  const plan = await getPlan(id);
  if (!plan || plan.userId !== user.id) return { error: NextResponse.json({ error: "Plan not found." }, { status: 404 }) };
  return { user, plan };
}

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await owned((await ctx.params).id);
  if ("error" in r) return r.error;
  return NextResponse.json({ plan: r.plan });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const r = await owned((await ctx.params).id);
    if ("error" in r) return r.error;
    const body = await req.json().catch(() => ({}));
    const p = await savePlan(parsePlan(body, r.user.id, r.plan));
    return NextResponse.json({ id: p.id });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const r = await owned((await ctx.params).id);
  if ("error" in r) return r.error;
  await deletePlan(r.user.id, r.plan.id);
  return NextResponse.json({ ok: true });
}
