"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Landmark,
  Loader2,
  Smartphone,
  Truck,
} from "lucide-react";
import { submitOrder, type CheckoutState } from "@/app/checkout/actions";
import { checkCartLines } from "@/app/cart/actions";
import { useCart } from "@/lib/store/cart";
import { formatPrice } from "@/lib/utils";
import { calculateTotals } from "@/lib/pricing";
import {
  BANK_INFO,
  FREE_SHIPPING_THRESHOLD,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LIST,
  type PaymentMethodId,
} from "@/lib/constants";
import { useHydrated } from "@/hooks/use-cart-count";

const initialState: CheckoutState = { status: "idle" };

/**
 * Thứ tự hiển thị + icon cho từng phương thức.
 *
 * Icon lấy từ `lucide-react` nên phải map thủ công (không lưu component
 * trong `constants.ts` — file đó được import cả ở server component).
 */
const PAYMENT_ICONS: Record<PaymentMethodId, typeof Truck> = {
  cod: Truck,
  bank_transfer: Landmark,
  momo: Smartphone,
};

export default function CheckoutForm() {
  const [state, formAction, pending] = useActionState(
    submitOrder,
    initialState,
  );
  const { lines, clear, remove } = useCart();
  const hydrated = useHydrated();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>("cod");

  // Đồng bộ giỏ hàng với database trước khi đặt.
  //
  // Giỏ nằm trong `localStorage` nên có thể còn sản phẩm đã bị xoá / đã
  // ngừng bán. Nếu không dọn trước, lần bấm "Đặt hàng" sẽ bị server từ chối
  // với thông báo chung chung. Ở đây ta tự xoá sản phẩm không còn tồn tại
  // và cập nhật tồn kho → khách không phải xử lý thủ công.
  const checkedRef = useRef<string>("");
  const linesSignature = lines
    .map((l) => `${l.productId}:${l.quantity}`)
    .join("|");

  useEffect(() => {
    if (!hydrated || !lines.length) return;
    if (checkedRef.current === linesSignature) return;
    checkedRef.current = linesSignature;

    let cancelled = false;

    void (async () => {
      const result = await checkCartLines(
        lines.map((l) => ({
          productId: l.productId,
          slug: l.slug,
          quantity: l.quantity,
        })),
      );
      if (cancelled) return;

      for (const id of result.removedIds) remove(id);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, linesSignature]);

  // Đơn tạo thành công → xoá giỏ hàng và chuyển tới trang xác nhận đơn.
  //
  // Chuyển hướng (thay vì hiện thông báo tại chỗ) để khách có TRANG ĐƠN
  // đầy đủ: mã đơn, hướng dẫn thanh toán, timeline trạng thái — và có thể
  // quay lại tra cứu bất cứ lúc nào.
  useEffect(() => {
    if (state.status === "success") {
      clear();
      if (state.orderId) router.push(`/orders/${state.orderId}`);
    }
  }, [state.status, state.orderId, clear, router]);

  if (state.status === "success") {
    return (
      <div className="card flex flex-col items-center gap-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blush-600" />
        <h2 className="font-display text-2xl text-ink-900">
          Đặt hàng thành công!
        </h2>
        {state.orderCode && (
          <p className="text-sm text-ink-600">
            Mã đơn hàng:{" "}
            <span className="font-semibold text-ink-900">{state.orderCode}</span>
          </p>
        )}
        <p className="text-sm text-ink-500">
          Đang chuyển tới trang chi tiết đơn hàng…
        </p>
        <div className="mt-2 flex gap-3">
          <Link href="/products" className="btn-primary">
            Tiếp tục mua sắm
          </Link>
          <Link href="/orders" className="btn-secondary">
            Tra cứu đơn hàng
          </Link>
        </div>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="card flex items-center justify-center gap-3 py-20 text-sm text-ink-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải…
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="card flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="font-display text-2xl text-ink-900">
          Giỏ hàng đang trống
        </h2>
        <Link href="/products" className="btn-primary">
          Mua sắm sản phẩm
        </Link>
      </div>
    );
  }

  // Dùng CHUNG hàm tính tiền với server action → tổng hiển thị ở đây luôn
  // khớp với tổng được lưu vào DB.
  const { subtotal, shipping, total, remainingForFreeShipping } =
    calculateTotals(lines);

  const selectedMethod = PAYMENT_METHODS[paymentMethod];
  const SelectedIcon = PAYMENT_ICONS[paymentMethod];

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          lines.map((l) => ({
            productId: l.productId,
            slug: l.slug,
            name: l.name,
            image: l.image,
            price: l.price,
            salePrice: l.salePrice,
            quantity: l.quantity,
          })),
        )}
      />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      {/* Cảnh báo nếu số lượng trong giỏ vượt tồn kho đã biết. */}
      {lines.some((l) => l.stock != null && l.quantity > l.stock) && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:col-span-2">
          Một số sản phẩm trong giỏ vượt quá tồn kho hiện có. Vui lòng quay lại
          giỏ hàng để điều chỉnh số lượng trước khi đặt.
        </p>
      )}

      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="text-base font-semibold text-ink-900">
            Thông tin liên hệ
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="customerName">
                Họ và tên *
              </label>
              <input
                id="customerName"
                name="customerName"
                className="input"
                placeholder="Nguyễn Văn A"
                required
                autoComplete="name"
              />
              {state.fieldErrors?.customerName && (
                <p className="mt-1 text-xs text-rose-600">
                  {state.fieldErrors.customerName}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="customerPhone">
                Số điện thoại *
              </label>
              <input
                id="customerPhone"
                name="customerPhone"
                className="input"
                placeholder="0901234567"
                inputMode="tel"
                autoComplete="tel"
                required
              />
              {state.fieldErrors?.customerPhone && (
                <p className="mt-1 text-xs text-rose-600">
                  {state.fieldErrors.customerPhone}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="customerEmail">
                Email *
              </label>
              <input
                id="customerEmail"
                name="customerEmail"
                type="email"
                className="input"
                placeholder="email@example.com"
                autoComplete="email"
                required
              />
              {state.fieldErrors?.customerEmail && (
                <p className="mt-1 text-xs text-rose-600">
                  {state.fieldErrors.customerEmail}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-ink-900">
            Địa chỉ giao hàng
          </h2>
          <div className="mt-5">
            <label className="label" htmlFor="shippingAddress">
              Địa chỉ nhận hàng *
            </label>
            <textarea
              id="shippingAddress"
              name="shippingAddress"
              rows={3}
              className="input resize-none"
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
              autoComplete="street-address"
              required
            />
            {state.fieldErrors?.shippingAddress && (
              <p className="mt-1 text-xs text-rose-600">
                {state.fieldErrors.shippingAddress}
              </p>
            )}
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="note">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              id="note"
              name="note"
              rows={2}
              className="input resize-none"
              placeholder="Yêu cầu đặc biệt về màu sắc, quà tặng, thời gian giao…"
            />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-ink-900">
            Phương thức thanh toán
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Shop hiện chỉ nhận thanh toán khi nhận hàng (COD).
          </p>

          <div className="mt-5 space-y-3">
            {(
              Object.values(PAYMENT_METHODS) as (typeof PAYMENT_METHODS)[PaymentMethodId][]
            )
              .filter((m) => PAYMENT_METHOD_LIST.includes(m.id))
              .map((m) => {
                const Icon = PAYMENT_ICONS[m.id];
                const active = paymentMethod === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition hover:border-blush-400 ${
                      active
                        ? "border-blush-500 bg-blush-50"
                        : "border-ink-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethodRadio"
                      value={m.id}
                      checked={active}
                      onChange={() => setPaymentMethod(m.id)}
                      className="mt-0.5 h-4 w-4 text-blush-600 focus:ring-blush-300"
                    />
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? "bg-blush-600 text-white"
                          : "bg-ink-50 text-ink-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink-900">
                        {m.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {m.desc}
                      </span>
                    </span>
                  </label>
                );
              })}
          </div>

          {/* Hướng dẫn thanh toán chi tiết cho phương thức đang chọn. */}
          <div className="mt-5 rounded-xl border border-blush-100 bg-blush-50/60 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <SelectedIcon className="h-4 w-4 text-blush-600" />
              {selectedMethod.label}
            </p>

            {paymentMethod === "bank_transfer" && (
              <dl className="mt-3 space-y-1.5 rounded-lg bg-white/70 p-3 text-xs text-ink-700">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Ngân hàng</dt>
                  <dd className="text-right font-medium">{BANK_INFO.bank}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Số tài khoản</dt>
                  <dd className="text-right font-mono font-semibold">
                    {BANK_INFO.accountNumber}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Chủ tài khoản</dt>
                  <dd className="text-right font-medium">
                    {BANK_INFO.accountName}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Nội dung</dt>
                  <dd className="text-right font-mono font-medium">
                    {BANK_INFO.transferMemo} + MÃ ĐƠN
                  </dd>
                </div>
              </dl>
            )}
            {paymentMethod === "momo" && (
              <dl className="mt-3 space-y-1.5 rounded-lg bg-white/70 p-3 text-xs text-ink-700">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Ví nhận</dt>
                  <dd className="text-right font-medium">
                    MoMo / ZaloPay
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Số điện thoại</dt>
                  <dd className="text-right font-mono font-semibold">
                    {BANK_INFO.momoPhone}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Nội dung</dt>
                  <dd className="text-right font-mono font-medium">
                    {BANK_INFO.transferMemo} + MÃ ĐƠN
                  </dd>
                </div>
              </dl>
            )}

            <ul className="mt-3 space-y-1.5">
              {selectedMethod.instructions.map((step, i) => (
                <li
                  key={step}
                  className="flex gap-2 text-xs leading-relaxed text-ink-600"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blush-600 text-[10px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-base font-semibold text-ink-900">
          Đơn hàng của bạn
        </h2>
        <ul className="mt-5 space-y-3">
          {lines.map((l) => (
            <li key={l.productId} className="flex gap-3">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                {l.image && (
                  <Image
                    src={l.image}
                    alt={l.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="line-clamp-2 text-sm font-medium text-ink-900">
                  {l.name}
                </p>
                <p className="text-xs text-ink-500">
                  {l.color ? `Màu ${l.color} · ` : ""}x{l.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold text-ink-900">
                {formatPrice((l.salePrice ?? l.price) * l.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-3 border-t border-ink-100 pt-5 text-sm">
          <div className="flex justify-between text-ink-600">
            <dt>Tạm tính</dt>
            <dd className="font-medium text-ink-900">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-ink-600">
            <dt>Phí vận chuyển</dt>
            <dd className="font-medium text-ink-900">
              {shipping === 0 ? "Miễn phí" : formatPrice(shipping)}
            </dd>
          </div>
        </dl>

        {remainingForFreeShipping > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-blush-50 px-3 py-2 text-xs leading-relaxed text-blush-700">
            <Banknote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Mua thêm{" "}
              <strong>{formatPrice(remainingForFreeShipping)}</strong> để được
              miễn phí vận chuyển (đơn từ {formatPrice(FREE_SHIPPING_THRESHOLD)}).
            </span>
          </p>
        )}

        <div className="mt-4 flex justify-between border-t border-ink-100 pt-4">
          <span className="font-semibold text-ink-900">Tổng cộng</span>
          <span className="text-lg font-bold text-ink-900">
            {formatPrice(total)}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
          <SelectedIcon className="h-3.5 w-3.5" />
          {selectedMethod.label}
        </p>

        {state.status === "error" && state.message && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {state.message}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-accent mt-6 w-full py-3">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý…
            </>
          ) : (
            "Đặt hàng"
          )}
        </button>
        <p className="mt-3 text-center text-xs text-ink-500">
          Bằng việc đặt hàng, bạn đồng ý với chính sách bán hàng của BIAS BAG.
        </p>
        <button
          type="button"
          onClick={() => {
            clear();
            window.location.href = "/products";
          }}
          className="mt-2 w-full text-center text-xs text-ink-400 hover:text-ink-700"
        >
          Xóa giỏ hàng
        </button>
      </aside>
    </form>
  );
}
