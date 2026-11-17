"use client";

import { usePathname } from "next/navigation";

/**
 * Khoảng trống bù chiều cao header.
 *
 * Header dùng `fixed` để nổi đè lên banner ở trang chủ. Nhờ vậy banner chiếm
 * trọn đầu trang. Các trang còn lại cần một khoảng trống tương ứng để nội
 * dung không bị header che.
 *
 * Chiều cao phải khớp với `h-20` của header (80px).
 */
export function HeaderOffset() {
  const pathname = usePathname();

  // Trang chủ: banner nằm ngay dưới header trong suốt → không bù.
  if (pathname === "/") return null;

  return <div aria-hidden className="h-20 shrink-0" />;
}
