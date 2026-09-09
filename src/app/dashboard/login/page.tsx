"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Login failed.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-xl font-bold text-navy-900">Admin Login</h1>
        <p className="mt-1 text-sm text-navy-900/60">Camp registration dashboard</p>

        <label className="mt-6 block text-sm font-semibold text-navy-900">
          Username
          <input
            className="mt-1 block w-full rounded-md border border-navy-900/20 px-3 py-2.5 text-sm focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-navy-900">
          Password
          <input
            type="password"
            className="mt-1 block w-full rounded-md border border-navy-900/20 px-3 py-2.5 text-sm focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-navy-950 py-3 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
