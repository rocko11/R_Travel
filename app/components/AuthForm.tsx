"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp.get("next") || "/account";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/account";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(sp.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { name, email, password } : { email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const other = mode === "login" ? "signup" : "login";
  const otherHref = `/account/${other}?next=${encodeURIComponent(next)}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <main className="wrap">
      <form className="card auth" onSubmit={submit}>
        <h1>{mode === "login" ? "Sign in" : "Create your account"}</h1>
        <p className="muted">
          {mode === "login" ? "See and manage your trips." : "Keep all your bookings in one place."}
        </p>
        {mode === "signup" && (
          <label className="input">Full name
            <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="input">Email
          <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="input">Password
          <input
            required
            type="password"
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && <span className="tiny">At least 8 characters.</span>}
        </label>
        {error && <div className="alert bad">{error}</div>}
        <button className="btn" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <p className="tiny" style={{ textAlign: "center", marginTop: 16 }}>
          {mode === "login" ? "New here? " : "Already have an account? "}
          <Link href={otherHref} style={{ color: "var(--brand)" }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </form>
    </main>
  );
}
