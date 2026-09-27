import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { bookingsForUser } from "@/lib/store";
import { day, money, time } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "My trips" };

const STATUS = {
  confirmed: { label: "Confirmed", cls: "good" },
  pending_payment: { label: "Awaiting payment", cls: "" },
  failed: { label: "Not issued", cls: "bad" },
} as const;

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/account/login?next=/account");
  const bookings = await bookingsForUser(user.id);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.offer.slices[0].departAt.slice(0, 10) >= today);
  const past = bookings.filter((b) => b.offer.slices[0].departAt.slice(0, 10) < today);

  const list = (items: typeof bookings) =>
    items.map((b) => {
      const first = b.offer.slices[0];
      const last = b.offer.slices[b.offer.slices.length - 1];
      const s = STATUS[b.status];
      return (
        <Link key={b.id} href={`/booking/${b.id}`} className="card trip">
          <div>
            <div className="trip-route">
              {first.origin} → {first.destination}
              {b.offer.slices.length > 1 ? ` → ${last.destination}` : ""}
            </div>
            <div className="muted" style={{ fontSize: 14 }}>
              {day(first.departAt)} · {time(first.departAt)}
              {b.offer.slices.length > 1 ? ` — returns ${day(last.departAt)}` : ""} · {b.offer.owner.name}
            </div>
            <div className="tiny">
              {b.passengers.length} traveler{b.passengers.length > 1 ? "s" : ""}
              {b.bookingReference ? ` · Ref ${b.bookingReference}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className={`chip ${s.cls}`}>{s.label}</span>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{money(b.total, b.currency)}</div>
          </div>
        </Link>
      );
    });

  return (
    <main className="wrap" style={{ padding: "28px 16px 60px", maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, letterSpacing: "-0.02em" }}>My trips</h1>
        <span className="muted" style={{ fontSize: 14 }}>{user.name} · {user.email}</span>
      </div>

      {bookings.length === 0 && (
        <div className="card state" style={{ marginTop: 20 }}>
          <p>No trips yet. Flights you book while signed in will show up here.</p>
          <Link href="/" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Search flights</Link>
        </div>
      )}
      {upcoming.length > 0 && (<><h2 className="trip-h">Upcoming</h2>{list(upcoming)}</>)}
      {past.length > 0 && (<><h2 className="trip-h">Past</h2>{list(past)}</>)}
    </main>
  );
}
