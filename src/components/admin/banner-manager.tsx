"use client";

import { useState } from "react";
import { X } from "lucide-react";
import BannerForm from "@/components/admin/banner-form";
import BannerList from "@/components/admin/banner-list";
import type { Banner } from "@/lib/types";

/**
 * Quản lý banner: form thêm mới + danh sách.
 * Khi bấm "Sửa" trong danh sách, form chuyển sang chế độ sửa banner đó.
 */
export default function BannerManager({ banners }: { banners: Banner[] }) {
  const [editing, setEditing] = useState<Banner | null>(null);

  return (
    <div className="space-y-6">
      {editing && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900">
            Đang sửa banner
          </h2>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="btn-ghost h-9 w-9 px-0"
            aria-label="Đóng"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <BannerForm
        key={editing?.id ?? "new"}
        banner={editing ?? undefined}
      />

      <div>
        <h2 className="mb-3 text-base font-semibold text-ink-900">
          Danh sách banner
        </h2>
        <BannerList banners={banners} onEdit={setEditing} />
      </div>
    </div>
  );
}
