import { NextResponse } from "next/server";
import { freshOffer } from "@/lib/provider";
import { fail } from "@/lib/http";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return NextResponse.json({ offer: await freshOffer(id) });
  } catch (e) {
    return fail(e);
  }
}
