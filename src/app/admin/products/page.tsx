import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import ProductTable from "@/components/admin/ProductTable";
import { listCollections, listProducts } from "@/lib/repo";
import type { ProductStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = {
  q?: string;
  collection?: string;
  sort?: string;
  status?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const collectionParam = params.collection ?? "all";
  const collections = listCollections();
  const products = listProducts({
    q: params.q,
    collectionId:
      collectionParam !== "all" && collectionParam !== "none"
        ? Number(collectionParam)
        : null,
    uncategorized: collectionParam === "none",
    status: (params.status as ProductStatus | "all") ?? "all",
    sort: params.sort ?? "created_desc",
  });

  return (
    <>
      <PageHeader
        title="Объекты"
        meta="Все доступные товары: сортировка по коллекциям и дате релиза, поиск"
        actions={
          <>
            <Link href="/admin/collections" className="btn btn-ghost">
              Коллекции
            </Link>
            <Link href="/admin/products/new" className="btn btn-primary">
              Новый объект
            </Link>
          </>
        }
      />
      <ProductTable products={products} collections={collections} />
    </>
  );
}
