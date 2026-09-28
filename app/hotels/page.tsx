import { Suspense } from "react";
import HotelForm from "../components/HotelForm";

export const metadata = {
  title: "Hotels — R Travel",
  description: "Find hotels anywhere in the world, from R Travel's destination guides or anywhere else. Get an exact quote in hours.",
};

export default function HotelsPage() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 60 }}>
        <h1>Hotels,<br />anywhere you&apos;re going.</h1>
        <p>Pick a destination and dates to see estimated rates, or tell us where and we&apos;ll source the best hotels for you.</p>
        <Suspense>
          <HotelForm />
        </Suspense>
      </section>
    </main>
  );
}
