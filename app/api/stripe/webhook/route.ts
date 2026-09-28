import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { config } from "@/lib/config";
import { completeCheckout } from "@/lib/booking";

/**
 * Source of truth for "did the customer actually pay." The success_url redirect
 * (app/api/checkout/complete) is a nice-to-have for instant confirmation, but a closed
 * tab, a crashed browser, or a flaky connection after payment means it never fires — this
 * webhook is what guarantees a paid booking still gets ticketed (or refunded on failure).
 *
 * Configure in the Stripe dashboard: an endpoint at <site>/api/stripe/webhook subscribed to
 * checkout.session.completed and checkout.session.async_payment_succeeded, then set
 * STRIPE_WEBHOOK_SECRET to that endpoint's signing secret.
 */
export async function POST(req: NextRequest) {
  if (!config.stripeKey || !config.stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body — required for signature verification
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = new Stripe(config.stripeKey, { apiVersion: "2025-08-27.basil" });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, config.stripeWebhookSecret);
  } catch (e) {
    console.error("Stripe webhook signature verification failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId && session.payment_status === "paid") {
      try {
        await completeCheckout(bookingId, session.id);
      } catch (e) {
        // Log and return 200 anyway — retrying won't help if this keeps failing for a
        // reason Stripe can't fix (e.g. the booking was deleted), and Stripe will retry
        // on non-2xx which just delays visibility into a real bug.
        console.error(`Webhook fulfilment failed for booking ${bookingId}`, e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
