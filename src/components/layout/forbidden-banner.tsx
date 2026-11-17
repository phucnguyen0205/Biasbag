"use client";

import { useSearchParams } from "next/navigation";

/**
 * Cảnh báo "không đủ quyền" — đọc query `?error=forbidden` do middleware
 * chuyển hướng tới. Component này phải nằm trong <Suspense>.
 */
export function ForbiddenBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "forbidden") return null;

  return (
    <div className="bg-rose-50 px-4 py-2 text-center text-xs text-rose-700">
      Bạn không có quyền truy cập trang quản trị.
    </div>
  );
}
