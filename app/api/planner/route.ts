import { NextRequest, NextResponse } from "next/server";
import { aiPlannerEnabled, generatePlan, STYLES, type PlanRequest } from "@/lib/aiPlanner";
import { buildPlans, type TripPlan } from "@/lib/planner";
import { destinationForIata } from "@/lib/destinations";

export const maxDuration = 26;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** POST { style, destination, iata?, start, days, travelers, request, arriveTime?, leaveTime? } → one plan. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const style = String(b.style) as TripPlan["id"];
  if (!(style in STYLES)) return NextResponse.json({ error: "Unknown plan style." }, { status: 400 });
  const r: PlanRequest = {
    destination: String(b.destination ?? "").trim().slice(0, 80),
    start: String(b.start ?? ""),
    days: Number(b.days),
    travelers: Number(b.travelers) || 1,
    request: String(b.request ?? "").trim().slice(0, 800),
    arriveTime: TIME.test(String(b.arriveTime)) ? String(b.arriveTime) : undefined,
    leaveTime: TIME.test(String(b.leaveTime)) ? String(b.leaveTime) : undefined,
  };
  if (r.destination.length < 2) return NextResponse.json({ error: "Choose a destination." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.start)) return NextResponse.json({ error: "Choose your arrival date." }, { status: 400 });
  if (!Number.isInteger(r.days) || r.days < 1 || r.days > 10) return NextResponse.json({ error: "Plans cover 1–10 days." }, { status: 400 });
  if (r.travelers < 1 || r.travelers > 50) return NextResponse.json({ error: "Travelers must be 1–50." }, { status: 400 });

  if (aiPlannerEnabled()) {
    try {
      return NextResponse.json({ plan: fitToFlights(await generatePlan(r, style), r.arriveTime, r.leaveTime, false), source: "ai" });
    } catch (e) {
      console.error("planner", e);
      // fall through to the guide-based plan if we have one
    }
  }
  const guide = destinationForIata(String(b.iata ?? ""));
  if (guide) {
    const plan = buildPlans(guide, Math.min(r.days, 7), Number(r.start.slice(5, 7))).find((p) => p.id === style)!;
    return NextResponse.json({ plan: fitToFlights(plan, r.arriveTime, r.leaveTime), source: "guide" });
  }
  return NextResponse.json(
    { error: aiPlannerEnabled() ? "The planner is busy. Try again in a moment." : "Custom planning for this destination isn't switched on yet." },
    { status: 503 }
  );
}

/** Drop slots that fall before landing on day 1 or after take-off on the last day. */
function fitToFlights(plan: TripPlan, arrive?: string, leave?: string, addTransfers = true): TripPlan {
  const hour = (t?: string) => (t ? Number(t.slice(0, 2)) : undefined);
  const a = hour(arrive), l = hour(leave);
  const days = plan.days.map((d, i) => {
    let slots = d.slots;
    if (i === 0 && a != null) {
      slots = slots.filter((s) => /arriv|airport|check in|transfer/i.test(s.title) || (s.time === "Morning" ? a < 10 : s.time === "Afternoon" ? a < 15 : a < 21));
      if (addTransfers) slots = [{ time: a < 12 ? "Morning" : a < 17 ? "Afternoon" : "Evening", title: "Arrive and check in", text: `Land around ${arrive}. Transfer to your hotel and settle in.`, book: "concierge" as const }, ...slots];
    }
    if (i === plan.days.length - 1 && l != null && plan.days.length > 1) {
      slots = slots.filter((s) => /airport|departure|flight/i.test(s.title) || (s.time === "Morning" ? l >= 12 : s.time === "Afternoon" ? l >= 17 : l >= 22));
      if (addTransfers) slots = [...slots, { time: l < 12 ? "Morning" : l < 17 ? "Afternoon" : "Evening", title: "Head to the airport", text: `Flight at ${leave}. Leave about 3 hours before for international flights.`, book: "concierge" as const }];
    }
    return { ...d, slots };
  });
  return { ...plan, days };
}
