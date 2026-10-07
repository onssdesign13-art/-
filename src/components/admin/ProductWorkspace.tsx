"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PhotoManager from "./PhotoManager";
import PagesManager, { type EditorPage } from "./PagesManager";
import ProductForm from "./ProductForm";
import type { CollectionSummary } from "@/lib/repo";
import type { MediaRow, ProductSummary } from "@/lib/types";

type Tab = "data" | "photos" | "pages";

export default function ProductWorkspace({
  product,
  photos,
  pages,
  collections,
  baseUrl,
}: {
  product: ProductSummary;
  photos: MediaRow[];
  pages: EditorPage[];
  collections: CollectionSummary[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("data");
  const [busy, setBusy] = useState(false);

  const firstPage = pages[0];
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "data", label: "Данные" },
    { key: "photos", label: "Фотографии", count: photos.length },
    { key: "pages", label: "Страницы", count: pages.length },
  ];

  async function remove() {
    const confirmed = window.confirm(
      `Удалить объект «${product.name}» и все его страницы (${pages.length})? Действие необратимо.`,
    );
    if (!confirmed) return;
    setBusy(true);
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Не удалось удалить объект.");
      return;
    }
    router.replace("/admin/products");
    router.refresh();
  }

  return (
    <div>
      <header className="border-b border-line px-6 py-6 md:px-10">
        <Link href="/admin/products" className="label mb-3 inline-block hover:text-ink">
          ← Все объекты
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">
              {product.collection_name ?? "Без коллекции"}
              {product.collection_release_date ? ` · релиз ${product.collection_release_date}` : ""}
            </p>
            <h1 className="mt-2 text-[26px] font-medium leading-tight md:text-[32px]">
              {product.name}
            </h1>
            <p className="mono mt-2 text-[12px] text-muted">
              код объекта {product.code} · страниц {pages.length} · фото {photos.length}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {firstPage ? (
              <a
                className="btn btn-ghost"
                href={`/o/${firstPage.code}`}
                target="_blank"
                rel="noreferrer"
              >
                Открыть страницу ↗
              </a>
            ) : null}
            <Link href={`/admin/pages?q=${product.code}`} className="btn btn-ghost">
              Все QR
            </Link>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>
              {busy ? "Удаляем…" : "Удалить объект"}
            </button>
          </div>
        </div>

        <nav className="mt-7 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`tab ${tab === item.key ? "tab-active" : ""}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
              {item.count !== undefined ? (
                <span className="mono ml-2 text-2xs opacity-70">{item.count}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </header>

      {tab === "data" ? (
        <ProductForm mode="edit" product={product} collections={collections} />
      ) : null}

      {tab === "photos" ? <PhotoManager productId={product.id} photos={photos} /> : null}

      {tab === "pages" ? (
        <PagesManager
          productId={product.id}
          productName={product.name}
          limited={Number(product.limited) === 1}
          editionSize={product.edition_size}
          showEditionCount={Number(product.show_edition_count) === 1}
          initialPages={pages}
          baseUrl={baseUrl}
        />
      ) : null}
    </div>
  );
}
