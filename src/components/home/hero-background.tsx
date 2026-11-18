"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getBannerBlur } from "@/lib/banners/placeholder";
import type { Banner } from "@/lib/types";

/**
 * Ảnh nền hero — phục vụ bản responsive ĐỨNG YÊN (static).
 *
 * ── Vì sao KHÔNG dùng `next/image` cho hero? ───────────────────────────────
 *
 * Ảnh hero là phần tử LCP (Largest Contentful Paint) của trang chủ — mục tiêu
 * tối ưu số 1 của trang.
 *
 * `next/image` phục vụ ảnh qua `/_next/image?url=…&w=…`:
 *   - Lần đầu tiên mỗi kích thước, server phải decode + resize + nén ảnh gốc
 *     (cold start) → thêm **300–580ms** trước khi trình duyệt nhận ảnh.
 *   - Mỗi request ảnh là thêm 1 round-trip vào waterfall.
 *
 * Ảnh banner đã được nén sẵn lúc build (`scripts/generate-responsive-banners.ts`)
 * theo đúng các mốc thiết bị → phục vụ thẳng từ CDN (static file, cache dài
 * hạn, edge CDN toàn cầu), **không có bước xử lý ảnh nào ở runtime** ⇒ LCP về
 * sớm hơn rõ rệt.
 *
 * ── Vì sao dùng `<picture>` + `srcset` thay vì `<img src>`? ────────────────
 *
 * `srcset` cho phép trình duyệt chọn đúng bản theo màn hình và mật độ pixel:
 *   - Mobile 375px, DPR 2 → tải bản 750px (~32KB) thay vì bản 1920px.
 *   - Desktop 1440px → tải bản 1920px.
 *
 * ── Tối ưu LCP cụ thể ──────────────────────────────────────────────────────
 *
 * 1. `fetchPriority="high"` trên ảnh LCP ⇒ trình duyệt ưu tiên tải ảnh này
 *    ngay khi phát hiện thẻ `<img>` trong HTML (không cần đợi JS).
 * 2. `loading="eager"` + `decoding="async"` ⇒ không trì hoãn ảnh LCP.
 * 3. LQIP (data-URL 8×8) làm `background-image` của wrapper ⇒ có nội dung
 *    hiển thị ngay thay vì khung trống trong lúc ảnh lớn tải → giảm
 *    *perceived* LCP.
 * 4. Ảnh KHÔNG bị ẩn bằng `opacity-0` trước khi tải xong — element `opacity:0`
 *    không phải LCP candidate, nên làm LCP chậm hơn. Thay vào đó ảnh luôn
 *    hiện, LQIP nằm phía sau cho tới khi ảnh thật vẽ đè lên.
 *
 * @see src/components/home/hero-carousel.tsx — component cha dùng ảnh này.
 */

export default function HeroBackground({
  banner,
  priority = false,
  mobile = false,
  className,
  onLoad,
}: {
  banner: Banner;
  /** Ảnh LCP của trang → dùng `fetchPriority="high"` + tải ngay. */
  priority?: boolean;
  /** Bản ảnh dọc cho mobile — chỉ hiện dưới breakpoint `md`. */
  mobile?: boolean;
  className?: string;
  /** Báo khi ảnh đã tải xong (dùng để mở ảnh kế tiếp của carousel). */
  onLoad?: () => void;
}) {
  const src = mobile
    ? (banner.image_url_mobile ?? banner.image_url)
    : banner.image_url;

  /**
   * Ảnh banner do admin upload lên Supabase Storage không có bản responsive
   * đứng yên → phải đi qua `/_next/image`. Bản nội bộ (`/banners/…`) thì có.
   */
  const isStaticVariant = /^\/banners\/banner-\d+/.test(src);

  const blur = getBannerBlur(src);
  const wrapperStyle = blur
    ? {
        backgroundImage: `url("${blur}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  if (!isStaticVariant) {
    // Ảnh từ Supabase Storage → dùng `next/image` (không có bản pre-resize).
    return (
      <div className={cn("absolute inset-0", className)} style={wrapperStyle}>
        <Image
          src={src}
          alt={banner.alt_text ?? ""}
          fill
          priority={priority}
          fetchPriority={priority ? "high" : "auto"}
          placeholder={blur ?? "empty"}
          sizes="100vw"
          quality={72}
          onLoad={onLoad}
          className={cn("object-cover", mobile && "md:hidden")}
        />
      </div>
    );
  }

  // Tên file: /banners/banner-1.webp → /banners/banner-1-750.webp
  const base = src.replace(/\.webp$/, "");

  /**
   * `<picture>` với 3 tầng nguồn ảnh:
   *
   *   1. AVIF  — nhỏ hơn WebP ~20–30% ở cùng chất lượng ⇒ ảnh LCP về sớm hơn
   *   2. WebP  — hỗ trợ ~97% trình duyệt hiện đại
   *   3. `<img src>` — fallback cuối cùng (trình duyệt rất cũ)
   *
   * ⚠️ `src` của `<img>` trỏ tới bản responsive 750px (KHÔNG phải file gốc
   * 57KB) — nếu trình duyệt không hiểu `srcset` thì vẫn chỉ tải ~30KB thay
   * vì 57KB.
   */
  return (
    <div className={cn("absolute inset-0", className)} style={wrapperStyle}>
      <picture>
        <source
          type="image/avif"
          srcSet={`${base}-640.avif 640w, ${base}-750.avif 750w, ${base}-1080.avif 1080w, ${base}-1200.avif 1200w, ${base}-1920.avif 1920w`}
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet={`${base}-640.webp 640w, ${base}-750.webp 750w, ${base}-1080.webp 1080w, ${base}-1200.webp 1200w, ${base}-1920.webp 1920w`}
          sizes="100vw"
        />
        {/* Fallback cho trình duyệt không hỗ trợ WebP.

            ⚠️ KHÔNG đặt `decoding="async"` cho ảnh LCP.
            `async` bảo trình duyệt giải mã ảnh SAU khi vẽ nội dung khác →
            ảnh LCP bị hoãn vẽ ⇒ LCP chậm hơn. Bỏ hẳn thuộc tính này (mặc
            định `auto`) để trình duyệt giải mã đồng bộ và vẽ ngay khi có. */}
        <img
          src={`${base}-750.webp`}
          alt={banner.alt_text ?? ""}
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onLoad={onLoad}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            mobile && "md:hidden",
          )}
        />
      </picture>
    </div>
  );
}
