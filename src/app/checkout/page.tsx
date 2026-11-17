import type { Metadata } from "next";
import CheckoutForm from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Thanh toán",
};

export default function CheckoutPage() {
  return (
    <div className="container-page py-10">
      <h1 className="section-title mb-8">Thanh toán</h1>
      <CheckoutForm />
    </div>
  );
}
