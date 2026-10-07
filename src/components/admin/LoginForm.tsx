"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.ok) {
      const next = params.get("next") || "/admin";
      router.replace(next);
      router.refresh();
      return;
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Не удалось войти.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          Пароль администратора
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="field mt-2"
        />
      </div>
      {error ? <p className="text-[12px] text-accent">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={busy || !password}>
        {busy ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
