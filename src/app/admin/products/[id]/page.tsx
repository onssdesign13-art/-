import { notFound } from "next/navigation";
import ProductWorkspace from "@/components/admin/ProductWorkspace";
import type { EditorPage } from "@/components/admin/PagesManager";
import { getProduct, listCollections, pagesForProduct, productPhotos } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { objectUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

export default async function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const product = getProduct(id);
  if (!product) notFound();

  const settings = getSettings();
  const pages: EditorPage[] = pagesForProduct(id).map((page) => ({
    ...page,
    url: objectUrl(settings.base_url, page.code),
  }));

  return (
    <ProductWorkspace
      product={product}
      photos={productPhotos(id)}
      pages={pages}
      collections={listCollections()}
      baseUrl={settings.base_url}
    />
  );
}
