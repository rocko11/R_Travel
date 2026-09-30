import "server-only";
import crypto from "crypto";
import Stripe from "stripe";
import { kvGet, kvSet, serial } from "./kv";
import { config, paymentsRequired } from "./config";
import { prebookOffer, bookPrebook, LiteApiError, type PrebookResult } from "./liteApiHotels";
import { ValidationError } from "./validate";

const stripe = () => new Stripe(config.stripeKey, { apiVersion: "2025-08-27.basil" });

export class HotelBookingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface HotelGuestInput {
  firstName: string;
  lastName: string;
}

export interface HotelContactInput {
  email: string;
  phone: string;
}

export type HotelBookingStatus = "pending_payment" | "confirmed" | "failed";

export interface HotelBooking {
  id: string;
  status: HotelBookingStatus;
  createdAt: string;
  offerId: string;
  prebookId: string;
  hotelName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  roomName?: string;
  boardName?: string;
  guests: HotelGuestInput[];
  contact: HotelContactInput;
  total: number;
  currency: string;
  stripeSessionId?: string;
  stripePaymentIntent?: string;
  supplierBookingId?: string;
  confirmationCode?: string;
  failureReason?: string;
  userId?: string;
}

const NS = "hotel-bookings";
const USER_INDEX = "hotel-bookings-index";

function newId() {
  return `hbk_${crypto.randomBytes(9).toString("base64url")}`;
}

async function save(b: HotelBooking) {
  await kvSet(NS, b.id, b);
  if (b.userId) {
    await serial(async () => {
      const mine = (await kvGet<string[]>(USER_INDEX, b.userId!)) ?? [];
      if (!mine.includes(b.id)) await kvSet(USER_INDEX, b.userId!, [b.id, ...mine]);
    });
  }
  return b;
}

export function getHotelBooking(id: string): Promise<HotelBooking | null> {
  return kvGet<HotelBooking>(NS, id);
}

export async function hotelBookingsForUser(userId: string): Promise<HotelBooking[]> {
  const ids = (await kvGet<string[]>(USER_INDEX, userId)) ?? [];
  const all = await Promise.all(ids.map((id) => getHotelBooking(id)));
  return all.filter((b): b is HotelBooking => Boolean(b));
}

function updateHotelBooking(id: string, fn: (b: HotelBooking) => HotelBooking | null) {
  return serial(async () => {
    const cur = await kvGet<HotelBooking>(NS, id);
    if (!cur) return null;
    const next = fn(cur);
    if (!next) return cur;
    await kvSet(NS, id, next);
    return next;
  });
}

/** Re-price and lock a rate right before showing the guest the checkout page. */
export async function loadPrebook(offerId: string): Promise<PrebookResult> {
  if (!offerId) throw new ValidationError("Missing rate.");
  try {
    return await prebookOffer(offerId);
  } catch (e) {
    if (e instanceof LiteApiError) throw new HotelBookingError(e.message, e.status);
    throw e;
  }
}

/**
 * Step 1: lock the rate via prebook, save a pending booking, and either return a Stripe
 * Checkout URL (payments on) or book immediately (demo mode without Stripe).
 */
export async function startHotelBooking(args: {
  offerId: string;
  destination: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  guests: HotelGuestInput[];
  contact: HotelContactInput;
  quotedTotal: number;
  userId?: string;
}): Promise<{ bookingId: string; redirectUrl: string }> {
  const pre = await loadPrebook(args.offerId);

  // Price moved up since the guest saw it: stop and show the new price.
  if (pre.total > args.quotedTotal + 0.009) {
    throw new HotelBookingError(
      `The rate changed since you searched. New total: ${pre.total.toFixed(2)} ${pre.currency}. Please review and confirm again.`,
      409
    );
  }

  const booking: HotelBooking = {
    id: newId(),
    status: "pending_payment",
    createdAt: new Date().toISOString(),
    offerId: args.offerId,
    prebookId: pre.prebookId,
    hotelName: args.hotelName,
    destination: args.destination,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    roomName: pre.roomName,
    boardName: pre.boardName,
    guests: args.guests,
    contact: args.contact,
    total: pre.total,
    currency: pre.currency,
    userId: args.userId,
  };

  if (!paymentsRequired()) {
    await save(booking);
    await fulfil(booking.id);
    return { bookingId: booking.id, redirectUrl: `/hotels/booking/${booking.id}` };
  }

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer_email: args.contact.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pre.currency.toLowerCase(),
            unit_amount: Math.round(pre.total * 100),
            product_data: {
              name: `${args.hotelName} — ${args.destination}`,
              description: `${args.checkIn} to ${args.checkOut}${pre.roomName ? ` · ${pre.roomName}` : ""}`,
            },
          },
        },
      ],
      payment_intent_data: { metadata: { hotelBookingId: booking.id } },
      metadata: { hotelBookingId: booking.id },
      success_url: `${config.baseUrl}/api/hotels/checkout/complete?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.baseUrl}/hotels/book/${encodeURIComponent(args.offerId)}?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `hotel_checkout_${booking.id}` }
  );
  booking.stripeSessionId = session.id;
  await save(booking);
  return { bookingId: booking.id, redirectUrl: session.url! };
}

/** Step 2 (after payment): confirm the card was charged, then confirm the room with the supplier. */
export async function completeHotelCheckout(bookingId: string, sessionId: string) {
  const booking = await getHotelBooking(bookingId);
  if (!booking) throw new HotelBookingError("Booking not found.", 404);
  if (booking.status !== "pending_payment") return booking;
  if (booking.stripeSessionId !== sessionId) throw new HotelBookingError("Payment session does not match this booking.", 400);

  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") throw new HotelBookingError("Payment has not completed.", 402);
  await updateHotelBooking(bookingId, (b) => ({ ...b, stripePaymentIntent: String(session.payment_intent) }));
  return fulfil(bookingId);
}

/** Confirm the room with liteAPI. On failure after payment, refund in full. */
async function fulfil(bookingId: string): Promise<HotelBooking> {
  let claimed = false;
  await updateHotelBooking(bookingId, (b) => {
    if (b.status !== "pending_payment" || b.supplierBookingId === "booking") return null;
    claimed = true;
    return { ...b, supplierBookingId: "booking" };
  });
  const b = (await getHotelBooking(bookingId))!;
  if (!claimed) return b;

  try {
    const result = await bookPrebook({
      prebookId: b.prebookId,
      holder: { firstName: b.guests[0].firstName, lastName: b.guests[0].lastName, email: b.contact.email },
      guests: b.guests,
      clientReference: b.id,
    });
    return (await updateHotelBooking(bookingId, (x) => ({
      ...x,
      status: "confirmed",
      supplierBookingId: result.bookingId,
      confirmationCode: result.confirmationCode,
    })))!;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Booking with the hotel failed.";
    let refunded = "";
    if (b.stripePaymentIntent) {
      try {
        await stripe().refunds.create({ payment_intent: b.stripePaymentIntent });
        refunded = " Your payment has been refunded in full.";
      } catch {
        refunded = " Our team will refund your payment manually.";
      }
    }
    return (await updateHotelBooking(bookingId, (x) => ({
      ...x,
      status: "failed",
      supplierBookingId: undefined,
      failureReason: reason + refunded,
    })))!;
  }
}
