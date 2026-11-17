"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogIn, ShoppingBag, Zap } from "lucide-react";
import { useCart } from "@/lib/store/cart";
import { useToast } from "@/lib/store/toast";
import { useAuthUser } from "@/hooks/use-auth-user";
import { cn } from "@/lib/utils";
import type { CartProduct } from "@/lib/types";

/**
 * Nút thêm vào giỏ.
 *
 * Nhận payload rút gọn (`CartProduct`) thay vì cả `ProductWithCategory` để
 * giảm dung lượng RSC payload gửi từ Server Component sang client.
 *
 * YÊU CẦU ĐĂNG NHẬP: khách chưa đăng nhập KHÔNG được thêm sản phẩm vào
 * giỏ. Nút hiển thị "Đăng nhập để mua" và điều hướng tới
 * `/login?next=<đường dẫn hiện tại>` — đăng nhập xong quay lại đúng trang,
 * vẫn đang xem sản phẩm đó.
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
  const pathname = usePathname();
  const add = useCart((s) => s.add);
  const push = useToast((s) => s.push);
  const { user, loading } = useAuthUser();

  if (!item.inStock) {
    return (
      <button className={cn("btn-secondary w-full", className)} disabled>
        Tạm hết hàng
      </button>
    );
  }

  /** Đường dẫn quay lại sau khi đăng nhập (chỉ nhận đường dẫn nội bộ). */
  function loginHref() {
    const next = pathname?.startsWith("/") ? pathname : "/products";
    return `/login?next=${encodeURIComponent(next)}`;
  }

  function handleClick() {
    // Chưa đăng nhập → chặn, báo lý do và dẫn tới trang đăng nhập.
    if (!user) {
      push("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.", "error");
      router.push(loginHref());
      return;
    }

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

  // Chưa đăng nhập → nút chuyển thành "Đăng nhập để mua".
  if (!loading && !user) {
    return (
      <button
        onClick={() => router.push(loginHref())}
        className={cn("btn-secondary", className)}
        aria-label={`Đăng nhập để mua: ${item.name}`}
      >
        <LogIn className="h-4 w-4" />
        Đăng nhập để mua
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      // Khi đang tải trạng thái đăng nhập thì tạm khoá nút để tránh trường
      // hợp "bấm nhầm rồi mới biết là chưa đăng nhập".
      disabled={loading}
      className={cn("btn-accent", className)}
      aria-label={`${label}: ${item.name}`}
    >
      {buyNow ? <Zap className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {label}
    </button>
  );
}
