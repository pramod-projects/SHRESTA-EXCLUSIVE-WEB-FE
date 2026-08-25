"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminLoginFormProps = {
  nextPath: string;
};

export function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: nextPath })
      });
      const payload = await response.json() as { ok?: boolean; message?: string; nextPath?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Login failed.");
        setSubmitting(false);
        return;
      }

      router.replace(payload.nextPath ?? "/admin");
      router.refresh();
    } catch {
      setError("Login failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
        Email
        <input
          autoComplete="username"
          className="admin-input"
          disabled={isSubmitting}
          name="admin-email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          required
          type="email"
          value={email}
        />
      </label>

      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--shresta-logo-muted)]">
        Password
        <input
          autoComplete="current-password"
          className="admin-input"
          disabled={isSubmitting}
          name="admin-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter password"
          required
          type="password"
          value={password}
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-300/55 bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800">{error}</p>
      ) : null}

      <button className="admin-button w-full justify-center" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
