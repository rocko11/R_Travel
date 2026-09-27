import Link from "next/link";
import { DESTINATIONS } from "@/lib/destinations";

export const metadata = {
  title: "Destination guides — R Travel",
  description: "R Travel destination guides: what to do, when to go and where to stay, with flights from 300+ airlines.",
};

export default function Destinations() {
  return (
    <main className="wrap" style={{ padding: "32px 16px 60px" }}>
      <h1 className="page-h">R Travel destination guides</h1>
      <p className="muted" style={{ maxWidth: 640 }}>
        Where to go next? Every R Travel guide covers what to do, the best time to visit and where to stay, with flights
        and private jets one click away.
      </p>
      <div className="dest-grid">
        {DESTINATIONS.map((d) => (
          <Link key={d.slug} href={`/destinations/${d.slug}`} className="card dest-card">
            <span className="dest-code">{d.mainAirport}</span>
            <b>{d.name}</b>
            <span className="tiny">{d.country}</span>
            <span className="muted" style={{ fontSize: 14 }}>{d.tagline}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
