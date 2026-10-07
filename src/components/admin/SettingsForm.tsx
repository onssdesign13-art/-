"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BrandSettings } from "@/lib/types";

const SAMPLE_CODE = "ABCD2345";

export default function SettingsForm({ settings }: { settings: BrandSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<BrandSettings>(settings);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function set<K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      settings?: BrandSettings;
    };
    setBusy(false);
    if (!response.ok) {
      setMessage({ kind: "error", text: data.error ?? "Не удалось сохранить настройки." });
      return;
    }
    if (data.settings) setForm(data.settings);
    setMessage({ kind: "ok", text: "Настройки сохранены." });
    router.refresh();
  }

  const exampleUrl = `${form.base_url.replace(/\/+$/, "")}/o/${SAMPLE_CODE}`;

  return (
    <form onSubmit={submit}>
      <div className="grid gap-6 border-b border-line px-6 py-8 md:grid-cols-2 md:px-10">
        <div>
          <label className="label" htmlFor="brand">
            Название бренда
          </label>
          <input
            id="brand"
            value={form.brand_name}
            onChange={(event) => set("brand_name", event.target.value)}
            className="field mt-2"
          />
        </div>
        <div>
          <label className="label" htmlFor="tagline">
            Слоган
          </label>
          <input
            id="tagline"
            value={form.tagline}
            onChange={(event) => set("tagline", event.target.value)}
            className="field mt-2"
          />
        </div>
        <div>
          <label className="label" htmlFor="cert">
            Заголовок паспорта
          </label>
          <input
            id="cert"
            value={form.certificate_title}
            onChange={(event) => set("certificate_title", event.target.value)}
            className="field mt-2"
          />
        </div>
        <div>
          <label className="label" htmlFor="contact">
            Контакт (телефон, e-mail, @соцсеть)
          </label>
          <input
            id="contact"
            value={form.contact}
            onChange={(event) => set("contact", event.target.value)}
            className="field mt-2"
          />
        </div>
        <div>
          <label className="label" htmlFor="footer">
            Подпись в подвале страницы
          </label>
          <input
            id="footer"
            value={form.footer_note}
            onChange={(event) => set("footer_note", event.target.value)}
            className="field mt-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="accent">
              Акцентный цвет
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="accent"
                type="color"
                value={form.accent}
                onChange={(event) => set("accent", event.target.value)}
                className="h-9 w-12 border border-line bg-white p-1"
              />
              <input
                value={form.accent}
                onChange={(event) => set("accent", event.target.value)}
                className="field"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="language">
              Язык страниц
            </label>
            <select
              id="language"
              value={form.language}
              onChange={(event) => set("language", event.target.value as "ru" | "en")}
              className="field mt-2"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-b border-line px-6 py-8 md:px-10">
        <h2 className="text-[15px] font-medium">Адрес для QR-кодов</h2>
        <p className="mt-2 max-w-[70ch] text-[13px] text-muted">
          Пока сайт работает локально — это <span className="mono">http://localhost:3000</span>.
          После переноса на VPS укажите домен (например,{" "}
          <span className="mono">https://passport.your-domain.com</span>) и перегенерируйте QR: старые
          коды останутся на localhost. Значение из настроек имеет приоритет над переменной BASE_URL.
        </p>
        <div className="mt-5 max-w-[520px]">
          <label className="label" htmlFor="base">
            Публичный адрес сайта
          </label>
          <input
            id="base"
            value={form.base_url}
            onChange={(event) => set("base_url", event.target.value)}
            className="field mono mt-2 text-[13px]"
            placeholder="https://example.com"
          />
        </div>
        <p className="mono mt-4 text-[12px] text-muted">Пример ссылки: {exampleUrl}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-6 py-6 md:px-10">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить настройки"}
        </button>
        {message ? (
          <p className={`text-[13px] ${message.kind === "ok" ? "text-muted" : "text-accent"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
