import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import OrderLookupForm from "./order-lookup-form";

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng",
  description:
    "Tra cứu trạng thái đơn hàng BIAS BAG bằng mã đơn — không cần đăng nhập.",
  robots: { index: false, follow: false },
};

export default function OrderLookupPage() {
  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blush-50 text-blush-600">
            <PackageSearch className="h-6 w-6" />
          </span>
          <h1 className="section-title mt-4">Tra cứu đơn hàng</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
            Nhập mã đơn hàng cùng email hoặc số điện thoại bạn đã dùng khi đặt
            hàng để xem trạng thái và hướng dẫn thanh toán.
          </p>
        </div>

        <OrderLookupForm />
      </div>
    </div>
  );
}
