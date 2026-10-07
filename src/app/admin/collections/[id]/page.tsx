import { notFound } from "next/navigation";
import CollectionEditor from "@/components/admin/CollectionEditor";
import PageHeader from "@/components/admin/PageHeader";
import { getCollection, listProducts } from "@/lib/repo";
import { getMedia } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const collection = Number.isInteger(id) ? getCollection(id) : null;
  if (!collection) notFound();

  return (
    <>
      <PageHeader
        title={collection.name}
        meta={`${collection.products_count} объектов · ${collection.pages_count} страниц`}
        back={{ href: "/admin/collections", label: "Все коллекции" }}
      />
      <CollectionEditor
        collection={collection}
        products={listProducts({ collectionId: collection.id, sort: "release_desc" })}
        cover={collection.cover_media_id ? getMedia(collection.cover_media_id) : null}
      />
    </>
  );
}
