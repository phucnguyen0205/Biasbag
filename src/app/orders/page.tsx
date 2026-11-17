import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { getMyOrders, getOrderItems, withOrderCode } from "@/lib/data/orders";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import OrderTracker from "@/components/order/order-tracker";

export const metadata = {
  title: "Tra cứu đơn hàng",
  robots: { index: false, follow: false },
};

const toneClass: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  indigo: "bg-indigo-100 text-indigo-800",
  emerald: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
};

export default async function OrdersPage() {
  const orders = await getMyOrders();

  if (!orders.length) {
    return (
      <div className="container-page py-10">
        <h1 className="section-title mb-8">Tra cứu đơn hàng</h1>

        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <PackageSearch className="h-10 w-10 text-ink-300" />
          <p className="text-sm text-ink-600">
            Bạn chưa có đơn hàng nào. Đơn hàng sẽ hiển thị ở đây sau khi bạn đặt.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/products" className="btn-primary">
              Mua sắm sản phẩm
            </Link>
            <Link href="/orders/lookup" className="btn-secondary">
              Tra cứu bằng mã đơn
            </Link>
            <Link href="/login" className="btn-secondary">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const itemsByOrder = await Promise.all(
    orders.map(async (o) => [o.id, await getOrderItems(o.id)] as const),
  );
  const itemMap = new Map(itemsByOrder);

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Tra cứu đơn hàng</h1>
          <p className="mt-1 text-sm text-ink-500">
            {orders.length} đơn hàng
          </p>
        </div>
        <Link href="/orders/lookup" className="btn-secondary">
          Tra cứu bằng mã đơn
        </Link>
      </div>

      <div className="space-y-4">
        {orders.map((raw) => {
          const o = withOrderCode(raw);
          const status = ORDER_STATUS[o.status as keyof typeof ORDER_STATUS];
          const paymentStatus =
            PAYMENT_STATUS[
              o.payment_status as keyof typeof PAYMENT_STATUS
            ] ?? PAYMENT_STATUS.unpaid;
          const items = itemMap.get(o.id) ?? [];

          return (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-500">
                    Mã đơn
                  </p>
                  <Link
                    href={`/orders/${o.id}`}
                    className="mt-0.5 block font-display text-lg font-semibold tracking-wide text-ink-900 transition hover:text-blush-700"
                  >
                    {o.displayCode}
                  </Link>
                  <p className="mt-1 text-sm text-ink-600">
                    {formatDate(o.created_at)} · {o.customer_name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {status && (
                      <span
                        className={cn(
                          "badge",
                          toneClass[status.tone] ?? "bg-ink-100 text-ink-700",
                        )}
                      >
                        {status.label}
                      </span>
                    )}
                    <span
                      className={cn(
                        "badge",
                        toneClass[paymentStatus.tone] ??
                          "bg-ink-100 text-ink-700",
                      )}
                    >
                      {paymentStatus.label}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-ink-900">
                    {formatPrice(o.total)}
                  </p>
                </div>
              </div>

              {items.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-sm">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      className="flex justify-between gap-3 text-ink-600"
                    >
                      <span>
                        {it.product_name}{" "}
                        <span className="text-ink-400">x{it.quantity}</span>
                      </span>
                      <span className="font-medium text-ink-900">
                        {formatPrice(Number(it.unit_price) * it.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 border-t border-ink-100 pt-4">
                <OrderTracker status={o.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
