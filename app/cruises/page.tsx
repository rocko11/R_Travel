import CruiseForm from "../components/CruiseForm";

export const metadata = { title: "Luxury cruises" };

export default function CruisesPage() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 60 }}>
        <h1>Luxury cruises,<br />on the world&apos;s finest ships.</h1>
        <p>Ultra-luxury and premium-luxury lines — Silversea, Regent Seven Seas, Seabourn, Crystal, The Ritz-Carlton Yacht Collection and more. See estimated fares now and get an exact quote from R Travel.</p>
        <CruiseForm />
      </section>
    </main>
  );
}
