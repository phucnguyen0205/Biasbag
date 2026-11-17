import type { Metadata } from "next";
import CartView from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Giỏ hàng",
};

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <h1 className="section-title mb-8">Giỏ hàng</h1>
      <CartView />
    </div>
  );
}
