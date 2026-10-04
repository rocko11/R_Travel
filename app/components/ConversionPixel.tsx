"use client";

import { useEffect } from "react";

/**
 * Fires client-side conversion events on a confirmed booking (GA4 purchase, Google Ads
 * conversion, Meta Pixel Purchase) once per booking. Pairs with the server-side Meta
 * Conversions API call in lib/metaConversions.ts — both use the same `eventId` so Meta can
 * dedupe when both land (or credit the purchase when only one does, e.g. an ad-blocker drops
 * the client-side fbq call). Deduped per booking via sessionStorage so refreshing the
 * confirmation page never double-counts a purchase.
 */
export default function ConversionPixel(props: {
  eventId: string;
  value: number;
  currency: string;
  contentType: "flight" | "hotel";
  googleAdsId?: string;
  googleAdsLabel?: string;
}) {
  useEffect(() => {
    const key = `conv_fired_${props.eventId}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;

    const w = window as unknown as {
      gtag?: (...args: unknown[]) => void;
      fbq?: (...args: unknown[]) => void;
    };

    w.gtag?.("event", "purchase", {
      transaction_id: props.eventId,
      value: props.value,
      currency: props.currency,
      items: [{ item_name: props.contentType }],
    });

    if (props.googleAdsId) {
      w.gtag?.("event", "conversion", {
        send_to: props.googleAdsLabel ? `${props.googleAdsId}/${props.googleAdsLabel}` : props.googleAdsId,
        value: props.value,
        currency: props.currency,
        transaction_id: props.eventId,
      });
    }

    w.fbq?.(
      "track",
      "Purchase",
      { value: props.value, currency: props.currency, content_type: props.contentType },
      { eventID: props.eventId }
    );

    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // best-effort only — never block on storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.eventId]);

  return null;
}
