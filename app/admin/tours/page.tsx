import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";
import { allTourInterest } from "@/lib/tourInterest";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tour demand" };

export default async function TourDemand() {
  const user = await currentUser();
  if (!isAdmin(user?.email)) notFound();
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
      <h1 className="page-h">Tour demand</h1>
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
