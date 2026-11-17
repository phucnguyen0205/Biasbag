import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCategories, getProducts } from "@/lib/data/products";
import { SORT_OPTIONS } from "@/lib/constants";
import ProductCard from "@/components/product/product-card";
import ProductFilters from "@/components/product/product-filters";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/lib/types";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata("products");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toArray(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const category = toArray(sp.category);
  const q = toArray(sp.q);
  const sort = (toArray(sp.sort) ?? "newest") as SortOption;
  const page = Number(toArray(sp.page) ?? "1") || 1;
  const minPrice = toArray(sp.minPrice)
    ? Number(toArray(sp.minPrice))
    : undefined;
  const maxPrice = toArray(sp.maxPrice)
    ? Number(toArray(sp.maxPrice))
    : undefined;
  const inStock = toArray(sp.inStock) === "1";

  const [categories, result] = await Promise.all([
    getCategories(),
    getProducts({ category, q, sort, page, minPrice, maxPrice, inStock }),
  ]);

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (sort !== "newest") params.set("sort", sort);
    if (minPrice) params.set("minPrice", String(minPrice));
    if (maxPrice) params.set("maxPrice", String(maxPrice));
    if (inStock) params.set("inStock", "1");
    params.set("page", String(p));
    return `/products?${params.toString()}`;
  };

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="container-page py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-ink-500">
        <Link href="/" className="hover:text-blush-700">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink-800">
          {activeCategory ? activeCategory.name : "Sản phẩm"}
        </span>
      </nav>

      <header className="mb-8">
        <h1 className="section-title">
          {activeCategory ? activeCategory.name : "Tất cả sản phẩm"}
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          {activeCategory?.description ??
            "Chọn chiếc túi phù hợp với phong cách và nhu cầu sử dụng hằng ngày của bạn."}
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <ProductFilters categories={categories} />

        <div className="flex-1">
          {/* Toolbar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">
              {result.total > 0 ? (
                <>
                  Hiển thị{" "}
                  <span className="font-medium text-ink-900">
                    {(result.page - 1) * result.perPage + 1}–
                    {Math.min(result.page * result.perPage, result.total)}
                  </span>{" "}
                  trong tổng số{" "}
                  <span className="font-medium text-ink-900">
                    {result.total}
                  </span>{" "}
                  sản phẩm
                </>
              ) : (
                "Không tìm thấy sản phẩm phù hợp"
              )}
            </p>

            <form className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-ink-600">
                Sắp xếp
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="input w-auto"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-secondary">
                Áp dụng
              </button>
            </form>
          </div>

          {result.products.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.products.map((p, i) => (
                // Chỉ ảnh đầu tiên là LCP candidate thực sự (nằm trên fold).
                // Preload quá nhiều ảnh sẽ tranh giành băng thông với ảnh LCP →
                // làm chậm LCP. Ảnh còn lại giữ `loading="lazy"`.
                <ProductCard key={p.id} product={p} priority={i === 0} />
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 py-20 text-center">
              <p className="font-display text-xl text-ink-800">
                Chưa có sản phẩm phù hợp
              </p>
              <p className="max-w-sm text-sm text-ink-500">
                Thử bỏ bớt bộ lọc hoặc tìm kiếm với từ khóa khác.
              </p>
              <Link href="/products" className="btn-primary mt-2">
                Xem tất cả sản phẩm
              </Link>
            </div>
          )}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2">
              <Link
                href={buildPageUrl(Math.max(1, result.page - 1))}
                className={cn(
                  "btn-secondary h-10 w-10 px-0",
                  result.page === 1 && "pointer-events-none opacity-40",
                )}
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              {Array.from({ length: result.totalPages }).map((_, i) => (
                <Link
                  key={i}
                  href={buildPageUrl(i + 1)}
                  className={cn(
                    "h-10 w-10 rounded-full text-sm font-medium transition",
                    result.page === i + 1
                      ? "bg-blush-600 text-white"
                      : "text-ink-600 hover:bg-ink-100",
                  )}
                >
                  {i + 1}
                </Link>
              ))}
              <Link
                href={buildPageUrl(Math.min(result.totalPages, result.page + 1))}
                className={cn(
                  "btn-secondary h-10 w-10 px-0",
                  result.page === result.totalPages &&
                    "pointer-events-none opacity-40",
                )}
                aria-label="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
