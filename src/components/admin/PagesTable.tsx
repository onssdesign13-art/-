"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import QrDialog, { type QrTarget } from "./QrDialog";
import type { PageSummary } from "@/lib/types";
import { formatDate } from "@/lib/i18n";

export type AdminPage = PageSummary & { url: string };

export default function PagesTable({ pages }: { pages: AdminPage[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [qrPage, setQrPage] = useState<QrTarget | null>(null);

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;
    const timer = setTimeout(() => {
      const search = new URLSearchParams(params.toString());
      if (query) search.set("q", query);
      else search.delete("q");
      startTransition(() => {
        router.replace(`/admin/pages${search.size ? `?${search.toString()}` : ""}`);
      });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 border-b border-line px-6 py-5 md:px-10">
        <div className="min-w-[240px] flex-1">
          <label className="label" htmlFor="pages-search">
            Поиск по страницам
          </label>
          <input
            id="pages-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Код страницы, объект, коллекция, метка…"
            className="field mt-2"
          />
        </div>
        <p className="label pb-2">
          Найдено: {pages.length} {pending ? "· обновляем…" : ""}
        </p>
      </div>

      {pages.length === 0 ? (
        <p className="px-6 py-12 text-[13px] text-muted md:px-10">
          Страниц пока нет. Откройте объект и добавьте страницы во вкладке «Страницы».
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className="th pl-6 md:pl-10">Фото</th>
                <th className="th">Объект</th>
                <th className="th">Коллекция</th>
                <th className="th">Номер на странице</th>
                <th className="th">Код</th>
                <th className="th">Создана</th>
                <th className="th pr-6 text-right md:pr-10">QR</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td className="td pl-6 md:pl-10">
                    <div className="h-10 w-10 border border-line bg-[#f2f2ef]">
                      {page.cover_filename ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/media/${page.cover_filename}`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="td">
                    <Link href={`/admin/products/${page.product_id}`} className="hover:text-accent">
                      {page.product_name}
                    </Link>
                    {page.status === "void" ? (
                      <span className="label ml-2 text-accent">аннулирована</span>
                    ) : null}
                    {page.label ? (
                      <p className="mt-1 text-[12px] text-muted">{page.label}</p>
                    ) : null}
                  </td>
                  <td className="td text-muted">{page.collection_name ?? "—"}</td>
                  <td className="td mono text-[14px]">
                    {String(page.serial).padStart(2, "0")}
                    {Number(page.limited) === 1 && page.edition_size
                      ? ` / ${page.edition_size}`
                      : ` / ${page.edition_total}`}
                  </td>
                  <td className="td">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mono text-[12px] hover:text-accent"
                    >
                      /o/{page.code} →
                    </a>
                  </td>
                  <td className="td mono text-[12px] text-muted">
                    {formatDate(page.created_at)}
                  </td>
                  <td className="td pr-6 text-right md:pr-10">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          setQrPage({
                            id: page.id,
                            serial: page.serial,
                            code: page.code,
                            url: page.url,
                            productName: page.product_name,
                          })
                        }
                      >
                        QR-код
                      </button>
                      <a
                        className="btn btn-ghost btn-sm"
                        href={`/print/${page.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Печать
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrPage ? <QrDialog page={qrPage} onClose={() => setQrPage(null)} /> : null}
    </div>
  );
}
