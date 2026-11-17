/**
 * Blur placeholder (LQIP) cho ảnh banner nội bộ.
 *
 * Vì sao cần:
 * Ảnh hero là phần tử LCP của trang chủ. Khi chưa tải xong, trình duyệt
 * hiển thị khung trống → người dùng thấy "trang chưa tải xong". Với LQIP
 * (ảnh 8×8 nén cực mạnh, ~100 byte), trình duyệt vẽ ngay một bản mờ đúng
 * tông màu → perceived LCP giảm rõ rệt dù ảnh lớn vẫn đang tải.
 *
 * Giá trị được sinh bằng `sharp` (xem `scripts/optimize-banners.ts`) và gộp
 * tĩnh vào source → không tốn request mạng nào lúc runtime.
 */
export type BlurPlaceholder = `data:image/${string}`;

export const BANNER_BLUR_PLACEHOLDERS: Record<string, BlurPlaceholder> = {
  "banner-1":
    "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAACwAQCdASoIAAMAA4BaJYgAAp1xgsqAAP7rNCzDN3HT83zbhgx7uQVoupZEz55jGn+y1AAA",
  "banner-2":
    "data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACwAQCdASoIAAQAA4BaJQBOgB6Rj3bgAP7v85mf1TpoabSIfU2UCeaAAAA=",
  "banner-3":
    "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACwAQCdASoIAAQAA4BaJQBOgB6Nq10AAP7z4PGL7RIeV5l4Yvaox83e68sjmgAA",
  "banner-4":
    "data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAACwAQCdASoIAAQAA4BaJQBOgB8xSdVAAP7x4vGO0XYaFTjGRwos9Afn/iZXmHRPwAA=",
};

/**
 * Lấy blur placeholder tương ứng với 1 URL ảnh banner.
 *
 * Chỉ áp dụng cho ảnh nội bộ (`/banners/banner-N.webp`). Ảnh do admin
 * upload lên Supabase Storage không có sẵn LQIP → trả `undefined` (Next.js
 * bỏ qua placeholder, hiển thị nền trắng/blush).
 */
export function getBannerBlur(src: string): BlurPlaceholder | undefined {
  const match = src.match(/\/banners\/(banner-\d+)\.webp$/);
  if (!match) return undefined;
  return BANNER_BLUR_PLACEHOLDERS[match[1]];
}
