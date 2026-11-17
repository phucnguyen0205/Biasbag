import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutForm from "@/components/checkout/checkout-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Thanh toán",
  robots: { index: false, follow: false },
};

/**
 * Trang thanh toán — bắt buộc đăng nhập.
 *
 * Vì không thể thêm sản phẩm vào giỏ khi chưa đăng nhập, mọi đơn hàng đều
 * phải gắn với một tài khoản (`orders.user_id`). Chặn ở server để khách
 * không vào được form kể cả khi gõ tay URL hoặc có sẵn giỏ cũ trong
 * `localStorage` từ trước khi bật yêu cầu đăng nhập.
 */
export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fcheckout");
  }

  return (
    <div className="container-page py-10">
      <h1 className="section-title mb-8">Thanh toán</h1>
      <CheckoutForm />
    </div>
  );
}
