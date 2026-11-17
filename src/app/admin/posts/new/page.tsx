import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PostForm from "@/components/admin/post-form";

export const metadata: Metadata = {
  title: "Viết bài viết mới",
};

export default function AdminPostNewPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/posts"
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-blush-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách bài viết
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-900">
          Viết bài viết mới
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Viết nội dung hữu ích về túi tote, phối đồ và phong cách để kéo
          traffic tự nhiên về website.
        </p>
      </div>

      <PostForm />
    </div>
  );
}
