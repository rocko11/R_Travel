import SearchForm from "./components/SearchForm";

export default function Home() {
  return (
    <main className="wrap">
      <section className="hero">
        <h1>Fly anywhere.<br />Pay the price you see.</h1>
        <p>Search 300+ airlines. Every price includes taxes and fees.</p>
        <SearchForm />
      </section>
    </main>
  );
}
