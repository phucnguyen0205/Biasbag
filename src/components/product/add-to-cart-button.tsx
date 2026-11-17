"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag, Zap } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { useToast } from "@/lib/store/toast";
import { cn } from "@/lib/utils";
import type { CartProduct } from "@/lib/types";

/**
 * Nút thêm vào giỏ.
 *
 * Nhận payload rút gọn (`CartProduct`) thay vì cả `ProductWithCategory` để
 * giảm dung lượng RSC payload gửi từ Server Component sang client.
 */
export default function AddToCartButton({
  item,
  className,
  quantity = 1,
  label = "Thêm vào giỏ",
  buyNow = false,
}: {
  item: CartProduct;
  className?: string;
  quantity?: number;
  label?: string;
  buyNow?: boolean;
}) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const push = useToast((s) => s.push);

  if (!item.inStock) {
    return (
      <button className={cn("btn-secondary w-full", className)} disabled>
        Tạm hết hàng
      </button>
    );
  }

  function handleClick() {
    add(
      {
        productId: item.id,
        name: item.name,
        slug: item.slug,
        image: item.image,
        price: item.price,
        salePrice: item.salePrice,
        color: item.color,
        material: item.material,
        stock: item.stock,
      },
      quantity,
    );

    push(`Đã thêm "${item.name}" vào giỏ`);

    if (buyNow) {
      router.push("/checkout");
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn("btn-accent", className)}
      aria-label={`${label}: ${item.name}`}
    >
      {buyNow ? <Zap className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {label}
    </button>
  );
}
