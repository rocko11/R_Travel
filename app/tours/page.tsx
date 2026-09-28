import { Suspense } from "react";
import TourForm from "../components/TourForm";

export const metadata = {
  title: "Local tours — R Travel",
  description: "Book local tours and activities anywhere in the world, from R Travel's destination guides or anywhere else. Get an exact quote in hours.",
};

export default function ToursPage() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 60 }}>
        <h1>Local tours,<br />wherever you land.</h1>
        <p>Pick a destination and date to see tour options and estimated prices, or tell us where and we&apos;ll source the best local guides for you.</p>
        <Suspense>
          <TourForm />
        </Suspense>
      </section>
    </main>
  );
}
