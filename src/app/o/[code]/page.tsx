import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { extractCode, padSerial } from "@/lib/ids";
import { getPublicObject } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { formatRelease, publicStrings } from "@/lib/i18n";
import { editionLabel } from "@/lib/types";
import { hexToRgbChannels } from "@/lib/color";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const object = getPublicObject(extractCode((await params).code));
  const settings = getSettings();
  if (!object) return { title: `Объект не найден · ${settings.brand_name}` };
  const edition = editionLabel({
    serial: object.serial,
    limited: object.limited,
    editionSize: object.editionSize,
    pagesCount: object.pagesCount,
    showEditionCount: object.showEditionCount,
  });
  return {
    title: `${object.productName} ${edition} · ${settings.brand_name}`,
    description: [object.collectionName, object.category, object.material]
      .filter(Boolean)
      .join(" · "),
  };
}

export default async function ObjectPage({ params }: Props) {
  const { code: raw } = await params;
  const settings = getSettings();
  const t = publicStrings(settings);
  const object = getPublicObject(extractCode(raw));

  if (!object) notFound();

  const edition = editionLabel({
    serial: object.serial,
    limited: object.limited,
    editionSize: object.editionSize,
    pagesCount: object.pagesCount,
    showEditionCount: object.showEditionCount,
  });
  const [cover, ...rest] = object.photos;
  const release = formatRelease(object.collectionReleaseDate, settings.language);
  const voided = object.status === "void";

  const specs: { label: string; value: string | null }[] = [
    { label: t.collection, value: object.collectionName },
    { label: t.serial, value: edition },
    {
      label: t.edition,
      value: object.limited ? t.limited : t.openEdition,
    },
    { label: t.category, value: object.category },
    { label: t.material, value: object.material },
    { label: t.dimensions, value: object.dimensions },
    { label: t.year, value: object.year ? String(object.year) : null },
    { label: t.released, value: release },
    { label: t.code, value: object.productCode },
  ].filter((row) => row.value);

  return (
    <Shell
      settings={settings}
      label={`${t.passport} · ${object.code}`}
      right={release ? `${t.released}: ${release}` : undefined}
    >
      <div className="mx-auto max-w-grid px-6 pb-16 md:px-10">
        {voided ? (
          <p className="mt-6 border border-accent px-4 py-3 text-[13px] text-accent">
            <span className="label text-accent">{t.voided}</span> — {t.voidedText}
          </p>
        ) : null}

        <section className="grid grid-cols-1 gap-px border-b border-line md:grid-cols-12">
          <div className="order-2 md:order-1 md:col-span-7 md:border-r md:border-line">
            <figure className="aspect-[4/5] w-full bg-[#f2f2ef]">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/media/${cover.filename}`}
                  alt={object.productName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-line">
                  <span className="label">{t.photos} — 0</span>
                </div>
              )}
            </figure>
            {rest.length > 0 ? (
              <ul className="grid grid-cols-4 gap-px border-t border-line bg-line">
                {rest.slice(0, 4).map((photo) => (
                  <li key={photo.id} className="bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/media/${photo.filename}`}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="order-1 flex flex-col md:order-2 md:col-span-5 md:pl-8 md:pt-8">
            <p className="label">
              {object.collectionName ?? settings.brand_name} {object.year ? `· ${object.year}` : ""}
            </p>
            <h1 className="mt-3 text-[34px] font-medium leading-[1.02] tracking-tight md:text-[46px]">
              {object.productName}
            </h1>

            <div className="mt-8 border-t border-ink pt-4">
              <p className="label">{t.serial}</p>
              <p className="mono mt-2 text-[54px] leading-none tracking-tight md:text-[68px]">
                {padSerial(object.serial)}
                <span className="text-muted">
                  {edition.includes("/") ? ` / ${edition.split("/")[1].trim()}` : ""}
                </span>
              </p>
              <p className="label mt-3">
                {object.limited ? t.limited : t.openEdition}
              </p>
            </div>

            <dl className="mt-8">
              {specs.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-6 border-b border-line py-3"
                >
                  <dt className="label">{row.label}</dt>
                  <dd className="text-right text-[13px]">{row.value}</dd>
                </div>
              ))}
            </dl>

            {object.description ? (
              <p className="mt-8 max-w-[52ch] text-[14px] leading-relaxed text-ink/80">
                {object.description}
              </p>
            ) : null}
          </div>
        </section>

        <footer className="grid gap-6 py-8 md:grid-cols-12">
          <div className="md:col-span-7">
            <div className="flex items-start gap-3">
              <span className="mt-[3px] block h-2.5 w-2.5 shrink-0 bg-accent" />
              <div>
                <p className="text-[14px] font-medium">{t.verified}</p>
                <p className="mt-1 max-w-[52ch] text-[13px] text-muted">{t.verifiedText}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-5 md:text-right">
            <p className="label">{t.code}</p>
            <p className="mono mt-1 text-[15px] tracking-[0.2em]">{object.code}</p>
            <p className="label mt-4">{settings.footer_note}</p>
            {settings.contact ? (
              <p className="mt-1 text-[13px]">{settings.contact}</p>
            ) : null}
          </div>
        </footer>
      </div>
    </Shell>
  );
}

function Shell({
  settings,
  label,
  right,
  children,
}: {
  settings: ReturnType<typeof getSettings>;
  label: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ ["--accent" as string]: hexToRgbChannels(settings.accent) }}>
      <header className="border-b border-ink">
        <div className="mx-auto flex max-w-grid items-center justify-between gap-6 px-6 py-4 md:px-10">
          <Link href="/" className="text-[15px] font-medium uppercase tracking-[0.28em]">
            {settings.brand_name}
          </Link>
          <div className="text-right">
            <p className="label">{label}</p>
            {right ? <p className="label mt-1 hidden md:block">{right}</p> : null}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
