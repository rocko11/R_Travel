import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { allJetRequests, isAdmin } from "@/lib/jetRequests";
import { allCruiseRequests } from "@/lib/cruiseRequests";
import { allHotelRequests } from "@/lib/hotelRequests";
import { allConcierge } from "@/lib/concierge";
import { allTourRequests } from "@/lib/tourRequests";
import { allCarRequests } from "@/lib/carRequests";

export const dynamic = "force-dynamic";
export const metadata = { title: "R Travel admin" };

export default async function AdminHome() {
  const user = await currentUser();
  if (!isAdmin(user?.email)) notFound();
  const [jets, cruises, hotels, cc, tours, cars] = await Promise.all([
    allJetRequests(),
    allCruiseRequests(),
    allHotelRequests(),
    allConcierge(),
    allTourRequests(),
    allCarRequests(),
  ]);
  const cards = [
    { href: "/admin/concierge", title: "Concierge requests", n: cc.filter((r) => r.status === "new").length, sub: `${cc.length} total` },
    { href: "/admin/hotels", title: "Hotel requests", n: hotels.filter((r) => r.status === "new").length, sub: `${hotels.length} total` },
    { href: "/admin/cars", title: "Car rental requests", n: cars.filter((r) => r.status === "new").length, sub: `${cars.length} total` },
    { href: "/admin/tours", title: "Tour requests", n: tours.filter((r) => r.status === "new").length, sub: `${tours.length} total` },
    { href: "/admin/jets", title: "Private jet requests", n: jets.filter((r) => r.status === "new").length, sub: `${jets.length} total` },
    { href: "/admin/cruises", title: "Luxury cruise requests", n: cruises.filter((r) => r.status === "new").length, sub: `${cruises.length} total` },
  ];
  return (
    <main className="wrap" style={{ padding: "28px 16px 60px", maxWidth: 900 }}>
      <h1 className="page-h">R Travel admin</h1>
      <div className="dest-grid">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card dest-card">
            <b>{c.title}</b>
            <span style={{ fontSize: 32, fontWeight: 800 }}>{c.n}</span>
            <span className="tiny">new · {c.sub}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
