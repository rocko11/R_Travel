import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/jetRequests";
import { allConcierge, CONCIERGE_SERVICES, CONCIERGE_STATUS_LABEL } from "@/lib/concierge";
import { day } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Concierge requests" };

const label = (id: string) => CONCIERGE_SERVICES.find((s) => s.id === id)?.label ?? id;

export default async function ConciergeAdmin() {
  const user = await currentUser();
  if (!isAdmin(user?.email)) notFound();
  const list = await allConcierge();
  return (
    <main className="wrap" style={{ padding: "28px 16px 60px", maxWidth: 900 }}>
      <h1 className="page-h">Concierge requests</h1>
      <p className="muted">{list.length} total · {list.filter((r) => r.status === "new").length} new</p>
      {list.length === 0 && <div className="card state">No requests yet.</div>}
      {list.map((r) => (
        <div id={r.id} key={r.id} className="card section">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="trip-route">{r.city}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {day(r.startDate)}{r.endDate ? ` – ${day(r.endDate)}` : ""} · {r.guests} guest{r.guests > 1 ? "s" : ""} · Budget: {r.budget}
              </div>
            </div>
            <span className={`chip ${r.status === "new" ? "good" : ""}`}>{CONCIERGE_STATUS_LABEL[r.status]}</span>
          </div>
          <div className="chips" style={{ marginTop: 8 }}>{r.services.map((s) => <span key={s} className="chip">{label(s)}</span>)}</div>
          <p style={{ whiteSpace: "pre-wrap", margin: "10px 0" }}>{r.details}</p>
          <div style={{ fontSize: 14 }}>
            <b>{r.name}</b> · <a href={`mailto:${r.email}`}>{r.email}</a> · <a href={`tel:${r.phone}`}>{r.phone}</a>
            {r.contactBy !== "email" && (
              <> · prefers {r.contactBy === "whatsapp" ? <a href={`https://wa.me/${r.phone.replace("+", "")}`}>WhatsApp</a> : "a phone call"}</>
            )}
            <div className="tiny">Received {new Date(r.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })} · {r.id}</div>
          </div>
          <form action={`/api/concierge/requests/${r.id}`} method="post" className="admin-row">
            <select name="status" defaultValue={r.status} aria-label="Status">
              <option value="new">Received</option>
              <option value="in_progress">Being arranged</option>
              <option value="confirmed">Confirmed</option>
              <option value="closed">Closed</option>
            </select>
            <input name="adminNote" defaultValue={r.adminNote ?? ""} placeholder="Internal note (bookings made, prices, suppliers…)" />
            <button className="btn small">Save</button>
          </form>
        </div>
      ))}
    </main>
  );
}
