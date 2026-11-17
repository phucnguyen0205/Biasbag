import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageSearch } from "lucide-react";
import {
  getOrderById,
  getOrderItems,
  withOrderCode,
} from "@/lib/data/orders";
import { hasOrderAccess } from "@/lib/order-access";
import { isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import OrderDetailCard from "@/components/order/order-detail-card";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await getOrderById(id);
  if (!order) notFound();

  // Bảo vệ thông tin cá nhân của đơn hàng.
  //
  // Được xem khi:
  //   - Khách vừa đặt / vừa tra cứu → có cookie truy cập hợp lệ, HOẶC
  //   - Chủ đơn đã đăng nhập (user_id khớp với user hiện tại), HOẶC
  //   - Admin/staff đang đăng nhập (xử lý hỗ trợ khách).
  //
  // Nếu không → hiện trang "không có quyền" thay vì lộ thông tin đơn.
  const [canAccess, session, adminAccess] = await Promise.all([
    hasOrderAccess(order.id),
    createClient().then(async (supabase) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    }),
    isAdmin(),
  ]);

  const isOwner = !!session && !!order.user_id && session.id === order.user_id;

  if (!canAccess && !isOwner && !adminAccess) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-blush-50 text-blush-600">
            <PackageSearch className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl text-ink-900">
            Bạn không có quyền xem đơn hàng này
          </h1>
          <p className="mt-3 text-sm text-ink-600">
            Để xem chi tiết đơn hàng, vui lòng tra cứu bằng mã đơn cùng email
            hoặc số điện thoại đã dùng khi đặt hàng.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/orders/lookup" className="btn-accent">
              Tra cứu đơn hàng
            </Link>
            <Link href="/orders" className="btn-secondary">
              Đơn hàng của tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items = await getOrderItems(order.id);
  const { displayCode } = withOrderCode(order);

  return (
    <div className="container-page py-10">
      <Link
        href="/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách đơn hàng
      </Link>

      <OrderDetailCard
        order={order}
        items={items}
        displayCode={displayCode}
        showLookupHint
      />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn-primary">
          Tiếp tục mua sắm
        </Link>
        <Link href="/orders/lookup" className="btn-secondary">
          <PackageSearch className="h-4 w-4" />
          Tra cứu đơn khác
        </Link>
      </div>
    </div>
  );
}
