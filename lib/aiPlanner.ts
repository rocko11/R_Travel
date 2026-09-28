import "server-only";
import type { PlanDay, PlanSlot, TripPlan } from "./planner";

/**
 * AI trip planner: writes one itinerary style per call with Claude, based on the
 * traveler's real trip (destination, dates, flight times) and their own request.
 * Set ANTHROPIC_API_KEY in Netlify. Optional ANTHROPIC_MODEL (default: Haiku 4.5, fast).
 */

export const aiPlannerEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

export interface PlanRequest {
  destination: string; // e.g. "Lisbon (LIS)"
  start: string; // YYYY-MM-DD, first day in the destination
  days: number;
  travelers: number;
  request: string; // what the traveler wants, free text
  arriveTime?: string; // HH:MM local, on day 1
  leaveTime?: string; // HH:MM local, on the last day
}

export const STYLES: Record<TripPlan["id"], { name: string; pace: string; brief: string }> = {
  highlights: {
    name: "Best of the trip",
    pace: "Full days",
    brief: "Efficient must-see plan: the destination's top sights and experiences, grouped by area to minimize travel time, lively evenings.",
  },
  local: {
    name: "Like a local",
    pace: "Balanced",
    brief: "Fewer famous sights, more neighborhoods, markets, food and local life; include one nearby day trip if the stay is 3+ days.",
  },
  relaxed: {
    name: "Relaxed and premium",
    pace: "Easy",
    brief: "One highlight per day, late starts, private guides, spa or downtime, memorable dinners with a view.",
  },
};

const SYSTEM = `You are R Travel's trip planner. You write practical, specific day-by-day itineraries.
Rules:
- Use real, well-known places, neighborhoods, dishes and experiences at the destination. Never invent venues.
- Respect the traveler's request, group size and dates. Mention seasonal events only if you are confident they happen that time of year, and say to confirm dates.
- Day 1 starts after arrival; the last day ends before departure. Keep slots realistic for those times.
- Group activities by area to save travel time and add one short practical tip per slot where useful (booking ahead, best hour, how to get there).
- Mark slots that need a reservation (restaurants, tickets, guides, transfers) with "book": "concierge".
- Output ONLY JSON, no prose, matching:
{"summary": string (max 20 words), "days": [{"theme": string (max 6 words), "slots": [{"time": "Morning"|"Afternoon"|"Evening", "title": string (max 8 words), "text": string (max 40 words), "book": "concierge" | null}]}]}
- Exactly the requested number of days; 2–4 slots per day.`;

function userPrompt(r: PlanRequest, style: TripPlan["id"]) {
  return [
    `Destination: ${r.destination}`,
    `Dates: ${r.days} day(s) starting ${r.start}`,
    `Travelers: ${r.travelers}`,
    r.arriveTime ? `Arrives on day 1 at ${r.arriveTime} local time.` : "",
    r.leaveTime ? `Departs on the last day at ${r.leaveTime} local time.` : "",
    `Plan style: ${STYLES[style].brief}`,
    r.request ? `Traveler's request: """${r.request.slice(0, 800)}"""` : "No special requests.",
  ].filter(Boolean).join("\n");
}

function extractJson(text: string) {
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Planner returned no plan.");
  return JSON.parse(text.slice(start, end + 1));
}

const TIMES = ["Morning", "Afternoon", "Evening"];
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function generatePlan(r: PlanRequest, style: TripPlan["id"]): Promise<TripPlan> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 24_000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 400 + r.days * 450,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt(r, style) }],
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message || `Planner error ${res.status}`);
    const data = extractJson(String(j.content?.[0]?.text ?? ""));
    const days: PlanDay[] = (Array.isArray(data.days) ? data.days : []).slice(0, r.days).map((d: Record<string, unknown>, i: number) => ({
      day: i + 1,
      theme: str(d.theme, 60) || `Day ${i + 1}`,
      slots: (Array.isArray(d.slots) ? d.slots : []).slice(0, 5).map((s: Record<string, unknown>) => ({
        time: (TIMES.includes(String(s.time)) ? String(s.time) : "Afternoon") as PlanSlot["time"],
        title: str(s.title, 90) || "Activity",
        text: str(s.text, 400),
        book: s.book === "concierge" ? "concierge" : undefined,
      })),
    }));
    if (!days.length) throw new Error("Planner returned an empty plan.");
    return { id: style, name: STYLES[style].name, pace: STYLES[style].pace, summary: str(data.summary, 140) || STYLES[style].brief, days };
  } finally {
    clearTimeout(timer);
  }
}
