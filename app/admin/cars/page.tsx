import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";
import { allCarRequests } from "@/lib/carRequests";
import { CLASS_LABEL } from "@/lib/cars";
import { day, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Car rental requests" };

const AGE_LABEL = { "25plus": "25+", "21to24": "21–24", under21: "Under 21" } as const;

export default async function CarAdmin() {
  const user = await currentUser();
  if (!isAdmin(user?.email)) notFound();
  const list = await allCarRequests();
  const open = list.filter((r) => r.status === "new").length;

  return (
    <main className="wrap" style={{ padding: "28px 16px 60px", maxWidth: 900 }}>
      <h1 style={{ margin: 0, letterSpacing: "-0.02em" }}>Car rental requests</h1>
      <p className="muted">{list.length} total · {open} new</p>
      {list.length === 0 && <div className="card state">No requests yet.</div>}
      {list.map((r) => (
        <div id={r.id} key={r.id} className="card section">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="trip-route">
                {r.pickupLocation}
                {r.dropoffLocation ? ` → ${r.dropoffLocation}` : " (round trip)"}
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                {day(r.pickupDate)} – {day(r.dropoffDate)} · {CLASS_LABEL[r.carClass]} · Driver {AGE_LABEL[r.driverAge]}
              </div>
              {r.estimate && r.estimate.low > 0 && (
                <div className="tiny">Estimate shown: {money(r.estimate.low, "USD")} – {money(r.estimate.high, "USD")}</div>
              )}
            </div>
            <span className={`chip ${r.status === "new" ? "good" : ""}`}>{r.status}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 14 }}>
            <b>{r.name}</b> · <a href={`mailto:${r.email}`}>{r.email}</a> · <a href={`tel:${r.phone}`}>{r.phone}</a>
            {r.notes && <div className="muted" style={{ marginTop: 4 }}>“{r.notes}”</div>}
            <div className="tiny">Received {new Date(r.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })} · {r.id}</div>
          </div>
          <form action={`/api/cars/requests/${r.id}`} method="post" className="admin-row">
            <select name="status" defaultValue={r.status} aria-label="Status">
              <option value="new">New</option>
              <option value="quoted">Quoted</option>
              <option value="booked">Booked</option>
              <option value="closed">Closed</option>
            </select>
            <input name="adminNote" defaultValue={r.adminNote ?? ""} placeholder="Internal note (supplier, car, rate quoted…)" />
            <button className="btn small">Save</button>
          </form>
        </div>
      ))}
    </main>
  );
}
