import { Suspense } from "react";
import HotelForm from "../components/HotelForm";

export const metadata = {
  title: "Hotels — R Travel",
  description: "Find hotels anywhere in the world, from R Travel's destination guides or anywhere else. Get an exact quote in hours.",
};

export default function HotelsPage() {
  return (
    <main className="wrap">
      <div style={{ paddingTop: 20 }}>
        <Suspense>
          <HotelForm />
        </Suspense>
      </div>
    </main>
  );
}
