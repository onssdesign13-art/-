"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const ITEMS = [
  { href: "/admin", label: "Обзор", exact: true },
  { href: "/admin/products", label: "Объекты" },
  { href: "/admin/collections", label: "Коллекции" },
  { href: "/admin/pages", label: "Страницы" },
  { href: "/admin/settings", label: "Настройки" },
];

export default function AdminNav({ brand }: { brand: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <nav className="flex h-full flex-col justify-between">
      <div>
        <Link href="/admin" className="block border-b border-line px-5 py-5">
          <span className="block text-[15px] font-medium uppercase tracking-[0.28em]">
            {brand}
          </span>
          <span className="label mt-1 block">Панель генерации</span>
        </Link>
        <ul>
          {ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between border-b border-line px-5 py-3 text-[12px] uppercase tracking-label transition-colors ${
                    active ? "bg-ink text-white" : "text-muted hover:bg-[#f4f4f1] hover:text-ink"
                  }`}
                >
                  {item.label}
                  <span className="mono text-2xs opacity-60">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-line px-5 py-4">
        <Link href="/" className="label block hover:text-ink">
          Открыть сайт
        </Link>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="label mt-3 block cursor-pointer text-left hover:text-ink disabled:opacity-40"
        >
          {busy ? "Выход…" : "Выйти"}
        </button>
      </div>
    </nav>
  );
}
