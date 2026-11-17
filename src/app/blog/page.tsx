import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getPosts, getPostTags } from "@/lib/data/posts";
import { SITE } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { Post } from "@/lib/types";
import { buildPageMetadata } from "@/lib/seo";

/**
 * Trang danh sách bài viết.
 *
 * Tối ưu SEO:
 *   - `metadata` có title/description/keywords riêng + canonical + OG.
 *   - JSON-LD `Blog` + `BreadcrumbList` + `ItemList` (giúp Google hiển thị
 *     các bài trong kết quả tìm kiếm).
 *   - Mỗi thẻ bài viết là `<article>` với heading đúng cấp (H2) — cấu trúc
 *     heading chuẩn là yếu tố on-page SEO quan trọng.
 *   - Ảnh có `alt` mô tả đúng nội dung (SEO hình ảnh + accessibility).
 *   - Liên kết nội bộ tới bài viết giúp Google dò crawl (internal linking).
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://biasbag.vn";

export const metadata: Metadata = buildPageMetadata("blog");

/** ISR — bài viết mới hiện sau tối đa 5 phút. */
export const revalidate = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toArray(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** Ảnh đại diện bài viết (fallback về logo khi bài chưa có ảnh). */
function postImage(post: Post) {
  return post.image_url || SITE.logoOg;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Number(toArray(sp.page) ?? "1") || 1;
  const q = toArray(sp.q) ?? "";
  const tag = toArray(sp.tag) ?? "";
  const sort = (toArray(sp.sort) ?? "newest") as string;
  const perPage = 9;

  const [{ posts, total, totalPages }, tags] = await Promise.all([
    getPosts({ q: q || undefined, tag: tag || undefined, sort, page, perPage }),
    getPostTags(),
  ]);

  // --- JSON-LD: Blog + Breadcrumb + ItemList ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${BASE_URL}/blog#blog`,
        name: `Bài viết — ${SITE.name}`,
        description:
          "Kiến thức phối đồ, bảo quản túi canvas, cách chọn túi tote theo dáng người và mẹo hay dành cho giới trẻ.",
        url: `${BASE_URL}/blog`,
        publisher: {
          "@type": "Organization",
          name: SITE.name,
          url: BASE_URL,
          logo: { "@type": "ImageObject", url: `${BASE_URL}${SITE.logo}` },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Bài viết", item: `${BASE_URL}/blog` },
        ],
      },
      {
        "@type": "ItemList",
        itemListElement: posts.map((post, i) => ({
          "@type": "ListItem",
          position: (page - 1) * perPage + i + 1,
          url: `${BASE_URL}/blog/${post.slug}`,
          name: post.title,
        })),
      },
    ],
  };

  /** URL trang kế tiếp (dùng cho rel=next/prev). */
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    if (sort !== "newest") params.set("sort", sort);
    params.set("page", String(p));
    return `/blog?${params.toString()}`;
  };

  const hasFilter = Boolean(q || tag);

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb — cũng là breadcrumb hiển thị cho người dùng */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-ink-500">
        <Link href="/" className="hover:text-blush-700">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-ink-800">Bài viết</span>
      </nav>

      <header className="mb-8">
        <h1 className="section-title">
          {tag ? `Bài viết về "${tag}"` : "Bài viết"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-600">
          Kiến thức phối đồ, bảo quản túi và những mẹo hay dành cho giới trẻ.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Bộ lọc / sidebar */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="card p-5">
            {/* Tìm kiếm */}
            <form action="/blog" className="mb-5">
              <p className="label">Tìm bài viết</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Từ khoá…"
                  className="input pl-10"
                />
              </div>
              {tag && <input type="hidden" name="tag" value={tag} />}
              <button type="submit" className="btn-secondary mt-2 w-full">
                Tìm kiếm
              </button>
            </form>

            {/* Chủ đề */}
            {tags.length > 0 && (
              <div>
                <p className="label">Chủ đề</p>
                <div className="space-y-1">
                  <Link
                    href="/blog"
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition",
                      !tag
                        ? "bg-blush-50 font-medium text-blush-700"
                        : "text-ink-600 hover:bg-ink-50",
                    )}
                  >
                    Tất cả chủ đề
                  </Link>
                  {tags.map((t) => (
                    <Link
                      key={t.tag}
                      href={`/blog?tag=${encodeURIComponent(t.tag)}`}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                        tag === t.tag
                          ? "bg-blush-50 font-medium text-blush-700"
                          : "text-ink-600 hover:bg-ink-50",
                      )}
                    >
                      <span>{t.tag}</span>
                      <span className="text-xs text-ink-400">{t.count}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {hasFilter && (
              <Link
                href="/blog"
                className="mt-4 block text-center text-xs font-medium text-blush-700 hover:underline"
              >
                Xóa bộ lọc
              </Link>
            )}
          </div>
        </aside>

        {/* Danh sách bài */}
        <div className="flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600">
              {total > 0 ? (
                <>
                  Hiển thị{" "}
                  <span className="font-medium text-ink-900">
                    {(page - 1) * perPage + 1}–
                    {Math.min(page * perPage, total)}
                  </span>{" "}
                  trong tổng số{" "}
                  <span className="font-medium text-ink-900">{total}</span> bài viết
                </>
              ) : (
                "Không tìm thấy bài viết phù hợp"
              )}
            </p>

            <form className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-ink-600">
                Sắp xếp
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="input w-auto"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="popular">Xem nhiều</option>
                <option value="title">Tiêu đề A → Z</option>
              </select>
              {q && <input type="hidden" name="q" value={q} />}
              {tag && <input type="hidden" name="tag" value={tag} />}
              <button type="submit" className="btn-secondary">
                Áp dụng
              </button>
            </form>
          </div>

          {posts.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-20 text-center">
              <p className="font-display text-xl text-ink-800">
                Chưa có bài viết phù hợp
              </p>
              <p className="max-w-sm text-sm text-ink-500">
                Thử bỏ bớt bộ lọc hoặc tìm kiếm với từ khoá khác.
              </p>
              <Link href="/blog" className="btn-primary mt-2">
                Xem tất cả bài viết
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((post, i) => (
                <article
                  key={post.id}
                  className={cn(
                    "group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white",
                    "transition-[transform,box-shadow,border-color] duration-300",
                    "hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]",
                  )}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="relative block aspect-[16/10] overflow-hidden bg-blush-50"
                    tabIndex={-1}
                    aria-hidden
                  >
                    <Image
                      src={postImage(post)}
                      alt={post.title}
                      fill
                      priority={i === 0}
                      fetchPriority={i === 0 ? "high" : "auto"}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 360px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {post.category && (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blush-600">
                          {post.category}
                        </span>
                      )}
                      {post.published_at && (
                        <time
                          dateTime={post.published_at}
                          className="text-[11px] text-ink-400"
                        >
                          {formatDate(post.published_at)}
                        </time>
                      )}
                    </div>

                    <h2 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-ink-900">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="transition-colors hover:text-blush-700"
                      >
                        {post.title}
                      </Link>
                    </h2>

                    {post.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-500">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Tag — internal linking giúp SEO */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((t) => (
                          <Link
                            key={t}
                            href={`/blog?tag=${encodeURIComponent(t)}`}
                            className="rounded-full bg-ink-50 px-2.5 py-0.5 text-[11px] font-medium text-ink-600 transition-colors hover:bg-blush-50 hover:text-blush-700"
                          >
                            #{t}
                          </Link>
                        ))}
                      </div>
                    )}

                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blush-700 transition-colors hover:text-blush-800"
                    >
                      Đọc bài
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2">
              <Link
                href={buildPageUrl(Math.max(1, page - 1))}
                className={cn(
                  "btn-secondary h-10 w-10 px-0",
                  page === 1 && "pointer-events-none opacity-40",
                )}
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Link
                  key={i}
                  href={buildPageUrl(i + 1)}
                  className={cn(
                    "h-10 w-10 rounded-full text-sm font-medium transition",
                    page === i + 1
                      ? "bg-blush-600 text-white"
                      : "text-ink-600 hover:bg-ink-100",
                  )}
                  aria-label={`Trang ${i + 1}`}
                  aria-current={page === i + 1 ? "page" : undefined}
                >
                  {i + 1}
                </Link>
              ))}
              <Link
                href={buildPageUrl(Math.min(totalPages, page + 1))}
                className={cn(
                  "btn-secondary h-10 w-10 px-0",
                  page === totalPages && "pointer-events-none opacity-40",
                )}
                aria-label="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
