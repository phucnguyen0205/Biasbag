import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Landmark,
  MapPin,
  Package,
  Smartphone,
  Truck,
  User,
} from "lucide-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { ORDER_STATUS, PAYMENT_METHODS, PAYMENT_STATUS, type PaymentMethodId } from "@/lib/constants";
import type { Order, OrderItem } from "@/lib/types";
import OrderTracker from "@/components/order/order-tracker";

const TONE_CLASS: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  indigo: "bg-indigo-100 text-indigo-800",
  emerald: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
};

const PAYMENT_ICONS: Record<PaymentMethodId, typeof Truck> = {
  cod: Truck,
  bank_transfer: Landmark,
  momo: Smartphone,
};

export default function OrderDetailCard({
  order,
  items,
  displayCode,
  showLookupHint = false,
}: {
  order: Order;
  items: OrderItem[];
  displayCode: string;
  showLookupHint?: boolean;
}) {
  const status = ORDER_STATUS[order.status as keyof typeof ORDER_STATUS];
  const paymentStatus =
    PAYMENT_STATUS[order.payment_status as keyof typeof PAYMENT_STATUS] ??
    PAYMENT_STATUS.unpaid;
  const method =
    PAYMENT_METHODS[order.payment_method as PaymentMethodId] ??
    PAYMENT_METHODS.cod;
  const MethodIcon = PAYMENT_ICONS[method.id];

  // `subtotal` / `shipping_fee` có thể = 0 với đơn tạo trước khi có cột →
  // fallback tính lại từ tổng và từ dòng hàng.
  const itemsSubtotal = items.reduce(
    (sum, it) => sum + Number(it.unit_price) * it.quantity,
    0,
  );
  const subtotal = Number(order.subtotal) || itemsSubtotal;
  const shipping =
    order.shipping_fee != null
      ? Number(order.shipping_fee)
      : Math.max(0, Number(order.total) - itemsSubtotal);
  const total = Number(order.total) || subtotal + shipping;

  return (
    <div className="space-y-6">
      {/* Header: mã đơn + trạng thái */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-100 bg-blush-50/50 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500">
                Mã đơn hàng
              </p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-wide text-ink-900">
                {displayCode}
              </p>
              <p className="mt-1 text-sm text-ink-600">
                Đặt ngày {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {status && (
                <span
                  className={cn(
                    "badge",
                    TONE_CLASS[status.tone] ?? "bg-ink-100 text-ink-700",
                  )}
                >
                  {status.label}
                </span>
              )}
              <span
                className={cn(
                  "badge",
                  TONE_CLASS[paymentStatus.tone] ?? "bg-ink-100 text-ink-700",
                )}
              >
                {paymentStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <OrderTracker status={order.status} />
        </div>
      </div>

      {/* Thông tin khách + giao hàng */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <User className="h-4 w-4 text-blush-600" />
            Thông tin người mua
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div>
              <dt className="text-xs text-ink-500">Họ và tên</dt>
              <dd className="text-ink-900">{order.customer_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Số điện thoại</dt>
              <dd className="text-ink-900">{order.customer_phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-500">Email</dt>
              <dd className="break-all text-ink-900">{order.customer_email}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <MapPin className="h-4 w-4 text-blush-600" />
            Địa chỉ giao hàng
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-800">
            {order.shipping_address}
          </p>
          {order.note && (
            <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs italic text-ink-600">
              Ghi chú: {order.note}
            </p>
          )}
        </div>
      </div>

      {/* Sản phẩm */}
      <div className="card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Package className="h-4 w-4 text-blush-600" />
          Sản phẩm trong đơn ({items.length})
        </h2>
        <ul className="mt-4 divide-y divide-ink-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-3">
              <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                {it.product_image && (
                  <Image
                    src={it.product_image}
                    alt={it.product_name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-ink-900">
                  {it.product_name}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {formatPrice(it.unit_price)} × {it.quantity}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-ink-900">
                {formatPrice(Number(it.unit_price) * it.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2.5 border-t border-ink-100 pt-4 text-sm">
          <div className="flex justify-between text-ink-600">
            <dt>Tạm tính</dt>
            <dd className="font-medium text-ink-900">
              {formatPrice(subtotal)}
            </dd>
          </div>
          <div className="flex justify-between text-ink-600">
            <dt>Phí vận chuyển</dt>
            <dd className="font-medium text-ink-900">
              {shipping === 0 ? "Miễn phí" : formatPrice(shipping)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-ink-100 pt-3">
            <dt className="font-semibold text-ink-900">Tổng cộng</dt>
            <dd className="text-lg font-bold text-ink-900">
              {formatPrice(total)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Hướng dẫn thanh toán */}
      <div className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <MethodIcon className="h-4 w-4 text-blush-600" />
              Thanh toán — {method.label}
            </h2>

        {order.payment_status === "paid" ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Đơn hàng đã được thanh toán. Cảm ơn bạn đã ủng hộ BIAS BAG!
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-2">
              {method.instructions.map((step, i) => (
                <li
                  key={step}
                  className="flex gap-2.5 text-sm leading-relaxed text-ink-700"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush-600 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>

            {method.id === "cod" ? (
              <p className="mt-4 rounded-lg bg-blush-50 px-3 py-2.5 text-xs text-blush-800">
                Mã đơn <strong>{displayCode}</strong> — vui lòng chuẩn bị đúng
                số tiền trong đơn để thanh toán cho shipper khi nhận hàng.
              </p>
            ) : (
              <p className="mt-4 rounded-lg bg-blush-50 px-3 py-2.5 text-xs text-blush-800">
                Nhớ ghi mã đơn <strong>{displayCode}</strong> trong nội dung
                chuyển khoản để chúng tôi đối soát nhanh nhất.
              </p>
            )}
          </>
        )}
      </div>

      {showLookupHint && (
        <p className="text-center text-xs text-ink-500">
          Bạn không đăng nhập? Tra cứu đơn bằng mã đơn và email tại{" "}
          <Link href="/orders/lookup" className="underline">
            tra cứu đơn hàng
          </Link>
          .
        </p>
      )}
    </div>
  );
}
