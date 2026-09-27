import Link from "next/link";

export const metadata = {
  title: "How R Travel works",
  description: "How booking with R Travel works: search, compare, book and manage flights and private jets with R Travel.",
};

const STEPS = [
  ["Search on R Travel", "Enter where and when. R Travel searches 300+ airlines at once and shows total prices, taxes included."],
  ["Compare with R Travel filters", "Sort by best, cheapest or fastest. Filter by stops, airline and checked bags. See flight numbers, aircraft and weather at both ends."],
  ["Book through R Travel", "Enter traveler names as on the passport. R Travel re-checks the fare, takes payment, then issues your ticket with the airline."],
  ["Manage in your R Travel account", "Your booking reference, itinerary and status live under My trips in your R Travel account."],
  ["Fly private with R Travel", "For private jets, R Travel shows an estimate by aircraft size and sends exact quotes from vetted operators."],
];

export default function HowItWorks() {
  return (
    <main className="wrap" style={{ padding: "32px 16px 60px" }}>
      <article className="prose">
        <h1 className="page-h">How R Travel works</h1>
        <p>Booking with R Travel takes a few minutes. Here is what happens at each step.</p>
        <ol className="dest-todo" style={{ marginTop: 16 }}>
          {STEPS.map(([t, d]) => (
            <li key={t}><b>{t}</b><span>{d}</span></li>
          ))}
        </ol>
        <h2>What R Travel charges</h2>
        <p>
          R Travel adds a small service fee to each order, shown on the payment page before you pay. The airline sets the fare;
          R Travel never adds hidden charges at checkout.
        </p>
        <h2>If something changes</h2>
        <p>
          If the airline changes the price while you are booking, R Travel shows you the new total before charging.
          If ticketing fails after payment, R Travel refunds you in full automatically.
        </p>
        <p><Link href="/faq" style={{ color: "var(--brand)" }}>Read the R Travel FAQ →</Link></p>
      </article>
    </main>
  );
}
