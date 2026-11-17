import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus } from "lucide-react";
import { getAdminProducts, getCategories } from "@/lib/data/products";
import DeleteProductButton from "@/components/admin/delete-product-button";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Quản lý sản phẩm",
};

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getAdminProducts(),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          {products.length} sản phẩm · {categories.length} dòng sản phẩm
        </p>
        <Link href="/admin/products/new" className="btn-accent">
          <Plus className="h-4 w-4" /> Thêm sản phẩm
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-ink-50">
              <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Dòng</th>
                <th className="px-4 py-3">Giá</th>
                <th className="px-4 py-3">Kho</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                        {p.image_url && (
                          <Image
                            src={p.image_url}
                            alt={p.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">
                          {p.name}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {p.color ?? p.material ?? p.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {p.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {formatPrice(p.sale_price ?? p.price)}
                  </td>
                  <td className="px-4 py-3 text-ink-600">{p.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        p.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {p.is_active ? "Hiển thị" : "Ẩn"}
                    </span>
                    {p.is_featured && (
                      <span className="badge ml-1 bg-amber-100 text-amber-700">
                        Nổi bật
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="btn-ghost h-9 w-9 px-0"
                        aria-label="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteProductButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    Chưa có sản phẩm nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
