export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function duration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}h${m ? ` ${String(m).padStart(2, "0")}m` : ""}`;
}

/** Times are local wall-clock strings; read them without timezone conversion. */
export function time(iso: string) {
  const [, t] = iso.split("T");
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${ap}`;
}

export function day(iso: string) {
  const [y, mo, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
}

/** +1 when arrival lands on a later calendar day. */
export function dayShift(depart: string, arrive: string) {
  const a = Date.parse(depart.slice(0, 10)), b = Date.parse(arrive.slice(0, 10));
  return Math.round((b - a) / 86_400_000);
}

export const CABIN_LABEL: Record<string, string> = {
  economy: "Economy", premium_economy: "Premium economy", business: "Business", first: "First",
};
