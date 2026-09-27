# R Travel — flight booking (Phase 1)

Search, price and book flights from 300+ airlines through [Duffel](https://duffel.com), with your markup added and card payments through Stripe.

It runs three ways, decided only by which keys you set:

| Mode | Keys set | What happens |
| --- | --- | --- |
| **Demo** | none | Sample flights across ~30 airports. Bookings are fake; nothing is charged. |
| **Test** | `DUFFEL_ACCESS_TOKEN=duffel_test_…` (+ optional `sk_test_` Stripe key) | Real search against Duffel's sandbox airlines. Test tickets, test cards. |
| **Live** | `duffel_live_…` **and** `STRIPE_SECRET_KEY=sk_live_…` | Real tickets, real charges. The app refuses to book live without Stripe. |

## Run it

```bash
npm install
cp .env.example .env.local   # leave empty for demo mode
npm run dev                  # http://localhost:3000
```

Deploy: push to GitHub, import into Vercel, add the same variables in the project settings, set `BASE_URL` to the site URL.

## Booking flow

1. **Search** (`/api/search`) — one Duffel offer request, all airlines at once. Markup is applied server-side; the browser only ever sees the final price.
2. **Select** (`/book/[offerId]`) — the fare is re-priced before the form shows. If it rose since search, the customer is told.
3. **Pay** (`/api/bookings`) — fare is re-priced again; if it rose above what the customer saw, the booking stops with a 409 and the new price. Otherwise a pending booking is saved and the customer goes to Stripe Checkout.
4. **Ticket** (`/api/checkout/complete`) — after Stripe confirms payment, the fare is checked a final time and the order is created with Duffel, paid from your Duffel balance. If the airline rejects it, the card is refunded automatically.

## Money

Customer total = airline fare + `MARKUP_FIXED` + `MARKUP_PERCENT`% of fare, shown as "Service fee". Defaults: $12 + 5%.

Per order you pay Duffel $3 + 1% of the fare, and Stripe ~2.9% + $0.30 of the total charge. With the defaults, estimated net per order:

| Fare | Service fee | Your net |
| --- | --- | --- |
| $300 | $27 | ~$11 |
| $600 | $42 | ~$14 |
| $3,000 | $162 | ~$37 |

Keep `MARKUP_PERCENT` above ~4%, or large fares lose money. `lib/pricing.ts#estimatedNet` does this math.

**Duffel balance:** orders are paid from a prepaid Duffel balance, so top it up before going live and keep it above a few days of expected sales.

## Before going live

- [ ] Seller-of-travel registrations (CA, FL, WA, HI) and E&O insurance
- [ ] Duffel live access (account verification in their dashboard)
- [ ] Replace the file store (`lib/store.ts`, writes `.data/bookings.json`) with Postgres — Vercel's filesystem is not persistent
- [ ] Add a Stripe webhook for `checkout.session.completed` that calls `completeCheckout`, so tickets issue even if the customer closes the tab after paying
- [ ] Confirmation emails (Resend or Postmark) with the booking reference
- [ ] Terms, privacy policy, and airline fare-rule display per offer
- [x] Brand name: R Travel (change with `NEXT_PUBLIC_BRAND_NAME`)
- [ ] Fraud: turn on Stripe Radar rules and 3-D Secure for flights

## Code map

```
app/
  page.tsx                  home + search form
  search/page.tsx           results, filters, sort (best / cheapest / fastest)
  book/[offerId]/page.tsx   itinerary, traveler details, price breakdown, pay
  booking/[id]/page.tsx     confirmation / failure
  api/                      places, search, offers, bookings, checkout/complete
lib/
  duffel.ts     Duffel API client (places, offer requests, offers, orders)
  demo.ts       sample data for demo mode
  provider.ts   picks demo vs Duffel, applies markup
  pricing.ts    markup rules and net estimate
  booking.ts    booking state machine, Stripe, refunds
  validate.ts   all input checks (IATA codes, dates, passport-style names, phone)
  store.ts      booking storage (swap for a database)
```
