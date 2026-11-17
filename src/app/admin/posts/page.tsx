import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { getPosts } from "@/lib/data/posts";
import { POST_STATUS_META } from "@/lib/types";
import { SITE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import PostListActions from "@/components/admin/post-list-actions";

export const metadata: Metadata = {
  title: "Quản lý bài viết",
};

const PAGE_SIZE = 20;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = (sp.status as string) || "all";
  const page = Number(sp.page ?? "1") || 1;

  const { posts, total } = await getPosts({
    status: status as never,
    page,
    perPage: PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Bài viết
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total} bài viết · quản lý nội dung blog của BIAS BAG
          </p>
        </div>
        <Link href="/admin/posts/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Viết bài mới
        </Link>
      </div>

      {/* Bộ lọc trạng thái */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "Tất cả" },
          { value: "published", label: "Đã đăng" },
          { value: "draft", label: "Bản nháp" },
          { value: "archived", label: "Đã ẩn" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/posts" : `/admin/posts?status=${f.value}`}
            className={
              status === f.value
                ? "rounded-full bg-ink-900 px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-ink-200 px-3.5 py-1.5 text-sm text-ink-600 transition hover:border-blush-300 hover:text-blush-700"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-20 text-center">
          <p className="font-display text-xl text-ink-800">
            Chưa có bài viết nào
          </p>
          <p className="max-w-sm text-sm text-ink-500">
            Viết bài đầu tiên để tăng traffic tự nhiên và thứ hạng tìm kiếm.
          </p>
          <Link href="/admin/posts/new" className="btn-primary mt-2">
            <Plus className="h-4 w-4" />
            Viết bài mới
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {posts.map((post) => {
            const meta = POST_STATUS_META[
              post.status as keyof typeof POST_STATUS_META
            ] ?? POST_STATUS_META.draft;

            return (
              <div
                key={post.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >
                {/* Ảnh */}
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
                  <Image
                    src={post.image_url || SITE.logoOg}
                    alt={post.title}
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Nội dung */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        meta.tone === "emerald"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                          : meta.tone === "amber"
                            ? "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                            : "rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600"
                      }
                    >
                      {meta.label}
                    </span>
                    {post.is_featured && (
                      <span className="rounded-full bg-blush-50 px-2 py-0.5 text-[11px] font-medium text-blush-700">
                        Nổi bật
                      </span>
                    )}
                    {post.category && (
                      <span className="text-[11px] text-ink-500">
                        {post.category}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1.5 truncate text-sm font-semibold text-ink-900">
                    <Link
                      href={`/admin/posts/${post.slug}`}
                      className="hover:text-blush-700"
                    >
                      {post.title}
                    </Link>
                  </h3>

                  <p className="mt-1 truncate font-mono text-xs text-ink-400">
                    /blog/{post.slug}
                  </p>

                  <p className="mt-1 text-xs text-ink-500">
                    {post.published_at
                      ? `Đăng ${formatDate(post.published_at)}`
                      : `Tạo ${formatDate(post.created_at)}`}
                    {" · "}
                    {post.view_count} lượt xem
                  </p>
                </div>

                {/* Hành động */}
                <PostListActions
                  id={post.id}
                  status={post.status}
                  isFeatured={post.is_featured}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
