"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/today");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-bold">Discipline</h1>
      <p className="mt-1 text-sm text-muted">Private tracker. Sign in to continue.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-card-border bg-card px-3 py-3 text-sm"
          autoComplete="email"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-card-border bg-card px-3 py-3 text-sm"
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="text-accent">
          Create one
        </Link>
      </p>
    </div>
  );
}
