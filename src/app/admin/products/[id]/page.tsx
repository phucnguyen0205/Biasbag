import { notFound } from "next/navigation";
import { getAdminProducts, getCategories } from "@/lib/data/products";
import ProductForm from "@/components/admin/product-form";

export const metadata = {
  title: "Sửa sản phẩm",
};

type Params = Promise<{ id: string }>;

export default async function EditProductPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const [products, categories] = await Promise.all([
    getAdminProducts(),
    getCategories(),
  ]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-ink-900">
        Sửa: {product.name}
      </h2>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
