import { Suspense } from "react";
import CarForm from "../components/CarForm";

export const metadata = {
  title: "Car rentals — R Travel",
  description: "Rent a car anywhere in the world, from R Travel's destination guides or anywhere else. Get an exact quote in hours.",
};

export default function CarsPage() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 60 }}>
        <h1>Car rentals,<br />wherever you land.</h1>
        <p>Pick a pickup city and dates to see estimated rates, or tell us where and we&apos;ll source the best car for you.</p>
        <Suspense>
          <CarForm />
        </Suspense>
      </section>
    </main>
  );
}
