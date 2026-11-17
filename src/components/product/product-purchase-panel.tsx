"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import AddToCartButton from "@/components/product/add-to-cart-button";
import { cn } from "@/lib/utils";
import type { CartProduct } from "@/lib/types";

export default function ProductPurchasePanel({
  product,
}: {
  product: CartProduct;
}) {
  const [quantity, setQuantity] = useState(1);
  const max = Math.max(1, product.stock || 1);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-ink-700">Số lượng</span>
        <div className="inline-flex items-center rounded-xl border border-ink-200">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
            disabled={quantity <= 1}
            aria-label="Giảm số lượng"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-12 text-center text-sm font-semibold text-ink-900">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(max, q + 1))}
            className="flex h-10 w-10 items-center justify-center text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
            disabled={quantity >= max}
            aria-label="Tăng số lượng"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <span
          className={cn(
            "text-xs",
            product.inStock ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {product.inStock ? `Còn ${product.stock} chiếc` : "Tạm hết hàng"}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <AddToCartButton
          item={product}
          quantity={quantity}
          className="flex-1 py-3"
        />
        <AddToCartButton
          item={product}
          quantity={quantity}
          className="flex-1 py-3"
          label="Mua ngay"
          buyNow
        />
      </div>
    </div>
  );
}
