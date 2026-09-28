import { Suspense } from "react";
import ConciergeForm from "../components/ConciergeForm";

export const metadata = {
  title: "R Travel Concierge — private tours, reservations and more",
  description: "Tell the R Travel concierge what you need: private tours, restaurant and attraction reservations, transfers, events and more, anywhere in the world.",
};

export default function ConciergePage() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 60 }}>
        <h1>R Travel Concierge</h1>
        <p>Private tours, impossible reservations, tickets and transfers. Tell us what you want; we&apos;ll arrange it.</p>
        <Suspense>
          <ConciergeForm />
        </Suspense>
      </section>
    </main>
  );
}
