import Link from "next/link";
import { listCollections, listPages, listProducts } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { formatRelease } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = getSettings();
  const collections = listCollections();
  const products = listProducts({ status: "all" });
  const pages = listPages();
  const recent = pages.slice(0, 6);

  return (
    <main className="mx-auto max-w-grid px-6 py-10 md:px-10 md:py-14">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
        <div>
          <p className="label mb-2">{settings.tagline}</p>
          <h1 className="text-[42px] font-medium leading-[0.95] tracking-tight md:text-[64px]">
            {settings.brand_name}
          </h1>
        </div>
        <div className="text-right">
          <p className="label">Паспорта объектов</p>
          <p className="mono mt-1 text-[13px]">
            {collections.length} колл. · {products.length} объектов · {pages.length} страниц
          </p>
          <Link href="/admin" className="btn btn-ghost btn-sm mt-3">
            Панель
          </Link>
        </div>
      </header>

      <section className="grid gap-10 border-b border-line py-8 md:grid-cols-12">
        <p className="label md:col-span-3">Как это работает</p>
        <p className="max-w-[62ch] text-[15px] leading-relaxed md:col-span-9">
          Каждый объект уходит к владельцу вместе с печатным паспортом. На паспорте — QR-код,
          который ведёт на страницу этого конкретного экземпляра: фотография, название, коллекция
          и номер в серии. Страницы генерируются в админ-панели, номер и тираж считаются
          автоматически.
        </p>
      </section>

      <section className="py-8">
        <div className="mb-5 flex items-end justify-between border-b border-line pb-2">
          <h2 className="text-[20px] font-medium">Коллекции</h2>
          <p className="label">Отсортированы по дате релиза</p>
        </div>
        {collections.length === 0 ? (
          <p className="text-muted">
            Пока ничего не создано. Откройте{" "}
            <Link href="/admin" className="underline decoration-accent decoration-2 underline-offset-2">
              панель управления
            </Link>{" "}
            и добавьте первую коллекцию.
          </p>
        ) : (
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <li key={collection.id} className="bg-paper p-4">
                <div className="mb-3 aspect-[4/3] border border-line bg-[#f2f2ef]">
                  {collection.cover_filename ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/media/${collection.cover_filename}`}
                      alt={collection.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-medium">{collection.name}</h3>
                  <span className="mono text-2xs text-muted">{collection.products_count} объ.</span>
                </div>
                <p className="label mt-2">
                  {formatRelease(collection.release_date, settings.language) ?? "Дата не указана"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="border-t border-line py-8">
          <div className="mb-5 flex items-end justify-between border-b border-line pb-2">
            <h2 className="text-[20px] font-medium">Последние страницы</h2>
            <p className="label">/o/&lt;код&gt;</p>
          </div>
          <ul className="divide-y divide-line">
            {recent.map((page) => (
              <li key={page.id} className="flex items-center justify-between py-3">
                <Link href={`/o/${page.code}`} className="text-[14px] hover:underline">
                  {page.product_name} — {page.collection_name ?? "Без коллекции"}
                </Link>
                <span className="mono text-[12px] text-muted">
                  {String(page.serial).padStart(2, "0")} / {page.edition_total} · {page.code}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink pt-4">
        <p className="label">{settings.certificate_title}</p>
        <p className="label">
          <Link href="/admin" className="hover:text-ink">
            Вход для администратора
          </Link>
        </p>
      </footer>
    </main>
  );
}
