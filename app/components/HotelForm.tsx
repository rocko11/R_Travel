"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AirportInput, { type PlaceValue } from "./AirportInput";
import HotelMap from "./HotelMap";
import { destinationBySlug } from "@/lib/destinations";
import { ROOM_LABEL, matchDestination, type HotelEstimate, type HotelTier, type RoomType } from "@/lib/hotels";
import { money } from "@/lib/format";

type Sort = "price" | "rating";
type View = "list" | "map";

const iso = (d: Date) => d.toISOString().slice(0, 10);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function HotelForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const preset = destinationBySlug(sp.get("city") ?? "");
  const today = iso(new Date());

  // A returning guest (e.g. clicking "Back to search" from a hotel's detail page, or
  // the browser's own back button) should land on the same search, not an empty form —
  // so the full search (not just the destination) is restored from the URL when present.
  const qCode = sp.get("code");
  const qLabel = sp.get("label");
  const qIn = sp.get("in");
  const qOut = sp.get("out");
  const qGuests = Number(sp.get("guests"));
  const qRooms = Number(sp.get("rooms"));

  const [place, setPlace] = useState<PlaceValue | null>(
    qCode
      ? { iata: qCode, label: qLabel || qCode, country: sp.get("country") || undefined }
      : preset
        ? { iata: preset.mainAirport, label: `${preset.name} (${preset.mainAirport})` }
        : null
  );
  const [checkIn, setCheckIn] = useState(
    qIn && DATE_RE.test(qIn) ? qIn : iso(new Date(Date.now() + 14 * 86_400_000))
  );
  const [checkOut, setCheckOut] = useState(
    qOut && DATE_RE.test(qOut) ? qOut : iso(new Date(Date.now() + 17 * 86_400_000))
  );
  const [guests, setGuests] = useState(Number.isInteger(qGuests) && qGuests > 0 ? qGuests : 2);
  const [rooms, setRooms] = useState(Number.isInteger(qRooms) && qRooms > 0 ? qRooms : 1);
  const [roomType, setRoomType] = useState<RoomType>("standard");
  const [hotelName, setHotelName] = useState<string | "any">("any");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentId, setSentId] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      if (j.user) {
        setSignedIn(true);
        setName((n) => n || j.user.name);
        setEmail((e) => e || j.user.email);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (checkOut <= checkIn) setCheckOut(iso(new Date(Date.parse(checkIn) + 3 * 86_400_000)));
  }, [checkIn, checkOut]);

  // Keep the URL in sync with the search so it survives a page refresh, the browser's
  // own back button, or "Back to search" from a hotel's detail page — without this the
  // address bar always just read "/hotels" and every return landed on an empty form.
  useEffect(() => {
    if (!place) return;
    const q = new URLSearchParams({
      code: place.iata,
      label: place.label,
      in: checkIn,
      out: checkOut,
      guests: String(guests),
      rooms: String(rooms),
      ...(place.country ? { country: place.country } : {}),
    });
    router.replace(`/hotels?${q}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, checkIn, checkOut, guests, rooms]);

  const matched = useMemo(() => (place ? matchDestination(place.iata) : undefined), [place]);
  const destInput = useMemo(
    () =>
      place
        ? { slug: matched?.slug, code: place.iata, city: place.label.replace(/\s*\([^)]*\)\s*$/, ""), country: place.country }
        : undefined,
    [place, matched]
  );
  const nights = Math.max(1, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));
  const [estimates, setEstimates] = useState<HotelEstimate[]>([]);
  const [liveRates, setLiveRates] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [sort, setSort] = useState<Sort>("price");
  const [hiddenTiers, setHiddenTiers] = useState<Set<HotelTier>>(new Set());
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [nameFilter, setNameFilter] = useState("");
  const [view, setView] = useState<View>("list");

  useEffect(() => {
    if (!destInput) {
      setEstimates([]);
      setLiveRates(false);
      return;
    }
    const ctl = new AbortController();
    setLoadingRates(true);
    const t = setTimeout(() => {
      const q = new URLSearchParams({
        code: destInput.code,
        city: destInput.city,
        checkIn,
        checkOut,
        guests: String(guests),
        rooms: String(rooms),
        roomType,
        ...(destInput.country ? { country: destInput.country } : {}),
      });
      fetch(`/api/hotels/search?${q}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((j) => {
          setEstimates(j.hotels ?? []);
          setLiveRates(j.source === "live");
        })
        .catch((e) => {
          if (e.name !== "AbortError") {
            setEstimates([]);
            setLiveRates(false);
          }
        })
        .finally(() => setLoadingRates(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [destInput, checkIn, checkOut, guests, rooms, roomType]);

  useEffect(() => {
    if (hotelName !== "any" && !estimates.some((e) => e.hotel.name === hotelName)) setHotelName("any");
  }, [estimates, hotelName]);
  useEffect(() => {
    // Coming back from a hotel's detail page with ?hotel=<name> preselects it once rates load.
    const wanted = sp.get("hotel");
    if (wanted && estimates.some((e) => e.hotel.name === wanted)) setHotelName(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimates]);
  useEffect(() => {
    setHiddenTiers(new Set());
    setMaxPrice("");
    setNameFilter("");
  }, [destInput?.code]);

  const availableTiers = useMemo(() => [...new Set(estimates.map((e) => e.hotel.tier))], [estimates]);
  const normalizedNameFilter = nameFilter.trim().toLowerCase();
  const filteredSorted = useMemo(() => {
    const list = estimates.filter(
      (e) =>
        !hiddenTiers.has(e.hotel.tier) &&
        (maxPrice === "" || e.low * rooms <= maxPrice) &&
        (!normalizedNameFilter || e.hotel.name.toLowerCase().includes(normalizedNameFilter))
    );
    return [...list].sort((a, b) =>
      sort === "rating" ? (b.hotel.stars ?? 0) - (a.hotel.stars ?? 0) : a.low - b.low
    );
  }, [estimates, hiddenTiers, maxPrice, normalizedNameFilter, sort, rooms]);

  const chosen = estimates.find((e) => e.hotel.name === hotelName);
  const cheapestBookable = estimates.find((e) => e.offerId);
  // An exact hotel pick books that rate; "Best available" books the cheapest bookable rate, when one exists.
  const bookable = chosen?.offerId ? chosen : hotelName === "any" ? cheapestBookable : undefined;

  // Shared by the bottom "Continue to book" button and each list card's own "Book now" —
  // so a guest can book straight from the list without opening the property page first.
  const goToBookingFor = (est: HotelEstimate) => {
    if (!place || !est.offerId) return;
    const q = new URLSearchParams({
      hotel: est.hotel.name,
      dest: place.label,
      in: checkIn,
      out: checkOut,
      guests: String(guests),
    });
    router.push(`/hotels/book/${encodeURIComponent(est.offerId)}?${q}`);
  };

  const goToBooking = () => {
    if (!bookable) return;
    goToBookingFor(bookable);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!place) return setError("Choose a city or airport.");
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/hotels/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: place.label,
          slug: matched?.slug,
          hotelName: hotelName === "any" ? undefined : hotelName,
          checkIn,
          checkOut,
          guests,
          rooms,
          roomType,
          estimate: chosen ? { low: chosen.low, high: chosen.high } : undefined,
          name,
          email,
          phone,
          notes,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not send your request.");
      setSentId(j.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  };

  if (sentId) {
    return (
      <div className="card section" style={{ textAlign: "center", padding: 36 }}>
        <div className="alert good" style={{ display: "inline-block" }}>Request received</div>
        <h2 style={{ fontSize: 24, margin: "8px 0" }}>We&apos;re sourcing your stay</h2>
        <p className="muted">
          We&apos;ll contact you at {email} with available rooms and exact rates, usually within a few hours.
        </p>
        <p className="tiny">Request ID {sentId}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
          {signedIn && <Link href="/account" className="btn small" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>My trips</Link>}
          <button className="btn ghost small" onClick={() => { setSentId(""); setNotes(""); }}>New request</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="card search">
        <div className="seg" role="group" aria-label="Room type" style={{ marginBottom: 10 }}>
          {(["standard", "deluxe", "suite"] as RoomType[]).map((r) => (
            <button key={r} type="button" aria-pressed={roomType === r} onClick={() => setRoomType(r)}>{ROOM_LABEL[r]}</button>
          ))}
        </div>
        <div className="jet-grid">
          <AirportInput id="hcity" label="City or airport" placeholder="City or airport code" value={place} onChange={setPlace} />
          <div className="field">
            <label htmlFor="hin">Check-in</label>
            <input id="hin" type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="hout">Check-out</label>
            <input id="hout" type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="hguests">Guests</label>
            <select id="hguests" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="hrooms">Rooms</label>
            <select id="hrooms" value={rooms} onChange={(e) => setRooms(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!place && <p className="muted" style={{ marginTop: 0 }}>Search a city or airport code above to see hotels to choose from.</p>}
      {place && loadingRates && (
        <>
          <p className="muted" style={{ marginTop: 0 }}>Checking rates…</p>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
        </>
      )}
      {place && !loadingRates && estimates.length === 0 && (
        <div className="card state">No hotels found for these dates. Try nearby dates or a different city.</div>
      )}
      {estimates.length > 0 && (
        <div className="results" style={{ padding: "0 0 12px" }}>
          <aside className="card filters" aria-label="Filters">
            <h3>Hotel name</h3>
            <input
              type="text"
              placeholder="Search by hotel name"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", background: "var(--surface)", color: "var(--ink)" }}
            />
            <h3>Sort by</h3>
            <label className="check">
              <input type="radio" name="hsort" checked={sort === "price"} onChange={() => setSort("price")} /> Price, low to high
            </label>
            <label className="check">
              <input type="radio" name="hsort" checked={sort === "rating"} onChange={() => setSort("rating")} /> Star rating
            </label>
            <h3>Max price, total stay</h3>
            <input
              type="number"
              min={0}
              placeholder="Any"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", background: "var(--surface)", color: "var(--ink)" }}
            />
            {availableTiers.length > 1 && <h3>Property type</h3>}
            {availableTiers.map((t) => (
              <label className="check" key={t}>
                <input
                  type="checkbox"
                  checked={!hiddenTiers.has(t)}
                  onChange={(e) => {
                    const n = new Set(hiddenTiers);
                    if (e.target.checked) n.delete(t);
                    else n.add(t);
                    setHiddenTiers(n);
                  }}
                />
                {t}
              </label>
            ))}
          </aside>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 10px", flexWrap: "wrap", gap: 8 }}>
              <p className="tiny" style={{ margin: 0 }}>
                {filteredSorted.length} of {estimates.length} propert{estimates.length === 1 ? "y" : "ies"} in {destInput?.city}
                {" · "}
                {liveRates
                  ? `live rates for ${nights} night${nights > 1 ? "s" : ""}, ${rooms} room${rooms > 1 ? "s" : ""} total`
                  : `estimates for ${nights} night${nights > 1 ? "s" : ""}, ${rooms} room${rooms > 1 ? "s" : ""} total`}
              </p>
              <div className="seg" role="group" aria-label="View">
                <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
                <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button>
              </div>
            </div>

            {view === "map" && (
              <div style={{ marginBottom: 12 }}>
                <HotelMap hotels={filteredSorted} rooms={rooms} selected={hotelName} onSelect={setHotelName} />
              </div>
            )}

            {view === "list" && filteredSorted.length === 0 && (
              <div className="card state">
                No properties match {normalizedNameFilter ? `“${nameFilter.trim()}”` : "these filters"} for this search. Try a different name or spelling, or clear your filters.
              </div>
            )}

            {view === "list" && filteredSorted.length > 0 && (
            <>
            <button
              type="button"
              role="radio"
              aria-checked={hotelName === "any"}
              className="card hprop hprop-best"
              onClick={() => setHotelName("any")}
            >
              <div className="hprop-body">
                <span className="chip brand" style={{ alignSelf: "flex-start" }}>Recommended</span>
                <span className="hprop-name">Best available</span>
                <span className="hprop-area">
                  {normalizedNameFilter
                    ? `Best match for “${nameFilter.trim()}” on your dates and budget.`
                    : "We match you to the right hotel for your dates and budget."}
                </span>
              </div>
              <div className="hprop-price">
                {filteredSorted[0] && (
                  <>
                    <span className="hprop-total">from {money(filteredSorted[0].low * rooms, "USD").replace(".00", "")}</span>
                    <span className="tiny">total, {rooms} room{rooms > 1 ? "s" : ""}</span>
                  </>
                )}
              </div>
            </button>

            {filteredSorted.map((e) => {
              const detailHref = e.hotel.id
                ? `/hotels/${encodeURIComponent(e.hotel.id)}?${new URLSearchParams({
                    name: e.hotel.name,
                    area: e.hotel.area,
                    dest: place?.label ?? "",
                    // Carried through so "Back to search"/"Request a quote" on the detail
                    // page can rebuild this exact search instead of landing on an empty form.
                    ...(place ? { code: place.iata, label: place.label } : {}),
                    ...(place?.country ? { country: place.country } : {}),
                    in: checkIn,
                    out: checkOut,
                    guests: String(guests),
                    rooms: String(rooms),
                    low: String(e.low),
                    high: String(e.high),
                    ...(e.hotel.stars ? { stars: String(e.hotel.stars) } : {}),
                    ...(e.hotel.photo ? { photo: e.hotel.photo } : {}),
                    ...(e.hotel.lat != null ? { lat: String(e.hotel.lat) } : {}),
                    ...(e.hotel.lng != null ? { lng: String(e.hotel.lng) } : {}),
                    ...(e.offerId ? { offerId: e.offerId } : {}),
                  })}`
                : null;

              const cardBody = (
                <>
                  <div className="hprop-photo">
                    {e.hotel.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.hotel.photo} alt={e.hotel.name} />
                    ) : (
                      <div className="hprop-photo-ph">{e.hotel.tier}</div>
                    )}
                  </div>
                  <div className="hprop-body">
                    <span className="hprop-name">{e.hotel.name}</span>
                    <span className="hprop-area">{e.hotel.area}</span>
                    {e.hotel.stars ? (
                      <span className="hprop-stars" aria-label={`${e.hotel.stars} star`}>{"★".repeat(Math.max(1, Math.round(e.hotel.stars)))}</span>
                    ) : (
                      <span className="tiny">{e.hotel.tier}</span>
                    )}
                    <span className="chips">
                      {e.live && <span className="chip good">Live rate</span>}
                      {e.offerId && <span className="chip good">Bookable now</span>}
                    </span>
                    {detailHref && <span className="hprop-link">View details &amp; photos →</span>}
                  </div>
                  <div className="hprop-price">
                    <span className="hprop-total">
                      {e.low === e.high
                        ? money(e.low * rooms, "USD").replace(".00", "")
                        : `${money(e.low * rooms, "USD").replace(".00", "")}–${money(e.high * rooms, "USD").replace(".00", "")}`}
                    </span>
                    <span className="tiny">total, {rooms} room{rooms > 1 ? "s" : ""}</span>
                    {e.offerId && (
                      <button
                        type="button"
                        className="btn small hprop-book"
                        style={{ marginTop: 6 }}
                        onClick={(ev) => {
                          // Book straight from the list — no need to open the property page first.
                          ev.stopPropagation();
                          goToBookingFor(e);
                        }}
                      >
                        Book now
                      </button>
                    )}
                  </div>
                </>
              );

              // A hotel with a detail page (a real liteAPI result) has its whole card —
              // photo included — clickable straight to that page, the way every other OTA's
              // results list works; the "Book now" button (above) stops that click from
              // firing so it can book the rate directly instead. A hotel with no id (a
              // synthetic/Amadeus estimate) has no detail page, so its card just selects it
              // for the quote flow instead.
              return (
                <div
                  role={detailHref ? "link" : "radio"}
                  tabIndex={0}
                  aria-checked={detailHref ? undefined : hotelName === e.hotel.name}
                  key={e.hotel.name}
                  className="card hprop"
                  onClick={() => (detailHref ? router.push(detailHref) : setHotelName(e.hotel.name))}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      detailHref ? router.push(detailHref) : setHotelName(e.hotel.name);
                    }
                  }}
                >
                  {cardBody}
                </div>
              );
            })}
            </>
            )}
          </div>
        </div>
      )}
      <p className="tiny">
        {liveRates
          ? bookable
            ? "Live, bookable rates. Pay securely and get an instant confirmation — no waiting for a quote."
            : "Live rates from our hotel partner. This one needs a quote; tell us your details below."
          : "Estimates use 2026 market-average rates for the tier and room type. Taxes, resort fees and breakfast vary by hotel. Your final rate comes in the quote."}
      </p>

      {bookable ? (
        <div className="card section" style={{ marginTop: 16 }}>
          <h2>Ready to book</h2>
          <p>{bookable.hotel.name} — {money(bookable.low, "USD").replace(".00", "")} total for the stay. Enter guest details and pay on the next step.</p>
          <button type="button" className="btn" style={{ marginTop: 8 }} onClick={goToBooking}>
            Continue to book
          </button>
        </div>
      ) : (
        <div className="card section" style={{ marginTop: 16 }}>
          <h2>Your details</h2>
          <p>We&apos;ll send available rooms and exact rates, usually within a few hours.</p>
          <div className="form-grid two">
            <label className="input">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="input">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="input">Phone, with country code<input required type="tel" autoComplete="tel" placeholder="+1 917 555 0100" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
            <label className="input">Anything else? (optional)
              <input placeholder="High floor, late checkout, accessible room…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
          <button className="btn" style={{ marginTop: 16 }} disabled={busy}>
            {busy ? "Sending…" : "Request a quote"}
          </button>
          {!signedIn && (
            <p className="tiny" style={{ marginTop: 10 }}>
              <Link href="/account/login?next=/hotels" style={{ color: "var(--brand)" }}>Sign in</Link> first to track this request under My trips.
            </p>
          )}
        </div>
      )}
    </form>
  );
}
