import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MessageCircle,
  Package,
  Palette,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  RefreshCw,
} from "lucide-react";
import {
  getCategories,
  getFeaturedProducts,
  getHomeShowcase,
} from "@/lib/data/products";
import { getBanners } from "@/lib/data/banners";
import ProductCard from "@/components/product/product-card";
import HeroCarousel from "@/components/home/hero-carousel";
import { SITE, STYLE_LINES, CHANNELS } from "@/lib/constants";
import { buildPageMetadata } from "@/lib/seo";
import { finalPrice, formatPrice } from "@/lib/utils";

/**
 * ISR — trang chủ được cache lại mỗi 5 phút.
 *
 * Kết hợp với việc dùng Supabase client KHÔNG cookie (`createPublicClient`),
 * trang chủ render hoàn toàn ở server và được phục vụ từ cache → TTFB
 * gần như tức thì, độc lập với độ trễ database.
 *
 * Khi admin sửa sản phẩm/banner, Server Action gọi `revalidatePath("/")` để
 * xoá cache ngay lập tức.
 */
export const revalidate = 300;

/** SEO trang chủ — tiêu đề + thẻ mô tả hiển thị trên Google. */
export const metadata: Metadata = buildPageMetadata("home");

const HIGHLIGHTS = [
  {
    icon: Sparkles,
    title: "Túi Tote Canvas In Hình",
    desc: "Dòng sản phẩm chủ lực của BIAS BAG: túi tote canvas in hình, mỗi mẫu là một câu chuyện bạn muốn khoe.",
  },
  {
    icon: Palette,
    title: "Năm Chủ Đề In",
    desc: "K-Pop, logo thương hiệu, địa điểm Việt Nam, tối giản và Y2K — đủ chủ đề để bạn tìm được mẫu hợp với phong cách riêng.",
  },
  {
    icon: Tag,
    title: "Thương Hiệu Của Bạn",
    desc: "Từ túi in logo, câu slogan đến mẫu thiết kế riêng — BIAS BAG giúp bạn mang thương hiệu của mình đi khắp nơi.",
  },
  {
    icon: Package,
    title: "Chất Liệu Bền, Dễ Phối",
    desc: "Canvas dày, quai chắc, form rộng để đựng laptop, sách và đồ cá nhân — một chiếc túi đi cả ngày.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Chọn phong cách",
    desc: "Tối giản, thanh lịch, trẻ trung hay năng động — bắt đầu từ dòng sản phẩm bạn thích.",
  },
  {
    step: "02",
    title: "Đặt hàng nhanh chóng",
    desc: "Đặt trực tuyến trên website, Shopee hoặc Facebook. Thanh toán linh hoạt.",
  },
  {
    step: "03",
    title: "Nhận và phối đồ",
    desc: "Đóng gói cẩn thận, giao toàn quốc. Tư vấn và hỗ trợ trọn vẹn sau khi mua.",
  },
];

const TRUST = [
  {
    icon: Truck,
    title: "Giao hàng 2–5 ngày",
    desc: "Miễn phí vận chuyển cho đơn từ 300.000đ",
  },
  {
    icon: RefreshCw,
    title: "Đổi trả trong 30 ngày",
    desc: "Hoàn tiền nhanh chóng trong 3–5 ngày làm việc",
  },
];

