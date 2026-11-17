"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { deleteBanner, reorderBanners, toggleBanner } from "@/app/admin/banner-actions";
import { cn } from "@/lib/utils";
import type { Banner } from "@/lib/types";

export default function BannerList({
  banners,
  onEdit,
}: {
  banners: Banner[];
  onEdit?: (banner: Banner) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<{ message?: string }>, okText: string) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message ?? okText);
      router.refresh();
    });
  }

  if (!banners.length) {
    return (
      <div className="card py-16 text-center text-sm text-ink-500">
        Chưa có banner nào. Thêm banner đầu tiên ở form phía trên.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-lg bg-ink-50 px-4 py-2.5 text-sm text-ink-700">
          {message}
        </p>
      )}

      {banners.map((b, i) => (
        <div
          key={b.id}
          className={cn(
            "card flex flex-col gap-4 p-4 sm:flex-row sm:items-center",
            !b.is_active && "opacity-60",
          )}
        >
          {/* Preview */}
          <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-50 sm:w-40">
            {b.image_url ? (
              <Image
                src={b.image_url}
                alt={b.alt_text ?? ""}
                fill
                sizes="160px"
                className="object-cover"
                unoptimized
              />
            ) : null}
            <span className="absolute left-1.5 top-1.5 rounded bg-ink-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              #{i + 1}
            </span>
          </div>

          {/* Thông tin */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">
              {b.alt_text || "Banner không có mô tả"}
            </p>
            <p className="mt-0.5 truncate text-xs text-ink-500">
              {b.image_url}
            </p>
            <p className="mt-1.5">
              <span
                className={cn(
                  "badge",
                  b.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-ink-100 text-ink-600",
                )}
              >
                {b.is_active ? "Đang hiển thị" : "Đang ẩn"}
              </span>
            </p>
          </div>

          {/* Hành động */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                run(
                  () => reorderBanners(b.id, "up"),
                  "Đã đổi thứ tự.",
                )
              }
              disabled={pending || i === 0}
              className="btn-ghost h-9 w-9 px-0 disabled:opacity-30"
              aria-label="Lên trên"
              title="Lên trên"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                run(
                  () => reorderBanners(b.id, "down"),
                  "Đã đổi thứ tự.",
                )
              }
              disabled={pending || i === banners.length - 1}
              className="btn-ghost h-9 w-9 px-0 disabled:opacity-30"
              aria-label="Xuống dưới"
              title="Xuống dưới"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                run(
                  () => toggleBanner(b.id),
                  "Đã cập nhật trạng thái.",
                )
              }
              disabled={pending}
              className="btn-ghost h-9 w-9 px-0"
              aria-label={b.is_active ? "Ẩn banner" : "Hiện banner"}
              title={b.is_active ? "Ẩn banner" : "Hiện banner"}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : b.is_active ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onEdit?.(b)}
              className="btn-ghost h-9 w-9 px-0"
              aria-label="Sửa banner"
              title="Sửa banner"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    "Xoá banner này? Thao tác không thể hoàn tác.",
                  )
                )
                  return;
                run(
                  () => deleteBanner(b.id),
                  "Đã xoá banner.",
                );
              }}
              disabled={pending}
              className="btn-ghost h-9 w-9 px-0 text-ink-400 hover:text-rose-600"
              aria-label="Xoá banner"
              title="Xoá banner"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
