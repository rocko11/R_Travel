import "server-only";

const num = (v: string | undefined, d: number) => (v === undefined || v.trim() === "" ? d : Number(v));

const token = process.env.DUFFEL_ACCESS_TOKEN?.trim() || "";

export const config = {
  duffelToken: token,
  /** demo = sample data; test = Duffel sandbox; live = real tickets */
  mode: (!token ? "demo" : token.startsWith("duffel_live_") ? "live" : "test") as
    | "demo"
    | "test"
    | "live",
  stripeKey: process.env.STRIPE_SECRET_KEY?.trim() || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || "",
  baseUrl: (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, ""),
  markupFixed: num(process.env.MARKUP_FIXED, 12),
  markupPercent: num(process.env.MARKUP_PERCENT, 5),
};

/** Real money requires real card collection. */
export function paymentsRequired(): boolean {
  return config.mode === "live" || Boolean(config.stripeKey);
}

export function assertSafeConfig() {
  if (config.mode === "live" && !config.stripeKey) {
    throw new Error(
      "A live Duffel token is set but STRIPE_SECRET_KEY is missing. Refusing to issue tickets without collecting payment."
    );
  }
}
