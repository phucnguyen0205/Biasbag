import Image from "next/image";
import Link from "next/link";
import { cn, finalPrice, formatPrice } from "@/lib/utils";
import type { ProductWithCategory } from "@/lib/types";
import AddToCartButton from "./add-to-cart-button";

/**
 * Card sản phẩm — thiết kế mới.
 *
 * Nguyên tắc thiết kế:
 *   - KHÔNG hiển thị sao đánh giá / số lượt đánh giá. Dữ liệu rating trong DB
 *     là dữ liệu mô phỏng (seed sẵn), hiện ra là thông tin không trung thực
 *     với người mua → bỏ hoàn toàn khỏi giao diện.
 *   - KHÔNG hiển thị badge giảm giá `%` và giá gạch ngang. Giá hiển thị luôn
 *     là giá thật mà khách phải trả (`finalPrice`), không dùng "giá gốc" bị
 *     gạch ngang để tạo cảm giác ưu đãi giả.
 *   - Ưu tiên ảnh sản phẩm + tên + chất liệu/màu + giá. Khoảng trắng thoáng,
 *     bo góc mềm, hover nâng nhẹ, viền blush → đồng bộ với nhận diện hồng.
 *   - Tỷ lệ ảnh cố định `aspect-[4/5]` ⇒ không CLS (Cumulative Layout Shift)
 *     khi ảnh tải xong.
 */
export default function ProductCard({
  product,
  className,
  priority = false,
}: {
  product: ProductWithCategory;
  className?: string;
  /** Ảnh card đầu tiên trong viewport nên tải ưu tiên (LCP). */
  priority?: boolean;
}) {
  const price = finalPrice(product.price, product.sale_price);

  // Chỉ truyền xuống client những field thực sự cần → giảm RSC payload.
  const cartItem = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: product.image_url,
    price: product.price,
    salePrice: product.sale_price,
    color: product.color,
    material: product.material,
    stock: product.stock,
    inStock: product.in_stock,
  };

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white",
        "transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]",
        className,
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-blush-50"
        tabIndex={-1}
        aria-hidden
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            priority={priority}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 320px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">
            Chưa có ảnh
          </div>
        )}

        {/* Chỉ còn badge tình trạng thật — không có badge giảm giá. */}
        {!product.in_stock && (
          <span className="absolute left-3 top-3 badge bg-ink-900/85 text-white backdrop-blur">
            Tạm hết hàng
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blush-600">
            {product.category.name}
          </span>
        )}

        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink-900">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors hover:text-blush-700"
          >
            {product.name}
          </Link>
        </h3>

        {(product.material || product.color) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
            {product.material && <span>{product.material}</span>}
            {product.material && product.color && (
              <span aria-hidden className="text-ink-300">
                ·
              </span>
            )}
            {product.color && <span>{product.color}</span>}
          </div>
        )}

        <div className="mt-auto pt-4">
          <p className="text-lg font-bold tracking-tight text-ink-900">
            {formatPrice(price)}
          </p>
          <AddToCartButton item={cartItem} className="mt-3 w-full" />
        </div>
      </div>
    </article>
  );
}
