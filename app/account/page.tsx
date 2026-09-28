import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { bookingsForUser } from "@/lib/store";
import { jetRequestsForUser } from "@/lib/jetRequests";
import { JET_CLASSES } from "@/lib/jets";
import { cruiseRequestsForUser } from "@/lib/cruiseRequests";
import { CRUISE_SHIPS, SUITE_LABEL } from "@/lib/cruises";
import { hotelRequestsForUser } from "@/lib/hotelRequests";
import { ROOM_LABEL } from "@/lib/hotels";
import { plansForUser } from "@/lib/savedPlans";
import { conciergeForUser, CONCIERGE_SERVICES, CONCIERGE_STATUS_LABEL } from "@/lib/concierge";
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
  const jets = await jetRequestsForUser(user.id);
  const cruises = await cruiseRequestsForUser(user.id);
  const hotels = await hotelRequestsForUser(user.id);
  const cc = await conciergeForUser(user.id);
  const plans = await plansForUser(user.id);
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

      {bookings.length === 0 && jets.length === 0 && cruises.length === 0 && hotels.length === 0 && cc.length === 0 && plans.length === 0 && (
        <div className="card state" style={{ marginTop: 20 }}>
          <p>No trips yet. Flights you book while signed in will show up here.</p>
          <Link href="/" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Search flights</Link>
        </div>
      )}
      {upcoming.length > 0 && (<><h2 className="trip-h">Upcoming</h2>{list(upcoming)}</>)}
      {plans.length > 0 && (
        <>
          <h2 className="trip-h">Saved trip plans</h2>
          {plans.map((p) => (
            <Link key={p.id} href={`/planner?plan=${p.id}`} className="card trip">
              <div>
                <div className="trip-route">{p.title}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {p.city} · {day(p.start)} · {p.days.length} day{p.days.length > 1 ? "s" : ""}
                </div>
                <div className="tiny">Updated {new Date(p.updatedAt).toLocaleDateString("en-US", { timeZone: "America/New_York" })}</div>
              </div>
              <div style={{ textAlign: "right" }}><span className="chip">Open and edit</span></div>
            </Link>
          ))}
        </>
      )}
      {cc.length > 0 && (
        <>
          <h2 className="trip-h">Concierge requests</h2>
          {cc.map((r) => (
            <div key={r.id} className="card trip">
              <div>
                <div className="trip-route">{r.city}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {day(r.startDate)}{r.endDate ? ` – ${day(r.endDate)}` : ""} · {r.guests} guest{r.guests > 1 ? "s" : ""}
                </div>
                <div className="tiny">{r.services.map((s) => CONCIERGE_SERVICES.find((x) => x.id === s)?.label).join(" · ")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`chip ${r.status === "confirmed" ? "good" : ""}`}>{CONCIERGE_STATUS_LABEL[r.status]}</span>
              </div>
            </div>
          ))}
        </>
      )}
      {jets.length > 0 && (
        <>
          <h2 className="trip-h">Private jet requests</h2>
          {jets.map((r) => (
            <div key={r.id} className="card trip">
              <div>
                <div className="trip-route">{r.from.label} → {r.to.label}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {day(r.departDate)} {r.departTime}{r.returnDate ? ` — returns ${day(r.returnDate)}` : ""} · {r.passengers} passenger{r.passengers > 1 ? "s" : ""}
                </div>
                <div className="tiny">{r.category === "any" ? "Best available aircraft" : JET_CLASSES.find((c) => c.id === r.category)?.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`chip ${r.status === "booked" ? "good" : ""}`}>
                  {{ new: "Quote requested", quoted: "Quote sent", booked: "Booked", closed: "Closed" }[r.status]}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
      {hotels.length > 0 && (
        <>
          <h2 className="trip-h">Hotel requests</h2>
          {hotels.map((r) => (
            <div key={r.id} className="card trip">
              <div>
                <div className="trip-route">{r.destination}{r.hotelName ? ` — ${r.hotelName}` : ""}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {day(r.checkIn)} – {day(r.checkOut)} · {r.guests} guest{r.guests > 1 ? "s" : ""} · {r.rooms} room{r.rooms > 1 ? "s" : ""} · {ROOM_LABEL[r.roomType]}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`chip ${r.status === "booked" ? "good" : ""}`}>
                  {{ new: "Quote requested", quoted: "Quote sent", booked: "Booked", closed: "Closed" }[r.status]}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
      {cruises.length > 0 && (
        <>
          <h2 className="trip-h">Luxury cruise requests</h2>
          {cruises.map((r) => {
            const ship = CRUISE_SHIPS.find((s) => s.id === r.shipId);
            return (
              <div key={r.id} className="card trip">
                <div>
                  <div className="trip-route">{r.region === "any" ? "Anywhere" : r.region}{ship ? ` — ${ship.line} ${ship.ship}` : ""}</div>
                  <div className="muted" style={{ fontSize: 14 }}>
                    {r.departMonth} · {r.nights} nights · {r.guests} guest{r.guests > 1 ? "s" : ""} · {SUITE_LABEL[r.suite]}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`chip ${r.status === "booked" ? "good" : ""}`}>
                    {{ new: "Quote requested", quoted: "Quote sent", booked: "Booked", closed: "Closed" }[r.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}
      {past.length > 0 && (<><h2 className="trip-h">Past</h2>{list(past)}</>)}
    </main>
  );
}
