"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SliceDetail, SliceRow } from "../../components/Itinerary";
import WeatherStrip from "../../components/WeatherStrip";
import CabinPanel from "../../components/CabinPanel";
import { money } from "@/lib/format";
import type { PassengerInput, PricedOffer } from "@/lib/types";

type Pax = Omit<PassengerInput, "id">;
const blank: Pax = { title: "mr", givenName: "", familyName: "", gender: "m", bornOn: "" };

const PAX_LABEL = { adult: "Adult", child: "Child", infant_without_seat: "Infant (on lap)" } as const;

export default function BookPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = use(params);
  const id = decodeURIComponent(offerId);
  const router = useRouter();
  const sp = useSearchParams();
  const [offer, setOffer] = useState<PricedOffer | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pax, setPax] = useState<Pax[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<{ email: string; name: string } | null | undefined>(undefined);
  const [notice, setNotice] = useState(sp.get("cancelled") ? "Payment was cancelled. Your details are still here." : "");

  const load = async () => {
    const r = await fetch(`/api/offers/${encodeURIComponent(id)}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Could not load this fare.");
    return j.offer as PricedOffer;
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => {
        setMe(j.user);
        if (j.user) setEmail((cur) => cur || j.user.email);
      })
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    load()
      .then((o) => {
        setOffer(o);
        setPax((cur) => (cur.length ? cur : o.passengers.map(() => ({ ...blank }))));
        const seen = Number(sp.get("t"));
        if (seen && o.total > seen + 0.009) {
          setNotice(`The airline updated this fare since your search: it's now ${money(o.total, o.currency)} (was ${money(seen, o.currency)}).`);
        }
      })
      .catch((e) => setLoadError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (i: number, k: keyof Pax, v: string) =>
    setPax((list) =>
      list.map((p, j) => {
        if (j !== i) return p;
        const next = { ...p, [k]: v } as Pax;
        if (k === "title") {
          if (v === "mr") next.gender = "m";
          if (["ms", "mrs", "miss"].includes(v)) next.gender = "f";
        }
        return next;
      })
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offer) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          quotedTotal: offer.total,
          passengers: pax.map((p, i) => ({ ...p, id: offer.passengers[i].id })),
          contact: { email, phone },
        }),
      });
      const j = await r.json();
      if (r.status === 409) {
        const fresh = await load();
        setOffer(fresh);
        throw new Error(j.error);
      }
      if (!r.ok) throw new Error(j.error || "Booking failed.");
      if (/^https?:/.test(j.redirectUrl)) window.location.href = j.redirectUrl;
      else router.push(j.redirectUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
      setBusy(false);
    }
  };

  if (loadError)
    return (
      <main className="wrap">
        <div className="card state" style={{ marginTop: 32 }}>
          <p>{loadError}</p>
          <button className="btn small" onClick={() => router.back()}>Back to results</button>
        </div>
      </main>
    );
  if (!offer) return <main className="wrap"><div className="skeleton" style={{ marginTop: 32, height: 240 }} /></main>;

  return (
    <main className="wrap">
      <form className="book" onSubmit={submit}>
        <div>
          {notice && <div className="alert warn">{notice}</div>}
          {me === null && (
            <div className="alert" style={{ background: "var(--brand-soft)", color: "var(--ink)" }}>
              <b>Want to see this trip later?</b>{" "}
              <a href={`/account/login?next=${encodeURIComponent(`/book/${encodeURIComponent(id)}${typeof window !== "undefined" ? window.location.search : ""}`)}`} style={{ color: "var(--brand)" }}>Sign in</a>
              {" or "}
              <a href={`/account/signup?next=${encodeURIComponent(`/book/${encodeURIComponent(id)}${typeof window !== "undefined" ? window.location.search : ""}`)}`} style={{ color: "var(--brand)" }}>create an account</a>
              {" "}before booking and it will be saved under My trips. You can also continue as a guest.
            </div>
          )}
          {me && <div className="alert good">Signed in as {me.name}. This trip will be saved under My trips.</div>}

          <WeatherStrip origin={offer.slices[0].origin} destination={offer.slices[0].destination} date={offer.slices[0].departAt.slice(0, 10)} />
          <section className="card section">
            <h2>Your trip</h2>
            <p>{offer.owner.name} · {offer.checkedBags > 0 ? `${offer.checkedBags} checked bag included` : "Carry-on only"} · {offer.refundable ? "Refundable" : "Non-refundable"}{offer.changeable ? ", changes allowed" : ""}</p>
            <div style={{ display: "grid", gap: 16 }}>
              {offer.slices.map((s, i) => (
                <div key={i}>
                  <SliceRow slice={s} iata={offer.owner.iata} logo={offer.owner.logo} showDate showFlights={false} />
                  <SliceDetail slice={s} />
                </div>
              ))}
            </div>
            <CabinPanel offer={offer} allowCompare={false} startOpen />
          </section>

          <section className="card section">
            <h2>Travelers</h2>
            <p>Enter names exactly as they appear on each passport.</p>
            {offer.passengers.map((op, i) => (
              <div key={op.id}>
                <div className="pax-title">Traveler {i + 1} · {PAX_LABEL[op.type]}{op.age != null ? `, age ${op.age}` : ""}</div>
                <div className="form-grid">
                  <label className="input">Title
                    <select value={pax[i]?.title} onChange={(e) => set(i, "title", e.target.value)}>
                      <option value="mr">Mr</option><option value="ms">Ms</option><option value="mrs">Mrs</option>
                      <option value="miss">Miss</option><option value="dr">Dr</option>
                    </select>
                  </label>
                  <label className="input">First and middle names
                    <input required autoComplete={i === 0 ? "given-name" : "off"} value={pax[i]?.givenName ?? ""} onChange={(e) => set(i, "givenName", e.target.value)} />
                  </label>
                  <label className="input">Last name
                    <input required autoComplete={i === 0 ? "family-name" : "off"} value={pax[i]?.familyName ?? ""} onChange={(e) => set(i, "familyName", e.target.value)} />
                  </label>
                </div>
                <div className="form-grid two" style={{ marginTop: 10 }}>
                  <label className="input">Date of birth
                    <input required type="date" max={new Date().toISOString().slice(0, 10)} value={pax[i]?.bornOn ?? ""} onChange={(e) => set(i, "bornOn", e.target.value)} />
                  </label>
                  <label className="input">Gender (as on passport)
                    <select value={pax[i]?.gender} onChange={(e) => set(i, "gender", e.target.value)}>
                      <option value="m">Male</option><option value="f">Female</option>
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </section>

          <section className="card section">
            <h2>Contact</h2>
            <p>We send the e-ticket here and contact you about schedule changes.</p>
            <div className="form-grid two">
              <label className="input">Email
                <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="input">Mobile, with country code
                <input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
          </section>
        </div>

        <aside className="card summary">
          <h3>Price</h3>
          <div className="line"><span>Airline fare and taxes</span><span>{money(offer.baseAmount, offer.currency)}</span></div>
          <div className="line"><span>Service fee</span><span>{money(offer.markup, offer.currency)}</span></div>
          <div className="line total"><span>Total</span><span>{money(offer.total, offer.currency)}</span></div>
          <p className="tiny">For {offer.passengers.length} traveler{offer.passengers.length > 1 ? "s" : ""}. Fare is held until it expires; the airline may change it before ticketing.</p>
          <label className="check" style={{ alignItems: "flex-start", margin: "12px 0" }}>
            <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
            <span className="tiny" style={{ color: "var(--ink-2)" }}>
              I confirm traveler names match passports and accept the airline&apos;s fare rules{offer.refundable ? "" : ", including that this ticket is non-refundable"}.
            </span>
          </label>
          {error && <div className="alert bad">{error}</div>}
          <button className="btn" style={{ width: "100%" }} disabled={busy || !agree}>
            {busy ? "Processing…" : `Pay ${money(offer.total, offer.currency)}`}
          </button>
        </aside>
      </form>
    </main>
  );
}
