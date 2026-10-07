"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { CollectionSummary } from "@/lib/repo";
import type { ProductSummary } from "@/lib/types";
import { formatDate } from "@/lib/i18n";

const SORT_OPTIONS = [
  { value: "created_desc", label: "Сначала новые" },
  { value: "created_asc", label: "Сначала старые" },
  { value: "name_asc", label: "Название А→Я" },
  { value: "name_desc", label: "Название Я→А" },
  { value: "collection_asc", label: "Коллекция А→Я" },
  { value: "collection_desc", label: "Коллекция Я→А" },
  { value: "release_desc", label: "Релиз: новые" },
  { value: "release_asc", label: "Релиз: старые" },
  { value: "pages_desc", label: "Больше страниц" },
  { value: "pages_asc", label: "Меньше страниц" },
];

export default function ProductTable({
  products,
  collections,
}: {
  products: ProductSummary[];
  collections: CollectionSummary[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [busyId, setBusyId] = useState<number | null>(null);

  const collection = params.get("collection") ?? "all";
  const sort = params.get("sort") ?? "created_desc";
  const status = params.get("status") ?? "all";

  function apply(next: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" || value === "") search.delete(key);
      else search.set(key, value);
    }
    startTransition(() => {
      router.replace(`/admin/products${search.size ? `?${search.toString()}` : ""}`);
    });
  }

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;
    const timer = setTimeout(() => apply({ q: query || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function remove(product: ProductSummary) {
    const confirmed = window.confirm(
      `Удалить «${product.name}» вместе со всеми его страницами (${product.pages_count})? Это необратимо.`,
    );
    if (!confirmed) return;
    setBusyId(product.id);
    const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Не удалось удалить.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 border-b border-line px-6 py-5 md:px-10">
        <div className="min-w-[220px] flex-1">
          <label className="label" htmlFor="search">
            Поиск
          </label>
          <input
            id="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Название, код, материал, коллекция…"
            className="field mt-2"
          />
        </div>
        <div className="w-[220px]">
          <label className="label" htmlFor="collection">
            Коллекция
          </label>
          <select
            id="collection"
            value={collection}
            onChange={(event) => apply({ collection: event.target.value })}
            className="field mt-2"
          >
            <option value="all">Все коллекции</option>
            <option value="none">Без коллекции</option>
            {collections.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
                {item.release_date ? ` · ${item.release_date}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[190px]">
          <label className="label" htmlFor="sort">
            Сортировка
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => apply({ sort: event.target.value })}
            className="field mt-2"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[150px]">
          <label className="label" htmlFor="status">
            Статус
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => apply({ status: event.target.value })}
            className="field mt-2"
          >
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="draft">Черновики</option>
            <option value="archived">Архив</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-line px-6 py-3 md:px-10">
        <p className="label">
          Найдено: {products.length} {pending ? "· обновляем…" : ""}
        </p>
        <button type="button" className="label hover:text-ink" onClick={() => apply({ q: null, collection: null, sort: null, status: null })}>
          Сбросить фильтры
        </button>
      </div>

      {products.length === 0 ? (
        <div className="px-6 py-16 md:px-10">
          <p className="text-[15px]">Ничего не найдено.</p>
          <p className="mt-2 text-[13px] text-muted">
            Измените фильтры или добавьте новый объект — кнопка «Новый объект» справа сверху.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr>
                <th className="th pl-6 md:pl-10">Фото</th>
                <th className="th">Объект</th>
                <th className="th">Коллекция</th>
                <th className="th">Страницы</th>
                <th className="th">Серия</th>
                <th className="th">Обновлён</th>
                <th className="th pr-6 md:pr-10" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="group">
                  <td className="td pl-6 md:pl-10">
                    <div className="h-12 w-12 border border-line bg-[#f2f2ef]">
                      {product.cover_filename ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/media/${product.cover_filename}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="label flex h-full items-center justify-center">—</span>
                      )}
                    </div>
                  </td>
                  <td className="td">
                    <Link href={`/admin/products/${product.id}`} className="font-medium hover:text-accent">
                      {product.name}
                    </Link>
                    <p className="mono mt-1 text-2xs text-muted">
                      /o/{product.code}
                      {product.category ? ` · ${product.category}` : ""}
                      {product.photos_count > 0 ? ` · фото: ${product.photos_count}` : " · без фото"}
                    </p>
                    {product.status !== "active" ? (
                      <p className="label mt-1 text-accent">
                        {product.status === "draft" ? "черновик" : "архив"}
                      </p>
                    ) : null}
                  </td>
                  <td className="td">
                    {product.collection_name ? (
                      <Link
                        href={`/admin/collections/${product.collection_id}`}
                        className="hover:underline"
                      >
                        {product.collection_name}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                    {product.collection_release_date ? (
                      <p className="mono mt-1 text-2xs text-muted">
                        релиз {formatDate(product.collection_release_date)}
                      </p>
                    ) : null}
                  </td>
                  <td className="td mono text-[15px]">
                    {product.pages_count}
                  </td>
                  <td className="td">
                    {Number(product.limited) === 1 ? (
                      <span className="mono text-[12px]">
                        лимит {product.edition_size}
                      </span>
                    ) : (
                      <span className="label">открытая</span>
                    )}
                  </td>
                  <td className="td mono text-[12px] text-muted">
                    {formatDate(product.updated_at)}
                  </td>
                  <td className="td pr-6 text-right md:pr-10">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/products/${product.id}`} className="btn btn-ghost btn-sm">
                        Открыть
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === product.id}
                        onClick={() => remove(product)}
                      >
                        {busyId === product.id ? "…" : "Удалить"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
