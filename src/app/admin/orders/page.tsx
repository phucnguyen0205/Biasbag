import Image from "next/image";
import Link from "next/link";
import { getOrderItems, getOrders, withOrderCode } from "@/lib/data/orders";
import { ORDER_STATUS, paymentLabel } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import OrderStatusSelect from "@/components/admin/order-status-select";
import PaymentStatusButton from "@/components/admin/payment-status-button";

export const metadata = {
  title: "Quản lý đơn hàng",
};

export default async function AdminOrdersPage() {
  const orders = await getOrders();
  const itemsByOrder = await Promise.all(
    orders.map(async (o) => [o.id, await getOrderItems(o.id)] as const),
  );
  const itemMap = new Map(itemsByOrder);

  return (
    <div className="space-y-4">
      {orders.map((raw) => {
        const o = withOrderCode(raw);
        const status = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS];
        const items = itemMap.get(o.id) ?? [];

        return (
          <div key={o.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-500">
                  <Link
                    href={`/orders/${o.id}`}
                    className="font-mono font-semibold tracking-wide text-ink-700 transition hover:text-blush-700"
                  >
                    {o.displayCode}
                  </Link>{" "}
                  · {formatDate(o.created_at)}
                </p>
                <p className="mt-1 font-semibold text-ink-900">
                  {o.customer_name} · {o.customer_phone}
                </p>
                <p className="mt-0.5 text-sm text-ink-600">{o.customer_email}</p>
                <p className="mt-2 max-w-lg text-sm text-ink-600">
                  {o.shipping_address}
                </p>
                {o.note && (
                  <p className="mt-1 text-sm italic text-ink-500">
                    Ghi chú: {o.note}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <OrderStatusSelect orderId={o.id} status={o.status} />
                <PaymentStatusButton
                  orderId={o.id}
                  paymentStatus={o.payment_status ?? "unpaid"}
                />
                <p className="text-lg font-bold text-ink-900">
                  {formatPrice(o.total)}
                </p>
                <p className="text-xs text-ink-500">
                  Thanh toán: {paymentLabel(o.payment_method)}
                </p>
              </div>
            </div>

            {/* Cơ cấu giá — khớp 1-1 với những gì khách nhìn thấy. */}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-ink-100 pt-4 text-xs text-ink-500">
              <div className="flex gap-1.5">
                <dt>Tạm tính:</dt>
                <dd className="font-medium text-ink-800">
                  {formatPrice(o.subtotal)}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Phí vận chuyển:</dt>
                <dd className="font-medium text-ink-800">
                  {Number(o.shipping_fee) === 0
                    ? "Miễn phí"
                    : formatPrice(o.shipping_fee)}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Tổng:</dt>
                <dd className="font-semibold text-ink-900">
                  {formatPrice(o.total)}
                </dd>
              </div>
            </dl>

            {items.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-ink-100 pt-4">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 text-sm">
                    <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-ink-50">
                      {it.product_image && (
                        <Image
                          src={it.product_image}
                          alt={it.product_name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <span className="flex-1 text-ink-800">
                      {it.product_name}
                    </span>
                    <span className="text-ink-500">x{it.quantity}</span>
                    <span className="w-28 text-right font-medium text-ink-900">
                      {formatPrice(Number(it.unit_price) * it.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {status && (
              <p className="sr-only">Trạng thái hiện tại: {status.label}</p>
            )}
          </div>
        );
      })}

      {!orders.length && (
        <div className="card py-16 text-center text-sm text-ink-500">
          Chưa có đơn hàng nào.
        </div>
      )}
    </div>
  );
}
