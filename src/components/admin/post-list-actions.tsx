"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Star, Trash2 } from "lucide-react";
import {
  deletePost,
  setPostStatus,
  togglePostFeatured,
} from "@/app/admin/post-actions";
import { cn } from "@/lib/utils";

/**
 * Hành động nhanh trên mỗi dòng bài viết (client component).
 */
export default function PostListActions({
  id,
  status,
  isFeatured,
}: {
  id: string;
  status: string;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const isPublished = status === "published";

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      {/* Đăng / lưu nháp */}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(() =>
            setPostStatus(id, isPublished ? "draft" : "published"),
          )
        }
        title={isPublished ? "Gỡ xuất bản" : "Xuất bản"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border transition",
          isPublished
            ? "border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50"
            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50",
        )}
      >
        {isPublished ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>

      {/* Nổi bật */}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => togglePostFeatured(id))}
        title={isFeatured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border transition",
          isFeatured
            ? "border-blush-200 bg-blush-50 text-blush-600"
            : "border-ink-200 text-ink-500 hover:bg-ink-50",
        )}
      >
        <Star className="h-4 w-4" />
      </button>

      {/* Xoá */}
      {confirming ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setConfirming(false);
              run(() => deletePost(id));
            }}
            className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
          >
            Xoá
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-600"
          >
            Huỷ
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(true)}
          title="Xoá bài viết"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
