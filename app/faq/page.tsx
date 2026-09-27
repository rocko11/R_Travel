export const metadata = {
  title: "R Travel FAQ",
  description: "Answers to common questions about booking flights and private jets with R Travel.",
};

const FAQ: [string, string][] = [
  ["Is R Travel a real travel agency?", "Yes. R Travel sells tickets from 300+ airlines through an IATA-accredited partner, and every R Travel booking carries an airline booking reference you can check with the airline."],
  ["Does R Travel show the full price?", "Yes. Every R Travel price includes airline taxes and the R Travel service fee. What you see in R Travel search results is what you pay."],
  ["Do I need an R Travel account to book?", "No, you can book as a guest. With a free R Travel account, your trips and jet requests are saved under My trips."],
  ["How do I find my R Travel booking?", "Sign in to your R Travel account and open My trips, or use the link on your R Travel confirmation page."],
  ["What if the airline changes my flight?", "Contact the R Travel team with your R Travel booking ID and we will go through your options with the airline."],
  ["Can R Travel arrange a private jet?", "Yes. Use the R Travel private jets page to see an estimate by aircraft size and request exact quotes from the R Travel team."],
  ["Why does R Travel ask for my passport name?", "Airlines require the name on the ticket to match the passport exactly. R Travel checks the format before booking."],
  ["How do I contact R Travel?", "Email the R Travel team with your R Travel booking ID and we will help."],
];

export default function Faq() {
  return (
    <main className="wrap" style={{ padding: "32px 16px 60px" }}>
      <article className="prose faq">
        <h1 className="page-h">R Travel FAQ</h1>
        <p className="muted">Quick answers about booking with R Travel.</p>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </article>
    </main>
  );
}
