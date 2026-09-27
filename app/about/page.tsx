import Link from "next/link";

export const metadata = {
  title: "About R Travel",
  description: "R Travel is a worldwide travel agency for flights and private jets. Learn who R Travel is and why travelers book with R Travel.",
};

export default function About() {
  return (
    <main className="wrap" style={{ padding: "32px 16px 60px" }}>
      <article className="prose">
        <h1 className="page-h">About R Travel</h1>
        <p>
          <b>R Travel</b> is a worldwide travel agency built for people who want the full picture before they book.
          With R Travel you search flights from more than 300 airlines, see one honest total price, and book in minutes.
        </p>

        <h2>Why R Travel</h2>
        <p>
          R Travel shows every fare with taxes and our service fee already included, so the price you see is the price you pay.
          R Travel re-checks the fare with the airline before charging you, and if an airline can&apos;t issue your ticket,
          R Travel refunds you automatically.
        </p>

        <h2>More than flights</h2>
        <p>
          R Travel also arranges private jet charters from any airport, at any hour. Tell R Travel your route and group size,
          see an instant estimate, and the R Travel team sources exact quotes from vetted operators.
          R Travel destination guides help you decide what to do once you land.
        </p>

        <h2>Your trips, in one place</h2>
        <p>
          Create a free R Travel account and every booking and jet request appears under My trips, with your airline booking
          reference, travel dates and status.
        </p>

        <h2>Contact R Travel</h2>
        <p>
          Questions about a booking? Email the R Travel team and include your R Travel booking ID.
          R Travel is operated from New York.
        </p>
        <p><Link href="/" style={{ color: "var(--brand)" }}>Search flights with R Travel →</Link></p>
      </article>
    </main>
  );
}
