import Link from "next/link";
import { notFound } from "next/navigation";
import PrintButton from "@/components/admin/PrintButton";
import { getPage, getProduct, productPhotos } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { getDb } from "@/lib/db";
import { objectUrl, qrDataUrl } from "@/lib/qr";
import { formatRelease } from "@/lib/i18n";
import { editionLabel, type Collection } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PrintPassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const page = Number.isInteger(id) ? getPage(id) : null;
  if (!page) notFound();
  const product = getProduct(page.product_id);
  if (!product) notFound();

  const settings = getSettings();
  const collection = product.collection_id
    ? (getDb()
        .prepare("SELECT * FROM collections WHERE id = ?")
        .get(product.collection_id) as Collection | undefined)
    : undefined;
  const photos = productPhotos(product.id);
  const url = objectUrl(settings.base_url, page.code);
  const qr = await qrDataUrl(url, { size: 700, margin: 0 });
  const edition = editionLabel({
    serial: page.serial,
    limited: Number(product.limited) === 1,
    editionSize: product.edition_size,
    pagesCount: page.edition_total,
    showEditionCount: Number(product.show_edition_count) === 1,
  });
  const release = formatRelease(collection?.release_date ?? null, settings.language);

  const specs = [
    { label: "Коллекция", value: collection?.name ?? "—" },
    { label: "Релиз", value: release ?? "—" },
    { label: "Материал", value: product.material ?? "—" },
    { label: "Размеры", value: product.dimensions ?? "—" },
    { label: "Год", value: product.year ? String(product.year) : "—" },
    { label: "Код", value: page.code },
  ];

  return (
    <div className="min-h-screen bg-[#f4f4f1] px-6 py-8">
      <div className="no-print mx-auto mb-6 flex max-w-[105mm] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">Печать паспорта</p>
          <p className="mt-1 text-[14px]">
            {product.name} · № {String(page.serial).padStart(2, "0")}
          </p>
          <p className="mt-2 max-w-[52ch] text-[12px] text-muted">
            Формат A6 (105 × 148 мм). В диалоге печати выберите масштаб 100% и отключите поля
            страницы. QR ведёт на {url}
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton label="Печать A6" />
          <Link href={`/admin/products/${product.id}`} className="btn btn-ghost">
            К объекту
          </Link>
        </div>
      </div>

      <div className="sheet mx-auto shadow-sm">
        <div>
          <div className="flex items-start justify-between border-b border-ink pb-2">
            <p className="text-[11pt] font-medium uppercase tracking-[0.28em]">
              {settings.brand_name}
            </p>
            <p className="label">{settings.certificate_title}</p>
          </div>

          <div className="mt-4">
            <p className="label">{collection?.name ?? settings.tagline}</p>
            <h1 className="mt-1 text-[17pt] font-medium leading-[1.05] tracking-tight">
              {product.name}
            </h1>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <p className="label">Номер в серии</p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="mono text-[24pt] leading-none">{edition}</p>
              <p className="label">
                {Number(product.limited) === 1 ? "Лимитированная серия" : "Открытая серия"}
              </p>
            </div>
          </div>

          {product.description ? (
            <p className="mt-4 text-[8pt] leading-[1.45] text-ink/80">{product.description}</p>
          ) : null}

          <div className="sheet-meta mt-4 border-t border-line pt-3">
            {specs.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-line py-1">
                <span className="label">{row.label}</span>
                <span className="text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="label">{settings.footer_note}</p>
            {settings.contact ? (
              <p className="mt-1 text-[8pt]">{settings.contact}</p>
            ) : null}
            <p className="mono mt-2 text-[7pt] text-muted">
              {url.replace(/^https?:\/\//, "")}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR ${page.code}`} className="sheet-qr" />
        </div>
      </div>

      {photos.length > 0 ? (
        <p className="no-print mx-auto mt-4 max-w-[105mm] text-[12px] text-muted">
          Фото на паспорт не печатается — на обороте можно разместить изображение объекта.
        </p>
      ) : null}
    </div>
  );
}
