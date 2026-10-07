import PageHeader from "@/components/admin/PageHeader";
import PagesTable, { type AdminPage } from "@/components/admin/PagesTable";
import { listPages } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { objectUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { base_url } = getSettings();
  const pages: AdminPage[] = listPages({ q }).map((page) => ({
    ...page,
    url: objectUrl(base_url, page.code),
  }));

  return (
    <>
      <PageHeader
        title="Страницы"
        meta="Все сгенерированные страницы и их QR-коды"
      />
      <PagesTable pages={pages} />
    </>
  );
}
