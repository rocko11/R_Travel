import "server-only";
import Stripe from "stripe";
import { assertSafeConfig, config, paymentsRequired } from "./config";
import { freshOffer, issue } from "./provider";
import { getBooking, newBookingId, saveBooking, updateBooking } from "./store";
import type { Booking, ContactInput, PassengerInput } from "./types";

const stripe = () => new Stripe(config.stripeKey, { apiVersion: "2025-08-27.basil" });

export class BookingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * Step 1: re-price the offer, save a pending booking, and either
 *  - return a Stripe Checkout URL (payments on), or
 *  - issue immediately (demo / Duffel test mode without Stripe).
 */
export async function startBooking(args: {
  offerId: string;
  passengers: PassengerInput[];
  contact: ContactInput;
  quotedTotal: number;
  userId?: string;
}): Promise<{ bookingId: string; redirectUrl: string }> {
  assertSafeConfig();
  const offer = await freshOffer(args.offerId);

  // Price moved up since the customer saw it: stop and show the new price.
  if (offer.total > args.quotedTotal + 0.009) {
    throw new BookingError(
      `The airline raised this fare. New total: ${offer.total.toFixed(2)} ${offer.currency}. Please review and confirm again.`,
      409
    );
  }

  const booking: Booking = {
    id: newBookingId(),
    status: "pending_payment",
    createdAt: new Date().toISOString(),
    offerId: offer.id,
    offer,
    passengers: args.passengers,
    contact: args.contact,
    baseAmount: offer.baseAmount,
    markup: offer.markup,
    total: offer.total,
    currency: offer.currency,
    mode: config.mode,
    userId: args.userId,
  };

  if (!paymentsRequired()) {
    await saveBooking(booking);
    await fulfil(booking.id);
    return { bookingId: booking.id, redirectUrl: `/booking/${booking.id}` };
  }

  const route = offer.slices.map((s) => `${s.origin}→${s.destination}`).join(", ");
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: args.contact.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: offer.currency.toLowerCase(),
            unit_amount: Math.round(offer.total * 100),
            product_data: {
              name: `Flight ${route}`,
              description: `${offer.owner.name} · ${args.passengers.length} traveler(s)`,
            },
          },
        },
      ],
      payment_intent_data: { metadata: { bookingId: booking.id } },
      metadata: { bookingId: booking.id },
      success_url: `${config.baseUrl}/api/checkout/complete?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.baseUrl}/book/${encodeURIComponent(offer.id)}?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `checkout_${booking.id}` }
  );
  booking.stripeSessionId = session.id;
  await saveBooking(booking);
  return { bookingId: booking.id, redirectUrl: session.url! };
}

/** Step 2 (after payment): confirm the card was charged, then issue tickets. */
export async function completeCheckout(bookingId: string, sessionId: string) {
  const booking = await getBooking(bookingId);
  if (!booking) throw new BookingError("Booking not found.", 404);
  if (booking.status !== "pending_payment") return booking;
  if (booking.stripeSessionId !== sessionId) throw new BookingError("Payment session does not match this booking.", 400);

  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") throw new BookingError("Payment has not completed.", 402);
  await updateBooking(bookingId, (b) => ({ ...b, stripePaymentIntent: String(session.payment_intent) }));
  return fulfil(bookingId);
}

/** Issue with the airline. On failure after payment, refund in full. */
async function fulfil(bookingId: string): Promise<Booking> {
  // Claim the booking so two concurrent callbacks can't double-issue.
  let claimed = false;
  await updateBooking(bookingId, (b) => {
    if (b.status !== "pending_payment" || b.supplierOrderId === "issuing") return null;
    claimed = true;
    return { ...b, supplierOrderId: "issuing" };
  });
  const b = (await getBooking(bookingId))!;
  if (!claimed) return b;

  try {
    const offer = await freshOffer(b.offerId);
    if (offer.baseAmount > b.baseAmount + 0.009) {
      throw new BookingError("The airline changed the fare during payment.", 409);
    }
    const { orderId, bookingReference } = await issue(offer, b.passengers, b.contact);
    return (await updateBooking(bookingId, (x) => ({
      ...x,
      status: "confirmed",
      supplierOrderId: orderId,
      bookingReference,
    })))!;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Ticketing failed.";
    let refunded = "";
    if (b.stripePaymentIntent) {
      try {
        await stripe().refunds.create({ payment_intent: b.stripePaymentIntent });
        refunded = " Your payment has been refunded in full.";
      } catch {
        refunded = " Our team will refund your payment manually.";
      }
    }
    return (await updateBooking(bookingId, (x) => ({
      ...x,
      status: "failed",
      supplierOrderId: undefined,
      failureReason: reason + refunded,
    })))!;
  }
}
