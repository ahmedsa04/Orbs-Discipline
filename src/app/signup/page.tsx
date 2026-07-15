"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      router.push("/today");
      router.refresh();
      return;
    }
    setInfo("Check your email to confirm, then sign in. (Or disable email confirm in Supabase for private use.)");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-bold">Create account</h1>
      <p className="mt-1 text-sm text-muted">Private single-user discipline app.</p>
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
          minLength={8}
          placeholder="Password (8+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-card-border bg-card px-3 py-3 text-sm"
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-muted">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Have an account?{" "}
        <Link href="/login" className="text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
