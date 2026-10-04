import "server-only";
import { createHash } from "crypto";

/**
 * Meta Conversions API (server-side Purchase events) — fires alongside the client-side Pixel so
 * conversions still get credited when a browser ad-blocker or Safari's ITP drops the client-side
 * `fbq('track', 'Purchase')` call. Inert (no-op) until both env vars are set, so this ships ahead
 * of the ad account existing and turns on the moment the real pixel ID + access token are added.
 *
 * Setup once the Meta Business/Ads account exists:
 *  - NEXT_PUBLIC_META_PIXEL_ID: the Pixel ID from Events Manager
 *  - META_CONVERSIONS_API_TOKEN: a Conversions API access token for that pixel (Events Manager →
 *    Settings → Conversions API → Generate access token)
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";
const CAPI_TOKEN = process.env.META_CONVERSIONS_API_TOKEN?.trim() || "";

export function metaConversionsEnabled(): boolean {
  return Boolean(PIXEL_ID && CAPI_TOKEN);
}

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/** Reports one completed booking (flight or hotel) as a Purchase event. Never throws — a tracking
 * failure must never affect the booking itself. */
export async function reportPurchase(args: {
  eventId: string;
  value: number;
  currency: string;
  email?: string;
  contentType: "flight" | "hotel";
}): Promise<void> {
  if (!metaConversionsEnabled()) return;
  try {
    const userData: Record<string, unknown> = {};
    if (args.email) userData.em = [sha256(args.email)];
    await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: CAPI_TOKEN,
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: args.eventId, // matches the client-side fbq event_id to dedupe
            action_source: "website",
            user_data: userData,
            custom_data: {
              currency: args.currency,
              value: args.value,
              content_type: args.contentType,
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.error("Meta Conversions API report failed:", e instanceof Error ? e.message : e);
  }
}
