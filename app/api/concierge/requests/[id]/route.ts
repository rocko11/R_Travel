import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";
import { updateConcierge, type ConciergeStatus } from "@/lib/concierge";

const STATUSES: ConciergeStatus[] = ["new", "in_progress", "confirmed", "closed"];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const form = await req.formData();
  const status = String(form.get("status") ?? "") as ConciergeStatus;
  const adminNote = String(form.get("adminNote") ?? "").slice(0, 2000);
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  await updateConcierge(id, { status, adminNote });
  return NextResponse.redirect(new URL(`/admin/concierge#${id}`, req.url), 303);
}
