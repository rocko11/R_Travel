import Link from "next/link";
import { notFound } from "next/navigation";
import { getHotelBooking } from "@/lib/hotelBooking";
import { day, money } from "@/lib/format";
import ConversionPixel from "../../../components/ConversionPixel";

export const dynamic = "force-dynamic";

export default async function HotelBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getHotelBooking(id);
  if (!b) notFound();

  return (
    <main className="wrap">
      <div className="card confirm">
        {b.status === "confirmed" && (
          <>
            <ConversionPixel
              eventId={b.id}
              value={b.total}
              currency={b.currency}
              contentType="hotel"
              googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}
              googleAdsLabel={process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL}
            />
            <div className="alert good">Booked. Confirmation sent to {b.contact.email}.</div>
            <div className="tiny">Hotel confirmation code</div>
            <div className="pnr">{b.confirmationCode ?? b.supplierBookingId}</div>
          </>
        )}
        {b.status === "pending_payment" && <div className="alert warn">Waiting for payment confirmation. Refresh in a moment.</div>}
        {b.status === "failed" && <div className="alert bad">We couldn&apos;t confirm this room. {b.failureReason}</div>}

        <h2 style={{ margin: "20px 0 12px", fontSize: 18 }}>{b.hotelName}</h2>
        <div className="muted">{b.destination}</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {day(b.checkIn)} – {day(b.checkOut)}
          {b.roomName ? ` · ${b.roomName}` : ""}
          {b.boardName ? ` · ${b.boardName}` : ""}
        </div>

        <h3 style={{ fontSize: 15, margin: "20px 0 6px" }}>Guests</h3>
        {b.guests.map((g, i) => (
          <div key={i} className="muted">{g.firstName} {g.lastName}</div>
        ))}

        <div style={{ marginTop: 20 }}>
          <div className="line total"><span>{b.status === "failed" ? "Total (not charged or refunded)" : "Total paid"}</span><span>{money(b.total, b.currency)}</span></div>
        </div>
        <p className="tiny">Booking ID {b.id}</p>
        {b.userId && (
          <Link href="/account" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", marginRight: 8 }}>My trips</Link>
        )}
        <Link href="/hotels" className="btn ghost small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Search another hotel</Link>
      </div>
    </main>
  );
}
