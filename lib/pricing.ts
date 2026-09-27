import type { Offer, PricedOffer } from "./types";

export interface MarkupRule {
  fixed: number;
  percent: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Markup per order: fixed + percent of airline fare, rounded up to the cent. */
export function markupFor(baseAmount: number, rule: MarkupRule): number {
  const raw = rule.fixed + (baseAmount * rule.percent) / 100;
  return Math.ceil(raw * 100) / 100;
}

export function priceOffer(offer: Offer, rule: MarkupRule): PricedOffer {
  const markup = markupFor(offer.baseAmount, rule);
  return { ...offer, markup, total: round2(offer.baseAmount + markup) };
}

/**
 * Estimated net to you after Duffel's fees ($3 + 1% of fare) and card
 * processing (2.9% + $0.30 on the full charge). Used for admin reporting.
 */
export function estimatedNet(baseAmount: number, markup: number): number {
  const duffel = 3 + baseAmount * 0.01;
  const card = (baseAmount + markup) * 0.029 + 0.3;
  return round2(markup - duffel - card);
}
