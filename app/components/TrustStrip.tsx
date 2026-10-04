const POINTS = [
  { icon: "🧳", text: "Flight + hotel, one checkout" },
  { icon: "💳", text: "Real prices — what you see is what you pay" },
  { icon: "⚡", text: "Confirmed instantly, no waiting" },
];

/**
 * Message-match strip for pages that paid traffic lands on (destination guides today). Repeats
 * the exact promise made in the ad they clicked, right where they land, before any guide content
 * — the single highest-leverage thing a landing page can do for ad conversion rate.
 */
export default function TrustStrip() {
  return (
    <div className="trust-strip">
      {POINTS.map((p) => (
        <span key={p.text} className="trust-item">
          <span aria-hidden="true">{p.icon}</span> {p.text}
        </span>
      ))}
    </div>
  );
}
