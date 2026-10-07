"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CollectionSummary } from "@/lib/repo";
import { CATEGORIES, type ProductSummary } from "@/lib/types";

type FormState = {
  name: string;
  collection_id: string;
  category: string;
  material: string;
  dimensions: string;
  year: string;
  description: string;
  status: string;
  limited: boolean;
  edition_size: string;
  show_edition_count: boolean;
};

function toState(product?: ProductSummary | null): FormState {
  return {
    name: product?.name ?? "",
    collection_id: product?.collection_id ? String(product.collection_id) : "",
    category: product?.category ?? "",
    material: product?.material ?? "",
    dimensions: product?.dimensions ?? "",
    year: product?.year ? String(product.year) : "",
    description: product?.description ?? "",
    status: product?.status ?? "active",
    limited: Number(product?.limited ?? 0) === 1,
    edition_size: product?.edition_size ? String(product.edition_size) : "",
    show_edition_count: Number(product?.show_edition_count ?? 1) === 1,
  };
}

export default function ProductForm({
  mode,
  product,
  collections,
}: {
  mode: "create" | "edit";
  product?: ProductSummary | null;
  collections: CollectionSummary[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(toState(product));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const payload = {
      name: form.name,
      collection_id: form.collection_id ? Number(form.collection_id) : null,
      category: form.category || null,
      material: form.material || null,
      dimensions: form.dimensions || null,
      year: form.year ? Number(form.year) : null,
      description: form.description || null,
      status: form.status,
      limited: form.limited,
      edition_size: form.limited ? Number(form.edition_size || 0) : null,
      show_edition_count: form.show_edition_count,
    };

    const response = await fetch(
      mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      product?: ProductSummary;
    };
    setBusy(false);

    if (!response.ok) {
      setMessage({ kind: "error", text: data.error ?? "Не удалось сохранить." });
      return;
    }
    setMessage({ kind: "ok", text: "Сохранено." });
    if (mode === "create" && data.product) {
      router.push(`/admin/products/${data.product.id}`);
      router.refresh();
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-6 border-b border-line px-6 py-8 md:grid-cols-2 md:px-10">
        <div className="md:col-span-2">
          <label className="label" htmlFor="name">
            Название объекта *
          </label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="Например: Ваза MONOLITH 01"
            className="field mt-2 text-[16px]"
          />
        </div>

        <div>
          <label className="label" htmlFor="collection">
            Коллекция
          </label>
          <select
            id="collection"
            value={form.collection_id}
            onChange={(event) => set("collection_id", event.target.value)}
            className="field mt-2"
          >
            <option value="">Без коллекции</option>
            {collections.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
                {item.release_date ? ` · ${item.release_date}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="category">
            Тип объекта
          </label>
          <input
            id="category"
            list="category-options"
            value={form.category}
            onChange={(event) => set("category", event.target.value)}
            placeholder="Ваза, лампа, объект…"
            className="field mt-2"
          />
          <datalist id="category-options">
            {CATEGORIES.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label" htmlFor="material">
            Материал
          </label>
          <input
            id="material"
            value={form.material}
            onChange={(event) => set("material", event.target.value)}
            placeholder="Керамика, глазурь"
            className="field mt-2"
          />
        </div>

        <div>
          <label className="label" htmlFor="dimensions">
            Размеры
          </label>
          <input
            id="dimensions"
            value={form.dimensions}
            onChange={(event) => set("dimensions", event.target.value)}
            placeholder="H 42 × D 18 см"
            className="field mt-2"
          />
        </div>

        <div>
          <label className="label" htmlFor="year">
            Год
          </label>
          <input
            id="year"
            type="number"
            min={1900}
            max={2100}
            value={form.year}
            onChange={(event) => set("year", event.target.value)}
            className="field mt-2"
          />
        </div>

        <div>
          <label className="label" htmlFor="status">
            Статус
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(event) => set("status", event.target.value)}
            className="field mt-2"
          >
            <option value="active">Активный</option>
            <option value="draft">Черновик</option>
            <option value="archived">Архив</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="label" htmlFor="description">
            Описание
          </label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Короткий текст, который появится на сгенерированной странице."
            className="field mt-2"
          />
        </div>
      </div>

      <div className="border-b border-line px-6 py-8 md:px-10">
        <h2 className="mb-5 border-b border-line pb-2 text-[15px] font-medium">Лимитированность</h2>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.limited}
            onChange={(event) => set("limited", event.target.checked)}
            className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
          />
          <span>
            <span className="block text-[14px]">Лимитированный тираж</span>
            <span className="mt-1 block text-[12px] text-muted">
              На странице появится «03 / 100». Без галочки номер показывается как «03 / N», где N —
              количество созданных страниц объекта.
            </span>
          </span>
        </label>

        {form.limited ? (
          <div className="mt-5 max-w-[220px]">
            <label className="label" htmlFor="edition">
              Тираж (всего экземпляров)
            </label>
            <input
              id="edition"
              type="number"
              min={1}
              required
              value={form.edition_size}
              onChange={(event) => set("edition_size", event.target.value)}
              className="field mt-2"
            />
          </div>
        ) : (
          <label className="mt-5 flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.show_edition_count}
              onChange={(event) => set("show_edition_count", event.target.checked)}
              className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
            />
            <span>
              <span className="block text-[14px]">Показывать общее число страниц</span>
              <span className="mt-1 block text-[12px] text-muted">
                Если снять галочку, на странице будет только «№ 03» без знаменателя.
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-6 py-6 md:px-10">
        <button type="submit" className="btn btn-primary" disabled={busy || !form.name}>
          {busy ? "Сохраняем…" : mode === "create" ? "Создать объект" : "Сохранить изменения"}
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
