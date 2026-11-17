import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CartView from "@/components/cart/cart-view";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Giỏ hàng",
  robots: { index: false, follow: false },
};

/**
 * Trang giỏ hàng — bắt buộc đăng nhập.
 *
 * Không thể thêm sản phẩm khi chưa đăng nhập, nên giỏ hàng của khách vãng
 * lai chỉ có thể là dữ liệu cũ trong `localStorage` (từ trước khi bật yêu
 * cầu đăng nhập). Chặn ở server để trải nghiệm nhất quán: mua hàng luôn
 * gắn với một tài khoản.
 */
export default async function CartPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=%2Fcart");
  }

  return (
    <div className="container-page py-10">
      <h1 className="section-title mb-8">Giỏ hàng</h1>
      <CartView />
    </div>
  );
}
