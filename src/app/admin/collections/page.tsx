import Link from "next/link";
import CollectionsManager from "@/components/admin/CollectionsManager";
import PageHeader from "@/components/admin/PageHeader";
import { listCollections } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function CollectionsPage() {
  const collections = listCollections();
  return (
    <>
      <PageHeader
        title="Коллекции"
        meta="Сортировка по дате релиза — новые сверху"
        actions={
          <Link href="/admin/products/new" className="btn btn-primary">
            Новый объект
          </Link>
        }
      />
      <CollectionsManager collections={collections} />
    </>
  );
}
