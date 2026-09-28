import type { Destination } from "./destinations";

/**
 * Builds three day-by-day itineraries from a city guide. Pure function, runs in the browser.
 * Plans reuse the guide's attractions, food, events, nightlife and tours, so every
 * suggestion links back to real guide content.
 */

export interface PlanSlot {
  time: "Morning" | "Afternoon" | "Evening";
  title: string;
  text: string;
  book?: "concierge" | "tour";
}
export interface PlanDay {
  day: number;
  theme: string;
  slots: PlanSlot[];
}
export interface TripPlan {
  id: "highlights" | "local" | "relaxed";
  name: string;
  pace: string;
  summary: string;
  days: PlanDay[];
}

const isDayTrip = (t: { title: string }) => /day trip|nara|toledo|sintra|versailles|lake como|dmz|madinah|jiufen|pamukkale/i.test(t.title);

export function buildPlans(d: Destination, days: number, month?: number): TripPlan[] {
  const sights = d.todo.filter((t) => !isDayTrip(t));
  const trips = d.todo.filter(isDayTrip);
  const food = d.food ?? [];
  const tours = d.tours ?? [];
  // Only year-round events: a month match alone can't tell if an event falls on the traveler's dates.
  void month;
  const seasonal = (d.events ?? []).filter((e) => /year-round/i.test(e.when));
  const pick = <T,>(arr: T[], i: number): T | undefined => (arr.length ? arr[i % arr.length] : undefined);
  const nightlife = d.nightlife && !/not applicable/i.test(d.nightlife) ? d.nightlife : undefined;

  // 1. Highlights: two sights a day, a tour where it fits, lively evenings.
  const highlights: PlanDay[] = Array.from({ length: days }, (_, i) => {
    const a = pick(sights, i * 2), b = pick(sights, i * 2 + 1);
    const slots: PlanSlot[] = [];
    if (a) slots.push({ time: "Morning", title: a.title, text: `${a.text} Go early to beat the crowds.` });
    const tour = i > 0 && i % 2 === 1 ? pick(tours, i) : undefined;
    if (tour) slots.push({ time: "Afternoon", title: tour.name, text: `${tour.summary} (${tour.duration})`, book: "tour" });
    else if (b) slots.push({ time: "Afternoon", title: b.title, text: b.text });
    const ev = pick(seasonal, i);
    slots.push(
      ev && i === 0
        ? { time: "Evening", title: ev.name, text: ev.text, book: "concierge" }
        : { time: "Evening", title: i % 2 ? "Night out" : `Dinner: ${pick(food, i) ?? "local specialties"}`, text: i % 2 && nightlife ? nightlife : `Try ${pick(food, i) ?? "the local specialties"}. The concierge can book a table.`, book: "concierge" }
    );
    return { day: i + 1, theme: i === 0 ? "Icons of the city" : `Day ${i + 1} highlights`, slots };
  });

  // 2. Local flavor: one sight, food markets and neighborhoods, a day trip mid-stay.
  const local: PlanDay[] = Array.from({ length: days }, (_, i) => {
    const trip = days >= 3 && i === Math.floor(days / 2) ? pick(trips, 0) : undefined;
    if (trip) {
      return {
        day: i + 1,
        theme: "Out of town",
        slots: [
          { time: "Morning", title: trip.title, text: trip.text },
          { time: "Afternoon", title: "Explore at your own pace", text: "Lunch where the locals eat; the concierge can arrange a driver or guide." , book: "concierge" },
          { time: "Evening", title: "Easy dinner back in town", text: `Keep it simple: ${pick(food, i + 2) ?? "a neighborhood spot"}.` },
        ],
      };
    }
    const a = pick(sights, i + 2);
    return {
      day: i + 1,
      theme: i === 0 ? "Settle in like a local" : "Neighborhoods and food",
      slots: [
        { time: "Morning", title: `Breakfast and ${a?.title ?? "a slow start"}`, text: a?.text ?? "Wander the nearest neighborhood." },
        { time: "Afternoon", title: `Eat: ${pick(food, i) ?? "street food"}`, text: `Find it at a market or small local spot, then explore on foot. ${d.neighborhoods}` },
        { time: "Evening", title: `Taste: ${pick(food, i + 1) ?? "regional dishes"}`, text: i === days - 1 && nightlife ? nightlife : "Pick a busy local restaurant; the concierge can reserve.", book: "concierge" },
      ],
    };
  });

  // 3. Relaxed and premium: one sight a day, private tours, spa and long dinners.
  const relaxed: PlanDay[] = Array.from({ length: days }, (_, i) => {
    const a = pick(sights, i);
    const tour = pick(tours, i);
    const slots: PlanSlot[] = [
      { time: "Morning", title: "Slow breakfast", text: "Start late; nothing booked before 10am." },
      i % 2 === 0 && tour
        ? { time: "Afternoon", title: `Private: ${tour.name}`, text: `${tour.summary} With your own guide and driver.`, book: "tour" }
        : { time: "Afternoon", title: a?.title ?? "Sightseeing", text: `${a?.text ?? ""} Pre-booked tickets, no queues.`.trim(), book: "concierge" },
      { time: "Evening", title: i === 0 ? "Spa, then a special dinner" : "Dinner with a view", text: "The concierge books the spa, the best table and a car.", book: "concierge" },
    ];
    return { day: i + 1, theme: i === days - 1 ? "Last-day favorites" : "Easy pace", slots };
  });

  return [
    { id: "highlights", name: "Best of " + d.name, pace: "Full days", summary: "See the icons efficiently: two big sights a day, evenings out.", days: highlights },
    { id: "local", name: "Like a local", pace: "Balanced", summary: "Fewer sights, more food, markets and neighborhoods" + (trips.length && days >= 3 ? ", plus a day trip." : "."), days: local },
    { id: "relaxed", name: "Relaxed and premium", pace: "Easy", summary: "One highlight a day, private guides, spa time and memorable dinners.", days: relaxed },
  ];
}
