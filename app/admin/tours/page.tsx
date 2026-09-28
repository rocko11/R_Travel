import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";
import { allTourInterest } from "@/lib/tourInterest";
import { allTourRequests } from "@/lib/tourRequests";
import { day } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tours" };

export default async function TourDemand() {
  const user = await currentUser();
  if (!isAdmin(user?.email)) notFound();
  const requests = await allTourRequests();
  const openRequests = requests.filter((r) => r.status === "new").length;
  const list = await allTourInterest();
  const byTour = new Map<string, { name: string; city: string; count: number }>();
  for (const r of list) {
    const cur = byTour.get(r.tourId) ?? { name: r.tourName, city: r.city, count: 0 };
    cur.count++;
    byTour.set(r.tourId, cur);
  }
  const ranked = [...byTour.entries()].sort((a, b) => b[1].count - a[1].count);
  return (
    <main className="wrap" style={{ padding: "28px 16px 60px", maxWidth: 900 }}>
      <h1 className="page-h">Tour requests</h1>
      <p className="muted">{requests.length} total · {openRequests} new</p>
      {requests.length === 0 && <div className="card state">No tour requests yet.</div>}
      {requests.map((r) => (
        <div id={r.id} key={r.id} className="card section">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="trip-route">{r.destination}{r.tourName ? ` — ${r.tourName}` : " — best available"}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {day(r.date)} · {r.travelers} traveler{r.travelers > 1 ? "s" : ""}
              </div>
              {r.estimate && r.estimate.low > 0 && (
                <div className="tiny">Estimate shown: ${r.estimate.low} – ${r.estimate.high} per person</div>
              )}
            </div>
            <span className={`chip ${r.status === "new" ? "good" : ""}`}>{r.status}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 14 }}>
            <b>{r.name}</b> · <a href={`mailto:${r.email}`}>{r.email}</a> · <a href={`tel:${r.phone}`}>{r.phone}</a>
            {r.notes && <div className="muted" style={{ marginTop: 4 }}>“{r.notes}”</div>}
            <div className="tiny">Received {new Date(r.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })} · {r.id}</div>
          </div>
          <form action={`/api/tours/requests/${r.id}`} method="post" className="admin-row">
            <select name="status" defaultValue={r.status} aria-label="Status">
              <option value="new">New</option>
              <option value="quoted">Quoted</option>
              <option value="booked">Booked</option>
              <option value="closed">Closed</option>
            </select>
            <input name="adminNote" defaultValue={r.adminNote ?? ""} placeholder="Internal note (operator, time confirmed…)" />
            <button className="btn small">Save</button>
          </form>
        </div>
      ))}

      <h2 className="page-h" style={{ marginTop: 32 }}>Tour demand (waitlist)</h2>
      <p className="muted">{list.length} signups across {ranked.length} tours. Launch the most-wanted first.</p>
      {ranked.length === 0 && <div className="card state">No signups yet.</div>}
      {ranked.length > 0 && (
        <div className="card section">
          <table className="cab-table">
            <thead><tr><th>Tour</th><th>City</th><th>Signups</th></tr></thead>
            <tbody>
              {ranked.map(([id, t]) => (
                <tr key={id}><td>{t.name}</td><td>{t.city}</td><td><b>{t.count}</b></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.length > 0 && (
        <div className="card section">
          <h2>Latest signups</h2>
          <table className="cab-table">
            <thead><tr><th>When</th><th>Tour</th><th>Email</th></tr></thead>
            <tbody>
              {list.slice(0, 200).map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.createdAt).toLocaleDateString("en-US", { timeZone: "America/New_York" })}</td>
                  <td>{r.tourName}</td>
                  <td><a href={`mailto:${r.email}`}>{r.email}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
