"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export default function ProductFilters({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      next.delete("page");
      router.push(`/products?${next.toString()}`);
    },
    [params, router],
  );

  const activeCategory = params.get("category");
  const q = params.get("q") ?? "";
  const inStock = params.get("inStock") === "1";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const hasFilters =
    Boolean(activeCategory) ||
    Boolean(q) ||
    inStock ||
    Boolean(minPrice) ||
    Boolean(maxPrice);

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <SlidersHorizontal className="h-4 w-4" />
            Bộ lọc
          </h2>
          {hasFilters && (
            <button
              onClick={() => router.push("/products")}
              className="text-xs font-medium text-blush-700 hover:underline"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="label">Tìm kiếm</p>
            <input
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  update("q", (e.target as HTMLInputElement).value);
              }}
              onBlur={(e) => update("q", e.target.value)}
              placeholder="Tên túi, chất liệu…"
              className="input"
            />
          </div>

          <div>
            <p className="label">Dòng sản phẩm</p>
            <div className="space-y-1.5">
              <button
                onClick={() => update("category", null)}
                className={cn(
                  "block w-full rounded-lg px-3 py-2 text-left text-sm transition",
                  !activeCategory
                    ? "bg-blush-50 font-medium text-blush-700"
                    : "text-ink-600 hover:bg-ink-50",
                )}
              >
                Tất cả sản phẩm
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => update("category", c.slug)}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-sm transition",
                    activeCategory === c.slug
                      ? "bg-blush-50 font-medium text-blush-700"
                      : "text-ink-600 hover:bg-ink-50",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="label">Khoảng giá</p>
            <div className="flex items-center gap-2">
              <input
                defaultValue={minPrice}
                onBlur={(e) => update("minPrice", e.target.value)}
                placeholder="Từ"
                inputMode="numeric"
                className="input"
              />
              <span className="text-ink-400">–</span>
              <input
                defaultValue={maxPrice}
                onBlur={(e) => update("maxPrice", e.target.value)}
                placeholder="Đến"
                inputMode="numeric"
                className="input"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) =>
                update("inStock", e.target.checked ? "1" : null)
              }
              className="h-4 w-4 rounded border-ink-300 text-blush-600 focus:ring-blush-300"
            />
            Chỉ hiển thị còn hàng
          </label>
        </div>
      </div>
    </aside>
  );
}
