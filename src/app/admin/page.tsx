import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { getStats, listCollections, listPages, recentAudit } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const stats = getStats();
  const settings = getSettings();
  const collections = listCollections().slice(0, 4);
  const pages = listPages().slice(0, 6);
  const log = recentAudit(8);

  const cells = [
    { label: "Объекты", value: stats.products, href: "/admin/products" },
    { label: "Коллекции", value: stats.collections, href: "/admin/collections" },
    { label: "Страницы", value: stats.pages, href: "/admin/pages" },
    { label: "Фотографии", value: stats.photos, href: null },
    { label: "Лимитированные", value: stats.limited_products, href: null },
    { label: "Страниц за 7 дней", value: stats.pages_7d, href: null },
  ];

  return (
    <>
      <PageHeader
        title="Обзор"
        meta={`${settings.brand_name} · база: ${settings.base_url}`}
        actions={
          <>
            <Link href="/admin/products/new" className="btn btn-primary">
              Новый объект
            </Link>
            <Link href="/admin/collections" className="btn btn-ghost">
              Коллекции
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-px bg-line md:grid-cols-3 lg:grid-cols-6">
        {cells.map((cell) => (
          <div key={cell.label} className="bg-paper px-6 py-5">
            <p className="label">{cell.label}</p>
            <p className="mono mt-3 text-[30px] leading-none">
              {cell.href ? (
                <Link href={cell.href} className="hover:text-accent">
                  {cell.value}
                </Link>
              ) : (
                cell.value
              )}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-0 lg:grid-cols-2">
        <section className="border-b border-line px-6 py-8 lg:border-r lg:px-10">
          <div className="mb-4 flex items-end justify-between border-b border-line pb-2">
            <h2 className="text-[18px] font-medium">Коллекции</h2>
            <Link href="/admin/collections" className="label hover:text-ink">
              Все
            </Link>
          </div>
          {collections.length === 0 ? (
            <p className="text-[13px] text-muted">
              Коллекций пока нет — начните с неё, чтобы объекты группировались по сериям.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {collections.map((collection) => (
                <li key={collection.id} className="flex items-center justify-between py-3">
                  <Link href={`/admin/collections/${collection.id}`} className="hover:underline">
                    {collection.name}
                  </Link>
                  <span className="mono text-[12px] text-muted">
                    {collection.products_count} объ. · {collection.pages_count} стр.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-b border-line px-6 py-8 lg:px-10">
          <div className="mb-4 flex items-end justify-between border-b border-line pb-2">
            <h2 className="text-[18px] font-medium">Свежие страницы</h2>
            <Link href="/admin/pages" className="label hover:text-ink">
              Все
            </Link>
          </div>
          {pages.length === 0 ? (
            <p className="text-[13px] text-muted">
              Страниц пока нет. Создайте объект и добавьте ему нужное количество страниц.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {pages.map((page) => (
                <li key={page.id} className="flex items-center justify-between py-3">
                  <span className="text-[13px]">
                    {page.product_name}
                    <span className="text-muted"> · {page.collection_name ?? "без коллекции"}</span>
                  </span>
                  <span className="mono text-[12px] text-muted">
                    {page.serial}/{page.edition_total} · {page.code}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="px-6 py-8 md:px-10">
        <h2 className="mb-4 border-b border-line pb-2 text-[18px] font-medium">Журнал действий</h2>
        {log.length === 0 ? (
          <p className="text-[13px] text-muted">Пока пусто.</p>
        ) : (
          <ul className="divide-y divide-line">
            {log.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="mono text-[11px] uppercase tracking-label text-muted">
                  {entry.action}
                </span>
                <span className="flex-1 truncate text-[13px]">{entry.detail ?? ""}</span>
                <span className="mono text-[11px] text-muted">{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
