import JetForm from "../components/JetForm";

export const metadata = { title: "Private jet charter" };

export default function JetsPage() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 60 }}>
        <h1>Private jets,<br />on your schedule.</h1>
        <p>Any airport, any time. See an estimate now and get exact quotes from vetted operators.</p>
        <JetForm />
      </section>
    </main>
  );
}
