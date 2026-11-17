"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { calculateTotals } from "@/lib/pricing";
import { useHydrated } from "@/hooks/use-cart-count";

export default function CartView() {
  const { lines, setQuantity, remove } = useCart();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="card flex flex-col items-center gap-3 py-20 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-200 border-t-blush-600" />
        <p className="text-sm text-ink-500">Đang tải giỏ hàng…</p>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="card flex flex-col items-center gap-4 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-50 text-ink-400">
          <ShoppingBag className="h-7 w-7" />
        </span>
        <h2 className="font-display text-2xl text-ink-900">
          Giỏ hàng đang trống
        </h2>
        <p className="max-w-sm text-sm text-ink-600">
          Hãy chọn một chiếc túi yêu thích để bắt đầu phong cách riêng của bạn.
        </p>
        <Link href="/products" className="btn-primary mt-2 px-6 py-3">
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  const { subtotal, shipping, total } = calculateTotals(lines);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="card divide-y divide-ink-100">
        {lines.map((l) => (
          <div key={l.productId} className="flex gap-4 p-4">
            <Link
              href={`/products/${l.slug}`}
              className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-50"
            >
              {l.image && (
                <Image
                  src={l.image}
                  alt={l.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </Link>

            <div className="flex flex-1 flex-col">
              <Link
                href={`/products/${l.slug}`}
                className="text-sm font-semibold text-ink-900 hover:text-blush-700"
              >
                {l.name}
              </Link>
              {l.material && (
                <p className="mt-0.5 text-xs text-ink-500">
                  Chất liệu: {l.material}
                </p>
              )}
              {l.color && (
                <p className="text-xs text-ink-500">Màu: {l.color}</p>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="inline-flex items-center rounded-lg border border-ink-200">
                  <button
                    onClick={() => setQuantity(l.productId, l.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center text-ink-600 hover:bg-ink-50 disabled:opacity-40"
                    disabled={l.quantity <= 1}
                    aria-label="Giảm"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-9 text-center text-sm font-medium">
                    {l.quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(l.productId, l.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center text-ink-600 hover:bg-ink-50 disabled:opacity-40"
                    disabled={l.stock != null && l.quantity >= l.stock}
                    aria-label="Tăng"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-ink-900">
                    {formatPrice((l.salePrice ?? l.price) * l.quantity)}
                  </span>
                  <button
                    onClick={() => remove(l.productId)}
                    className="text-ink-400 transition hover:text-rose-600"
                    aria-label="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {l.stock != null && l.quantity > l.stock && (
                <p className="mt-2 text-xs text-rose-600">
                  Chỉ còn {l.stock} chiếc trong kho. Vui lòng giảm số lượng.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-base font-semibold text-ink-900">Tóm tắt đơn</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between text-ink-600">
            <dt>Tạm tính</dt>
            <dd className="font-medium text-ink-900">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-ink-600">
            <dt>Phí vận chuyển</dt>
            <dd className="font-medium text-emerald-600">
              {shipping === 0 ? "Miễn phí" : formatPrice(shipping)}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex justify-between border-t border-ink-100 pt-4">
          <span className="font-semibold text-ink-900">Tổng cộng</span>
          <span className="text-lg font-bold text-ink-900">
            {formatPrice(total)}
          </span>
        </div>
        <Link href="/checkout" className="btn-accent mt-6 w-full py-3">
          Tiến hành thanh toán
        </Link>
        <Link href="/products" className="btn-ghost mt-2 w-full">
          Tiếp tục mua sắm
        </Link>
      </aside>
    </div>
  );
}
