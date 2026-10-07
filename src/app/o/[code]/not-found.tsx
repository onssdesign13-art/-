import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { publicStrings } from "@/lib/i18n";
import { hexToRgbChannels } from "@/lib/color";

export const dynamic = "force-dynamic";

export default function ObjectNotFound() {
  const settings = getSettings();
  const t = publicStrings(settings);
  return (
    <div className="min-h-screen" style={{ ["--accent" as string]: hexToRgbChannels(settings.accent) }}>
      <header className="border-b border-ink">
        <div className="mx-auto flex max-w-grid items-center justify-between gap-6 px-6 py-4 md:px-10">
          <Link href="/" className="text-[15px] font-medium uppercase tracking-[0.28em]">
            {settings.brand_name}
          </Link>
          <p className="label">{settings.certificate_title}</p>
        </div>
      </header>
      <div className="mx-auto max-w-grid px-6 py-20 md:px-10">
        <p className="label">404</p>
        <h1 className="mt-5 text-[34px] font-medium leading-tight md:text-[52px]">{t.notFound}</h1>
        <p className="mt-4 max-w-[48ch] text-[15px] text-muted">{t.notFoundText}</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            {t.home}
          </Link>
          <Link href="/admin" className="btn btn-ghost">
            Панель
          </Link>
        </div>
      </div>
    </div>
  );
}
