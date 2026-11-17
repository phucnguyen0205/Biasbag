import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getAdminPostBySlug } from "@/lib/data/posts";
import PostForm from "@/components/admin/post-form";

export const metadata: Metadata = {
  title: "Sửa bài viết",
};

type Params = Promise<{ slug: string }>;

export default async function AdminPostEditPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const post = await getAdminPostBySlug(slug);
  if (!post) notFound();

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
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Sửa bài viết
          </h1>
          {post.status === "published" && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blush-700 hover:underline"
            >
              Xem trên website
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <PostForm post={post} />
    </div>
  );
}
