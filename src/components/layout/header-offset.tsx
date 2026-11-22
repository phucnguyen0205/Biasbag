"use client";

import { usePathname } from "next/navigation";

export function HeaderOffset() {
  const pathname = usePathname();

  // Trang chủ: không bù khoảng trống để banner chạm sát đỉnh màn hình dưới header trong suốt
  if (!pathname || pathname === "/" || pathname === "/vi") return null;

  return <div aria-hidden className="h-20 shrink-0" />;
}