export default async function HomePage() {
  // 3 nguồn dữ liệu độc lập → fetch SONG SONG (Promise.all) để không
  // tạo waterfall. Mỗi nguồn đều là truy vấn public, không cần session.
  const [categories, featured, banners, showcase] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
    getBanners(),
    getHomeShowcase(3),
  ]);

  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://biasbag.vn";

  /**
   * Preload ảnh LCP (ảnh hero đầu tiên).
   *
   * Chỉ áp dụng được cho ảnh banner NỘI BỘ (`/banners/banner-N.webp`) vì đó là
   * ảnh đã có sẵn bộ responsive đứng yên (`banner-N-<w>.webp`). Ảnh admin
   * upload lên Supabase Storage không có bản pre-resize → không preload được
   * (vẫn được `fetchPriority="high"` trong `<img>`).
   *
   * ⚠️ `href` PHẢI trùng với ứng viên trong `imageSrcSet` — nếu không,
   * trình duyệt có thể tải CẢ `href` LẪN bản chọn từ `srcset` ⇒ tải trùng.
   * Ở đây `href` = bản 750w (ứng viên phổ biến nhất trên mobile) và
   * `imageSrcSet` có đủ các mốc ⇒ trình duyệt chỉ tải MỘT file.
   */
  const lcpPreload = (() => {
    const first = banners[0];
    if (!first?.image_url?.startsWith("/banners/banner-")) return null;
    const b = first.image_url.replace(/\.webp$/, "");
    return {
      /**
       * Định dạng ưu tiên: AVIF nhỏ hơn WebP ~20–30% ⇒ LCP nhanh hơn.
       */
      type: "image/avif",
      /**
       * ⚠️ `href` PHẢI là ứng viên HỢP LỆ trong `imageSrcSet` — nếu trỏ tới
       * bản không có trong srcset, trình duyệt có thể tải THÊM 1 file riêng
       * ⇒ tải trùng, mất băng thông.
       */
      href: `${b}-750.avif`,
      srcSet:
        `${b}-640.avif 640w, ${b}-750.avif 750w, ${b}-1080.avif 1080w, ` +
        `${b}-1200.avif 1200w, ${b}-1920.avif 1920w`,
    };
  })();

  // --- JSON-LD: Organization + WebSite ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: SITE.name,
        url: BASE_URL,
        logo: `${BASE_URL}${SITE.logoOg}`,
        image: `${BASE_URL}${SITE.logoOg}`,
        description: SITE.seoDescription,
        email: SITE.email,
        telephone: SITE.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: SITE.address,
          addressCountry: "VN",
        },
        sameAs: [SITE.social.facebook, SITE.social.shopee],
      },
      {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: SITE.name,
        description: SITE.seoDescription,
        inLanguage: "vi-VN",
        publisher: { "@id": `${BASE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/products?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ⚡ PRELOAD ẢNH LCP — tối ưu LCP.
          Ảnh hero là phần tử LCP của trang chủ. `<link rel="preload" as="image">`
          với `imageSrcSet`/`imageSizes` bảo trình duyệt bắt đầu tải ảnh NGAY
          khi phát hiện thẻ — trước cả khi CSS và JS tải xong.

          Không có preload, trình duyệt phải: tải HTML → tải CSS
          (render-blocking) → phân tích DOM → mới tải ảnh. Với preload, bước
          cuối rút ngắn còn gần như 0 ⇒ LCP giảm rõ.

          Ảnh phục vụ dạng STATIC responsive (`banner-N-<w>.webp`) nên preload
          cũng dùng `imageSrcSet` để trình duyệt chọn đúng bản theo màn hình
          (tránh tải bản 1920px cho mobile).

          ⚠️ Chỉ preload ẢNH ĐẦU TIÊN — preload nhiều ảnh sẽ tranh giành băng
          thông với chính ảnh LCP và làm LCP chậm hơn. */}
      {lcpPreload && (
        <link
          rel="preload"
          as="image"
          href={lcpPreload.href}
          imageSrcSet={lcpPreload.srcSet}
          imageSizes="100vw"
          type={lcpPreload.type}
          fetchPriority="high"
        />
      )}

      {/* ── Hero ───────────────────────────────────────────────────────────
          Banner nền dạng carousel. Lớp overlay giữ wordmark + tagline +
          mô tả + CTA.
          Ảnh hero đầu tiên được preload (fetchPriority=high + <link rel=
          "preload">) để LCP vẽ ngay khi HTML tới trình duyệt. */}
      <HeroCarousel banners={banners}>
        <div className="max-w-2xl">
          <h1 className="font-script text-5xl font-normal leading-none tracking-wide text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.75)] sm:text-7xl">
            Bias Bag
          </h1>
          <p className="mt-4 font-sans text-[11px] font-semibold uppercase leading-snug tracking-[0.22em] text-blush-400 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-sm">
            Phụ kiện nhỏ, phong cách riêng
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:text-lg">
            BIAS BAG chuyên kinh doanh và phân phối túi xách với mẫu mã đa dạng,
            thiết kế hiện đại — dành cho học sinh, sinh viên và người trẻ đang tìm
            kiếm phụ kiện thể hiện cá tính.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              prefetch={false}
              className="btn bg-white px-6 py-3 text-ink-900 hover:bg-blush-50"
            >
              Khám phá sản phẩm
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              /**
               * ⚡ Tắt prefetch: `/about` là route TĨNH (ISR) ⇒ Next.js tải
               * TOÀN BỘ RSC payload của trang đó (~11KB) ngay khi trang chủ
               * vừa tải. Tốn băng thông và tranh giành với ảnh LCP.
               *
               * Người dùng bấm "Về chúng tôi" sau khi đã đọc hero → vẫn điều
               * hướng nhanh, chỉ mất thêm 1 round-trip RSC nhỏ lúc bấm.
               */
              prefetch={false}
              className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10"
            >
              Về chúng tôi
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink-200">
            <span>Bán lẻ trực tuyến</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:inline-block" />
            <span>Đổi mẫu hằng tuần</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:inline-block" />
            <span>Giao toàn quốc</span>
          </div>
        </div>
      </HeroCarousel>

      {/* ── Cam kết (thay cho 4 card highlight cũ, gọn và đồng bộ hơn) ─── */}
      <section className="container-page relative z-10 -mt-8">
        <div className="grid gap-3 rounded-3xl border border-blush-100 bg-white/95 p-4 shadow-[0_20px_50px_-30px_rgba(143,74,57,0.4)] backdrop-blur sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          {HIGHLIGHTS.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl p-4 transition-colors hover:bg-blush-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blush-100 text-blush-600 transition-colors group-hover:bg-blush-200">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink-900">
                {p.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dòng sản phẩm ────────────────────────────────────────────────
          `content-visibility: auto` cho phép trình duyệt BỎ QUA việc dựng
          layout/paint cho section nằm ngoài viewport → giảm đáng kể thời gian
          render ban đầu (Render Delay của LCP) mà không ảnh hưởng nội dung. */}
      <section className="container-page py-20 sm:py-24 [content-visibility:auto] [contain-intrinsic-size:auto_800px]">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Dòng sản phẩm</p>
            <h2 className="section-title mt-3">
              Năm chủ đề in, một thương hiệu
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              BIAS BAG phát triển các dòng túi tote canvas in hình theo nhiều chủ
              đề khác nhau, phù hợp với nhiều đối tượng khách hàng — đặc biệt là
              học sinh, sinh viên và người trẻ.
            </p>
          </div>
          <Link
            href="/products"
            className="btn-secondary shrink-0 self-start sm:self-auto"
          >
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {categories.map((c, i) => {
                const line = STYLE_LINES.find((l) => l.slug === c.slug);
                // Sản phẩm THẬT của chủ đề này (thay cho mockup cố định).
                const items = showcase[c.slug] ?? [];
                const lead = items[0];
                return (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}`}
                    className="reveal group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]"
                    style={{ animationRange: `entry 0% entry ${30 + i * 6}%` }}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-blush-50">
                      {lead?.image_url ? (
                        <Image
                          src={lead.image_url}
                          alt={lead.name}
                          fill
                          /**
                           * ⚡ `sizes` phải KHỚP với kích thước hiển thị
                           * thực tế, nếu không trình duyệt tải bản lớn hơn
                           * cần thiết.
                           *
                           * Ô chủ đề nằm trong grid 5 cột (xl) → mỗi ô rộng
                           * ~250px. Trước đây khai báo `20vw` ⇒ trên mobile
                           * (390px) trình duyệt tính 20vw = 78px nhưng lại
                           * chọn bản 750w (vì ảnh gốc chỉ có sẵn 1 kích
                           * thước) ⇒ 17KB cho ảnh hiển thị 78px.
                           *
                           * `sizes` chính xác + `quality` vừa đủ ⇒ giảm
                           * ~50% byte cho ảnh dưới fold.
                           */
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 30vw, 250px"
                          quality={65}
                          loading="lazy"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                        />
                      ) : c.image_url ? (
                        // Chưa có sản phẩm nào trong danh mục → dùng ảnh danh mục.
                        <Image
                          src={c.image_url}
                          alt={c.name}
                          fill
                          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1280px) 30vw, 250px"
                          quality={65}
                          loading="lazy"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-ink-400">
                          {c.name}
                        </div>
                      )}
                      <span className="absolute left-3 top-3 badge bg-white/90 text-ink-800 backdrop-blur">
                        0{i + 1}
                      </span>
                      {items.length > 1 && (
                        <span className="absolute right-3 top-3 badge bg-ink-900/80 text-white backdrop-blur">
                          {items.length} mẫu
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-base font-semibold text-ink-900">
                        {c.name}
                      </h3>
                      {line && (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blush-600">
                          {line.tagline}
                        </p>
                      )}

                      {/* Danh sách sản phẩm thật trong chủ đề: tên + giá. */}
                      {items.length > 0 ? (
                        <ul className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                          {items.map((p) => (
                            <li
                              key={p.id}
                              className="flex items-start gap-2 text-xs text-ink-600"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blush-400" />
                              <span className="line-clamp-1 flex-1">{p.name}</span>
                              <span className="shrink-0 font-medium text-ink-900">
                                {formatPrice(
                                  finalPrice(p.price, p.sale_price),
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2.5 line-clamp-2 text-sm text-ink-600">
                          {c.description}
                        </p>
                      )}

                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink-900">
                        Xem dòng sản phẩm
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
      </section>

      {/* ── Sản phẩm nổi bật ───────────────────────────────────────────── */}
      {featured.length > 0 && (
        /**
         * ⚡ `content-visibility: auto` — trình duyệt BỎ QUA việc dựng
         * layout/paint cho section nằm ngoài viewport ⇒ giảm thời gian render
         * ban đầu (Render Delay của LCP) mà không ảnh hưởng nội dung.
         *
         * `contain-intrinsic-size` cấp sẵn chiều cao ước tính để thanh
         * cuộn không nhảy khi section được render (giữ CLS = 0).
         */
        <section className="border-y border-ink-100 bg-blush-50/60 py-20 [content-visibility:auto] [contain-intrinsic-size:auto_900px] sm:py-24">
          <div className="container-page">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Tuyển chọn từ dòng sản phẩm</p>
                <h2 className="section-title mt-3">
                  Mẫu mã nổi bật của BIAS BAG
                </h2>
              </div>
              <Link
                href="/products"
                className="btn-secondary shrink-0 self-start sm:self-auto"
              >
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                // KHÔNG đặt `priority` ở đây: sản phẩm nổi bật nằm BENEATH
                // hero + cam kết + dòng sản phẩm → nằm ngoài viewport.
                // Preload chúng sẽ giành băng thông với ảnh hero (phần tử
                // LCP) và làm LCP chậm hơn. `loading="lazy"` (mặc định) là
                // lựa chọn đúng cho ảnh dưới fold.
                <div key={p.id} className="reveal">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Cách mua ────────────────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-24 [content-visibility:auto] [contain-intrinsic-size:auto_600px]">
        <div className="mb-12 max-w-2xl">
          <p className="eyebrow">Trải nghiệm mua sắm</p>
          <h2 className="section-title mt-3">Mua sắm dễ dàng</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.step}
              className="reveal border-t border-blush-200 pt-6"
              style={{ animationRange: `entry 0% entry ${30 + i * 6}%` }}
            >
              <span className="font-display text-3xl font-bold text-blush-400">
                {s.step}
              </span>
              <h3 className="mt-3 text-base font-semibold text-ink-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {TRUST.map((t, i) => (
            <div
              key={t.title}
              className="reveal flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5"
              style={{ animationRange: `entry 0% entry ${30 + i * 8}%` }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush-100 text-blush-600">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                <p className="mt-0.5 text-xs text-ink-500">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Kênh bán hàng ──────────────────────────────────────────────── */}
      <section className="border-t border-ink-100 bg-blush-50/60 py-20 sm:py-24 [content-visibility:auto] [contain-intrinsic-size:auto_700px]">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">Hình thức kinh doanh</p>
              <h2 className="section-title mt-3">
                Mua ở đâu cũng được — chúng tôi ở khắp nơi bạn có mặt
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-600">
                BIAS BAG là thương hiệu chuyên kinh doanh túi xách thời trang
                theo hình thức bán lẻ trực tuyến, phân phối qua các nền tảng
                thương mại điện tử và mạng xã hội. Nhờ đó, chúng tôi tiếp cận
                khách hàng trên phạm vi rộng, tiết kiệm chi phí mặt bằng và
                mang đến trải nghiệm tư vấn, hỗ trợ thuận tiện hơn.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={SITE.social.shopee}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent px-6 py-3"
                >
                  Mua trên Shopee
                </a>
                <a
                  href={SITE.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-6 py-3"
                >
                  Nhắn Facebook
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {CHANNELS.map((c, i) => (
                <a
                  key={c.name}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="reveal rounded-2xl border border-ink-100 bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]"
                  style={{ animationRange: `entry 0% entry ${30 + i * 6}%` }}
                >
                  <div className="flex items-center gap-2">
                    {c.name === "Website chính thức" ? (
                      <Package className="h-4 w-4 text-blush-600" />
                    ) : c.name === "Facebook" ? (
                      <MessageCircle className="h-4 w-4 text-blush-600" />
                    ) : (
                      <ShoppingBag className="h-4 w-4 text-blush-600" />
                    )}
                    <h3 className="text-sm font-semibold text-ink-900">
                      {c.name}
                    </h3>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
                    {c.desc}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-24 [content-visibility:auto] [contain-intrinsic-size:auto_400px]">
        <div className="flex flex-col items-start gap-6 rounded-3xl border border-blush-200 bg-gradient-to-br from-blush-50 via-white to-blush-100 p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Cần tư vấn chọn túi?</h2>
            <p className="mt-2 max-w-lg text-sm text-ink-600">
              Đội ngũ BIAS BAG sẽ gợi ý mẫu phù hợp với phong cách và nhu cầu sử
              dụng hằng ngày của bạn.
            </p>
          </div>
          <a
            href={`tel:${SITE.phone.replace(/\s/g, "")}`}
            className="btn-accent px-6 py-3"
          >
            Gọi ngay {SITE.phone}
          </a>
        </div>
      </section>
    </>
  );
}
