import Link from "next/link";
import { notFound } from "next/navigation";
import { DESTINATIONS, destinationBySlug } from "@/lib/destinations";
import DestinationWeather from "../../components/DestinationWeather";

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = destinationBySlug((await params).slug);
  if (!d) return {};
  return {
    title: `Things to do in ${d.name} — R Travel guide`,
    description: `R Travel's ${d.name} guide: top things to do, best time to visit and where to stay. Book flights to ${d.name} with R Travel.`,
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = destinationBySlug((await params).slug);
  if (!d) notFound();
  const soon = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
  const back = new Date(Date.now() + 28 * 86_400_000).toISOString().slice(0, 10);
  const flightHref = `/search?${new URLSearchParams({
    origin: "JFK", destination: d.mainAirport, fromLabel: "New York (JFK)", toLabel: `${d.name} (${d.mainAirport})`,
    departDate: soon, returnDate: back, adults: "1", cabin: "economy",
  })}`;

  return (
    <main className="wrap" style={{ padding: "32px 16px 60px", maxWidth: 900 }}>
      <Link href="/destinations" className="tiny" style={{ textDecoration: "none" }}>← All R Travel guides</Link>
      <h1 className="page-h" style={{ marginTop: 8 }}>{d.name}</h1>
      <p style={{ fontSize: 18, margin: "0 0 6px" }}>{d.tagline}</p>
      <p className="muted" style={{ margin: 0 }}>{d.country} · <DestinationWeather iata={d.mainAirport} /></p>

      <div className="dest-cta">
        <Link href={flightHref} className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Find flights to {d.name}</Link>
        <Link href="/jets" className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Fly private</Link>
      </div>

      <p style={{ fontSize: 16, lineHeight: 1.6 }}>{d.intro}</p>

      <h2 className="dest-h">Top things to do in {d.name}</h2>
      <ol className="dest-todo">
        {d.todo.map((t) => (
          <li key={t.title}><b>{t.title}</b><span>{t.text}</span></li>
        ))}
      </ol>

      <div className="dest-facts">
        <div className="card section"><h3>When to go</h3><p>{d.bestTime}</p></div>
        <div className="card section"><h3>Where to stay</h3><p>{d.neighborhoods}</p></div>
        <div className="card section"><h3>R Travel tip</h3><p>{d.tip}</p></div>
      </div>

      <p className="tiny" style={{ marginTop: 24 }}>
        Opening hours, ticket rules and seasons change. Check official sites before you go. Written by the R Travel team.
      </p>
    </main>
  );
}
