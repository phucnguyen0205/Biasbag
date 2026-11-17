import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getPostBySlug, getRelatedPosts } from "@/lib/data/posts";
import { SITE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

/**
 * Trang chi tiết bài viết — tối ưu SEO.
 *
 *   - `generateMetadata`: title/description/keywords/canonical lấy từ meta
 *     tuỳ chỉnh của bài (nếu admin có điền), fallback sang title/excerpt.
 *   - JSON-LD `Article` + `BreadcrumbList` + `WebPage` → Google hiển thị
 *     rich snippet (tên bài, ngày đăng, ảnh, tác giả).
 *   - `generateStaticParams` → bài viết nổi bật được pre-render lúc build.
 *   - `revalidate` + `revalidatePath` khi admin sửa bài ⇒ cập nhật nhanh.
 */

type Params = Promise<{ slug: string }>;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://biasbag.vn";

export const revalidate = 300;

/** Pre-render sẵn các bài viết mới nhất. */
export async function generateStaticParams() {
  const { getFeaturedPosts } = await import("@/lib/data/posts");
  const posts = await getFeaturedPosts(12);
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy bài viết" };

  const title = post.meta_title || post.title;
  const description =
    post.meta_description || post.excerpt || `${post.title} — ${SITE.name}`;

  const url = `${BASE_URL}/blog/${post.slug}`;
  const image = post.og_image || post.image_url || SITE.logoOg;

  return {
    title,
    description,
    keywords: post.meta_keywords?.length ? post.meta_keywords : undefined,
    alternates: { canonical: url },
    authors: [{ name: SITE.name }],
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: SITE.name,
      locale: "vi_VN",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      tags: post.tags ?? undefined,
      images: [{ url: image, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const related = await getRelatedPosts(post, 3);
  const url = `${BASE_URL}/blog/${post.slug}`;
  const image = post.og_image || post.image_url || SITE.logoOg;

  // Số từ ước tính — dùng cho `timeRequired` trong JSON-LD (giúp Google
  // hiển thị "5 phút đọc" trong kết quả tìm kiếm).
  const wordCount = post.content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));

  // --- JSON-LD: Article + BreadcrumbList ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.excerpt ?? undefined,
        image: [image],
        url,
        datePublished: post.published_at ?? post.created_at,
        dateModified: post.updated_at,
        articleSection: post.category ?? undefined,
        keywords: post.tags?.join(", ") || undefined,
        wordCount,
        timeRequired: `PT${readingMinutes}M`,
        inLanguage: "vi-VN",
        author: {
          "@type": "Organization",
          name: SITE.name,
          url: BASE_URL,
        },
        publisher: {
          "@type": "Organization",
          name: SITE.name,
          url: BASE_URL,
          logo: { "@type": "ImageObject", url: `${BASE_URL}${SITE.logo}` },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Bài viết", item: `${BASE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <article className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-500">
        <Link href="/" className="hover:text-blush-700">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/blog" className="hover:text-blush-700">
          Bài viết
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-ink-800">{post.title}</span>
      </nav>

      <header className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          {post.category && (
            <Link
              href={`/blog?tag=${encodeURIComponent(post.category)}`}
              className="eyebrow hover:underline"
            >
              {post.category}
            </Link>
          )}
          {post.published_at && (
            <time dateTime={post.published_at} className="text-sm text-ink-500">
              {formatDate(post.published_at)}
            </time>
          )}
          <span className="flex items-center gap-1 text-sm text-ink-400">
            <Clock className="h-3.5 w-3.5" />
            {readingMinutes} phút đọc
          </span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-base leading-relaxed text-ink-600">
            {post.excerpt}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="rounded-full bg-blush-50 px-3 py-1 text-xs font-medium text-blush-700 transition-colors hover:bg-blush-100"
              >
                #{t}
              </Link>
            ))}
          </div>
        )}
      </header>

      {post.image_url && (
        <div className="relative mx-auto mt-8 aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-2xl border border-ink-100 bg-blush-50">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover"
          />
        </div>
      )}

      {/* Nội dung bài viết — HTML do admin nhập trong trang quản trị */}
      <div
        className="prose-bb mx-auto mt-10 max-w-3xl"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div className="mx-auto mt-12 flex max-w-3xl justify-center">
        <Link href="/blog" className="btn-secondary">
          <ChevronLeft className="h-4 w-4" />
          Về danh sách bài viết
        </Link>
      </div>

      {/* Bài viết liên quan — internal linking giúp tăng thứ hạng */}
      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl border-t border-ink-100 pt-12">
          <h2 className="section-title mb-6">Bài viết liên quan</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <article
                key={p.id}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]"
              >
                <Link
                  href={`/blog/${p.slug}`}
                  className="relative block aspect-[16/10] overflow-hidden bg-blush-50"
                  tabIndex={-1}
                  aria-hidden
                >
                  <Image
                    src={p.image_url || SITE.logoOg}
                    alt={p.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  {post.published_at && (
                    <time
                      dateTime={p.published_at ?? undefined}
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blush-600"
                    >
                      {p.published_at ? formatDate(p.published_at) : ""}
                    </time>
                  )}
                  <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-ink-900">
                    <Link
                      href={`/blog/${p.slug}`}
                      className="transition-colors hover:text-blush-700"
                    >
                      {p.title}
                    </Link>
                  </h3>
                  {p.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">
                      {p.excerpt}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
