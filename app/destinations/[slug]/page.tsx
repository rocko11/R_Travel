import Link from "next/link";
import { notFound } from "next/navigation";
import { DESTINATIONS, destinationBySlug } from "@/lib/destinations";
import DestinationWeather from "../../components/DestinationWeather";
import TourCards from "../../components/TourCards";

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = destinationBySlug((await params).slug);
  if (!d) return {};
  return {
    title: `${d.name} travel guide: things to do, hotels, events — R Travel`,
    description: `R Travel's ${d.name} guide: top attractions, where to stay, getting around, events and tours. Book flights to ${d.name} with R Travel.`,
  };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="guide-sec">
      <h2 className="dest-h">{title}</h2>
      {children}
    </section>
  );
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

  const nav = [
    ["todo", "Things to do"],
    d.hotels && ["hotels", "Hotels"],
    (d.airport || d.transit) && ["getting-around", "Getting there and around"],
    d.events && ["events", "Events and nightlife"],
    d.food && ["food", "Food"],
    d.tours && ["tours", "Tours"],
    ["practical", "Practical info"],
  ].filter(Boolean) as [string, string][];

  return (
    <main className="wrap" style={{ padding: "32px 16px 60px", maxWidth: 960 }}>
      <Link href="/destinations" className="tiny" style={{ textDecoration: "none" }}>← All R Travel guides</Link>
      <h1 className="page-h" style={{ marginTop: 8 }}>{d.name}</h1>
      <p style={{ fontSize: 19, margin: "0 0 8px" }}>{d.tagline}</p>
      <p className="muted" style={{ margin: 0 }}>
        {d.country}{d.region ? ` · ${d.region}` : ""} · <DestinationWeather iata={d.mainAirport} />
      </p>
      {d.arrivals && <p className="guide-badge">{d.arrivals}</p>}

      <div className="dest-cta">
        <Link href={flightHref} className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Find flights to {d.name}</Link>
        <Link href={`/planner?city=${d.slug}`} className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Plan my days</Link>
        <Link href={`/concierge?city=${d.slug}`} className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Ask the concierge</Link>
        <Link href="/jets" className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Fly private</Link>
      </div>

      <nav className="guide-nav" aria-label="On this page">
        {nav.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <p style={{ fontSize: 17, lineHeight: 1.65 }}>{d.intro}</p>

      <Section id="todo" title={`Top attractions in ${d.name}`}>
        <ol className="dest-todo">
          {d.todo.map((t) => <li key={t.title}><b>{t.title}</b><span>{t.text}</span></li>)}
        </ol>
      </Section>

      {d.hotels && (
        <Section id="hotels" title="Where to stay">
          <p className="muted">{d.neighborhoods}</p>
          <div className="hotel-grid">
            {d.hotels.map((h) => (
              <div key={h.name} className="card hotel-card">
                <span className={`chip ${h.tier === "Luxury" ? "good" : ""}`}>{h.tier}</span>
                <b>{h.name}</b>
                <span className="tiny">{h.area}</span>
              </div>
            ))}
          </div>
          <Link href={`/hotels?city=${d.slug}`} className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginTop: 4 }}>
            Get hotel rates for {d.name}
          </Link>
        </Section>
      )}

      {(d.airport || d.transit) && (
        <Section id="getting-around" title="Getting there and around">
          {d.airport && <p><b>From the airport.</b> {d.airport}</p>}
          {d.gettingAround && <p><b>In the city.</b> {d.gettingAround}</p>}
          {d.transit && (
            <>
              <h3 className="guide-h3">Train and bus tips</h3>
              <ul className="guide-list">{d.transit.map((t) => <li key={t}>{t}</li>)}</ul>
            </>
          )}
        </Section>
      )}

      {(d.events || d.nightlife || d.sports) && (
        <Section id="events" title="Events, nightlife and sports">
          {d.events && (
            <div className="event-grid">
              {d.events.map((e) => (
                <div key={e.name} className="card event-card">
                  <span className="event-when">{e.when}</span>
                  <b>{e.name}</b>
                  <span className="muted" style={{ fontSize: 14 }}>{e.text}</span>
                </div>
              ))}
            </div>
          )}
          {d.nightlife && <p><b>Nightlife and parties.</b> {d.nightlife}</p>}
          {d.sports && <p><b>Sports.</b> {d.sports}</p>}
          {d.events && <p className="tiny">Dates change every year; check official sites before booking. The concierge can get tickets.</p>}
        </Section>
      )}

      {d.food && (
        <Section id="food" title="What to eat">
          <div className="chips">{d.food.map((f) => <span key={f} className="chip">{f}</span>)}</div>
        </Section>
      )}

      {d.tours && (
        <Section id="tours" title="Local tours in R Travel">
          <p className="muted">Our picks for {d.name}, plus more options once you search.</p>
          <TourCards city={d.slug} tours={d.tours} />
          <Link href={`/tours?city=${d.slug}`} className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginTop: 4 }}>
            Book a tour in {d.name}
          </Link>
        </Section>
      )}

      <Section id="practical" title="Practical info">
        <div className="dest-facts">
          <div className="card section"><h3>When to go</h3><p>{d.bestTime}</p></div>
          {d.currency && <div className="card section"><h3>Money</h3><p>{d.currency}</p></div>}
          {d.language && <div className="card section"><h3>Language</h3><p>{d.language}</p></div>}
          <div className="card section"><h3>R Travel tip</h3><p>{d.tip}</p></div>
          {!d.hotels && <div className="card section"><h3>Where to stay</h3><p>{d.neighborhoods}</p></div>}
        </div>
        {d.goodToKnow && (
          <>
            <h3 className="guide-h3">Good to know</h3>
            <ul className="guide-list">{d.goodToKnow.map((g) => <li key={g}>{g}</li>)}</ul>
          </>
        )}
      </Section>

      <p className="tiny" style={{ marginTop: 24 }}>
        Opening hours, prices, event dates and entry rules change. Check official sites before you go. Written by the R Travel team.
      </p>
    </main>
  );
}
