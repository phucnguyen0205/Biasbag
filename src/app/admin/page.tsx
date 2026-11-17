import Link from "next/link";
import { Package, ShoppingBag, DollarSign, TrendingUp } from "lucide-react";
import { getAdminProducts } from "@/lib/data/products";
import { getOrders } from "@/lib/data/orders";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboard() {
  const [products, orders] = await Promise.all([
    getAdminProducts(),
    getOrders(),
  ]);

  // Doanh thu = đơn KHÔNG bị huỷ VÀ đã thu tiền.
  // Trước đây tính cả đơn chưa thanh toán và cả đơn đã huỷ → số liệu sai.
  const revenue = orders
    .filter((o) => o.status !== "cancelled" && o.payment_status === "paid")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const pendingPayment = orders.filter(
    (o) => o.status !== "cancelled" && o.payment_status !== "paid",
  ).length;

  const stats = [
    { label: "Tổng sản phẩm", value: String(products.length), icon: Package },
    { label: "Đơn hàng", value: String(orders.length), icon: ShoppingBag },
    { label: "Doanh thu đã thu", value: formatPrice(revenue), icon: DollarSign },
    {
      label: "Chờ thu tiền",
      value: String(pendingPayment),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <s.icon className="h-5 w-5 text-blush-600" />
            <p className="mt-3 text-xs uppercase tracking-wide text-ink-500">
              {s.label}
            </p>
            <p className="mt-1 text-xl font-bold text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="text-base font-semibold text-ink-900">Thao tác nhanh</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/products/new" className="btn-accent">
            + Thêm sản phẩm
          </Link>
          <Link href="/admin/orders" className="btn-secondary">
            Xem đơn hàng
          </Link>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-ink-900">
            Đơn hàng gần đây
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="pb-3">Khách hàng</th>
                  <th className="pb-3">Ngày</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3 text-right">Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {orders.slice(0, 5).map((o) => {
                  const status =
                    ORDER_STATUS[o.status as keyof typeof ORDER_STATUS];
                  const paymentStatus =
                    PAYMENT_STATUS[
                      o.payment_status as keyof typeof PAYMENT_STATUS
                    ] ?? PAYMENT_STATUS.unpaid;
                  return (
                    <tr key={o.id}>
                      <td className="py-3">
                        <p className="font-medium text-ink-900">
                          {o.customer_name}
                        </p>
                        <p className="text-xs text-ink-500">
                          {o.customer_email}
                        </p>
                      </td>
                      <td className="py-3 text-ink-600">
                        {new Date(o.created_at).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-3 text-ink-600">
                        {status?.label ?? o.status}
                        <span className="block text-xs text-ink-400">
                          {paymentStatus.label}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-ink-900">
                        {formatPrice(o.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
