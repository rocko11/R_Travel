import { Suspense } from "react";
import TripPlanner from "../components/TripPlanner";

export const metadata = {
  title: "R Travel trip planner — 3 ways to spend your days",
  description: "Pick a destination and dates; R Travel's trip planner gives you three day-by-day plans to make the most of your time.",
};

export default function PlannerPage() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 60 }}>
        <h1>Trip planner</h1>
        <p>Choose where and how long. Get three day-by-day plans, then book any part with R Travel.</p>
        <Suspense>
          <TripPlanner />
        </Suspense>
      </section>
    </main>
  );
}
