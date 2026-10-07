import PageHeader from "@/components/admin/PageHeader";
import ProductForm from "@/components/admin/ProductForm";
import { listCollections } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="Новый объект"
        meta="После создания добавьте фотографии и нужное количество страниц"
        back={{ href: "/admin/products", label: "Все объекты" }}
      />
      <ProductForm mode="create" collections={listCollections()} />
    </>
  );
}
