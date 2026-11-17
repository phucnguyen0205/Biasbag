import { getCategories } from "@/lib/data/products";
import ProductForm from "@/components/admin/product-form";

export const metadata = {
  title: "Thêm sản phẩm",
};

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-ink-900">
        Thêm sản phẩm mới
      </h2>
      <ProductForm categories={categories} />
    </div>
  );
}
