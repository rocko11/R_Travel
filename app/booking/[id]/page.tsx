import Link from "next/link";
import { notFound } from "next/navigation";
import { getBooking } from "@/lib/store";
import { SliceRow, SliceDetail } from "../../components/Itinerary";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getBooking(id);
  if (!b) notFound();

  return (
    <main className="wrap">
      <div className="card confirm">
        {b.status === "confirmed" && (
          <>
            <div className="alert good">Booked. Confirmation sent to {b.contact.email}.</div>
            <div className="tiny">Airline booking reference</div>
            <div className="pnr">{b.bookingReference}</div>
            {b.mode !== "live" && <p className="tiny">{b.mode === "demo" ? "Demo booking — not a real ticket." : "Duffel test booking — not a real ticket."}</p>}
          </>
        )}
        {b.status === "pending_payment" && <div className="alert warn">Waiting for payment confirmation. Refresh in a moment.</div>}
        {b.status === "failed" && (
          <div className="alert bad">We couldn&apos;t issue this ticket. {b.failureReason}</div>
        )}

        <h2 style={{ margin: "20px 0 12px", fontSize: 18 }}>{b.offer.owner.name}</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {b.offer.slices.map((s, i) => (
            <div key={i}>
              <SliceRow slice={s} iata={b.offer.owner.iata} logo={b.offer.owner.logo} showDate showFlights={false} />
              <SliceDetail slice={s} />
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 15, margin: "20px 0 6px" }}>Travelers</h3>
        {b.passengers.map((p) => (
          <div key={p.id} className="muted">{p.givenName} {p.familyName}</div>
        ))}

        <div style={{ marginTop: 20 }}>
          <div className="line"><span>Airline fare and taxes</span><span>{money(b.baseAmount, b.currency)}</span></div>
          <div className="line"><span>Service fee</span><span>{money(b.markup, b.currency)}</span></div>
          <div className="line total"><span>{b.status === "failed" ? "Total (not charged or refunded)" : "Total paid"}</span><span>{money(b.total, b.currency)}</span></div>
        </div>
        <p className="tiny">Booking ID {b.id}</p>
        {b.userId && (
          <Link href="/account" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginRight: 8 }}>My trips</Link>
        )}
        <Link href="/" className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Search another flight</Link>
      </div>
    </main>
  );
}
