import Link from "next/link";
import SearchForm from "./components/SearchForm";
import { DESTINATIONS } from "@/lib/destinations";

export default function Home() {
  return (
    <main className="wrap">
      <section className="hero">
        <h1>Fly anywhere.<br />Pay the price you see.</h1>
        <p>Search 300+ airlines. Every price includes taxes and fees.</p>
        <SearchForm />
      </section>
      <section style={{ paddingBottom: 48 }}>
        <h2 className="dest-h">Get inspired with R Travel guides</h2>
        <div className="dest-grid">
          {DESTINATIONS.slice(0, 8).map((d) => (
            <Link key={d.slug} href={`/destinations/${d.slug}`} className="card dest-card">
              <span className="dest-code">{d.mainAirport}</span>
              <b>{d.name}</b>
              <span className="muted" style={{ fontSize: 14 }}>{d.tagline}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
