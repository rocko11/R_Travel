import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";
import { updateTourRequest, type TourRequestStatus } from "@/lib/tourRequests";

const STATUSES: TourRequestStatus[] = ["new", "quoted", "booked", "closed"];

/** Admin-only status update (plain form post from the admin inbox). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const form = await req.formData();
  const status = String(form.get("status") ?? "") as TourRequestStatus;
  const adminNote = String(form.get("adminNote") ?? "").slice(0, 1000);
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  await updateTourRequest(id, { status, adminNote });
  return NextResponse.redirect(new URL(`/admin/tours#${id}`, req.url), 303);
}
