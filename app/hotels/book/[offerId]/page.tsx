"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { day, money } from "@/lib/format";

interface Prebook {
  prebookId: string;
  hotelId: string;
  total: number;
  currency: string;
  roomName?: string;
  boardName?: string;
}

type Guest = { firstName: string; lastName: string };

export default function HotelBookPage({ params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = use(params);
  const id = decodeURIComponent(offerId);
  const router = useRouter();
  const sp = useSearchParams();
  const hotelName = sp.get("hotel") ?? "This hotel";
  const destination = sp.get("dest") ?? "";
  const checkIn = sp.get("in") ?? "";
  const checkOut = sp.get("out") ?? "";
  const guestCount = Math.max(1, Math.min(10, Number(sp.get("guests") ?? 1)));

  const [pre, setPre] = useState<Prebook | null>(null);
  const [loadError, setLoadError] = useState("");
  const [guests, setGuests] = useState<Guest[]>(Array.from({ length: guestCount }, () => ({ firstName: "", lastName: "" })));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [me, setMe] = useState<{ email: string; name: string } | null | undefined>(undefined);
  const [notice, setNotice] = useState(sp.get("cancelled") ? "Payment was cancelled. Your details are still here." : "");

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
    fetch("/api/hotels/prebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId: id }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "This rate is no longer available.");
        return j as Prebook;
      })
      .then(setPre)
      .catch((e) => setLoadError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setGuest = (i: number, k: keyof Guest, v: string) =>
    setGuests((list) => list.map((g, j) => (j === i ? { ...g, [k]: v } : g)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pre) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/hotels/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: id,
          destination,
          hotelName,
          checkIn,
          checkOut,
          quotedTotal: pre.total,
          guests,
          contact: { email, phone },
        }),
      });
      const j = await r.json();
      if (r.status === 409) {
        setPre((cur) => (cur ? { ...cur, total: pre.total } : cur));
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
          <Link href="/hotels" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Back to search</Link>
        </div>
      </main>
    );
  if (!pre) return <main className="wrap"><div className="skeleton" style={{ marginTop: 32, height: 240 }} /></main>;

  return (
    <main className="wrap">
      <form className="book" onSubmit={submit}>
        <div>
          {notice && <div className="alert warn">{notice}</div>}
          {me === null && (
            <div className="alert" style={{ background: "var(--brand-soft)", color: "var(--ink)" }}>
              <b>Want to see this trip later?</b>{" "}
              <a href={`/account/login?next=${encodeURIComponent(`/hotels/book/${encodeURIComponent(id)}${typeof window !== "undefined" ? window.location.search : ""}`)}`} style={{ color: "var(--brand)" }}>Sign in</a>
              {" or "}
              <a href={`/account/signup?next=${encodeURIComponent(`/hotels/book/${encodeURIComponent(id)}${typeof window !== "undefined" ? window.location.search : ""}`)}`} style={{ color: "var(--brand)" }}>create an account</a>
              {" "}before booking and it will be saved under My trips. You can also continue as a guest.
            </div>
          )}
          {me && <div className="alert good">Signed in as {me.name}. This trip will be saved under My trips.</div>}

          <section className="card section">
            <h2>Your stay</h2>
            <p>{hotelName} · {destination}</p>
            <p className="muted">
              {checkIn && day(checkIn)} – {checkOut && day(checkOut)}
              {pre.roomName ? ` · ${pre.roomName}` : ""}
              {pre.boardName ? ` · ${pre.boardName}` : ""}
            </p>
          </section>

          <section className="card section">
            <h2>Guests</h2>
            <p>Enter names exactly as they appear on ID.</p>
            {guests.map((g, i) => (
              <div className="form-grid two" key={i} style={{ marginTop: i > 0 ? 10 : 0 }}>
                <label className="input">First name
                  <input required autoComplete={i === 0 ? "given-name" : "off"} value={g.firstName} onChange={(e) => setGuest(i, "firstName", e.target.value)} />
                </label>
                <label className="input">Last name
                  <input required autoComplete={i === 0 ? "family-name" : "off"} value={g.lastName} onChange={(e) => setGuest(i, "lastName", e.target.value)} />
                </label>
              </div>
            ))}
          </section>

          <section className="card section">
            <h2>Contact</h2>
            <p>We send the confirmation here and contact you about any changes.</p>
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
          <div className="line total"><span>Total</span><span>{money(pre.total, pre.currency)}</span></div>
          <p className="tiny">For the whole stay. Rate is locked for a short window; if it changes before you pay, you&apos;ll see the new price here.</p>
          <label className="check" style={{ alignItems: "flex-start", margin: "12px 0" }}>
            <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
            <span className="tiny" style={{ color: "var(--ink-2)" }}>I confirm guest names match ID and accept the rate&apos;s cancellation policy.</span>
          </label>
          {error && <div className="alert bad">{error}</div>}
          <button className="btn" style={{ width: "100%" }} disabled={busy || !agree}>
            {busy ? "Processing…" : `Pay ${money(pre.total, pre.currency)}`}
          </button>
        </aside>
      </form>
    </main>
  );
}
