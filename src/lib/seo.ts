import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

/**
 * Cấu hình SEO cho các trang công khai.
 *
 * Mỗi trang có:
 *   - `title`       — tiêu đề hiển thị trên Google (KHÔNG thêm hậu tố,
 *                     dùng `title.absolute` để tránh lặp " | BIAS BAG").
 *   - `description` — thẻ mô tả (meta description) hiển thị dưới tiêu đề
 *                     trong kết quả tìm kiếm. Google cắt còn ~155–160 ký tự.
 *   - `keywords`    — từ khoá chính, phụ trợ cho long-tail.
 *   - `path`        — đường dẫn dùng cho canonical + OG url.
 *
 * Dùng `buildPageMetadata()` để sinh `Metadata` đầy đủ (canonical, OG,
 * Twitter card, robots) từ cấu hình — tránh mỗi trang tự viết lại.
 */

/**
 * URL gốc của website (dùng cho canonical + Open Graph).
 *
 * Ưu tiên `NEXT_PUBLIC_SITE_URL`. Fallback là domain production thật —
 * nếu để nhầm domain khác thì canonical/sitemap/JSON-LD sẽ trỏ sai và
 * Google sẽ lập chỉ mục trùng lặp.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://biasbag.shop"
).replace(/\/+$/, "");

/** Cấu hình SEO từng trang. */
export const PAGE_SEO = {
  home: {
    title: "BIAS BAG – Túi Vải Canvas Thiết Kế & In Theo Yêu Cầu",
    description:
      "Khám phá bộ sưu tập túi vải canvas BIAS BAG độc đáo, chất vải dày dặn, nhận in hình cá nhân & idol theo yêu cầu. Đặt hàng dễ dàng, giao nhanh toàn quốc.",
    path: "/",
    keywords: [
      "túi vải canvas",
      "túi tote canvas",
      "túi canvas in hình",
      "túi in idol",
      "túi canvas theo yêu cầu",
      "túi xách canvas giá rẻ",
      "mua túi tote canvas",
    ],
  },
  about: {
    title: "Về Chúng Tôi – Câu Chuyện Thương Hiệu BIAS BAG",
    description:
      "Tìm hiểu hành trình của BIAS BAG – thương hiệu chuyên túi vải canvas dày dặn, thiết kế độc bản và nhận in hình cá nhân, idol sắc nét, giao hàng nhanh.",
    path: "/about",
    keywords: [
      "về BIAS BAG",
      "câu chuyện thương hiệu",
      "thương hiệu túi canvas",
      "túi vải canvas dày dặn",
      "in hình cá nhân theo yêu cầu",
      "đối tác in hình idol",
    ],
  },
  products: {
    title: "Cửa Hàng BIAS BAG - Túi Tote Canvas Đẹp, Giá Tốt",
    description:
      "Xem ngay bộ sưu tập túi vải canvas mới nhất tại BIAS BAG. Đa dạng mẫu mã từ tối giản đến in hình cá nhân, idol sắc nét. Đặt hàng online, giao nhanh.",
    path: "/products",
    keywords: [
      "cửa hàng BIAS BAG",
      "túi tote canvas đẹp",
      "túi canvas giá tốt",
      "mua túi vải canvas online",
      "túi tote in hình idol",
      "túi canvas tối giản",
      "túi canvas Y2K",
    ],
  },
  blog: {
    title: "Blog & Tin Tức - BIAS BAG | Xu Hướng Túi Canvas & Phối Đồ",
    description:
      "Cập nhật xu hướng phối đồ với túi tote canvas, cách giặt và bảo quản túi vải bền đẹp cùng các bộ sưu tập thiết kế mới nhất từ thương hiệu BIAS BAG.",
    path: "/blog",
    keywords: [
      "blog túi canvas",
      "xu hướng túi tote",
      "cách bảo quản túi canvas",
      "cách giặt túi vải",
      "phối đồ với túi tote",
      "mẹo chọn túi canvas",
    ],
  },
  contact: {
    title: "Thông Tin Liên Hệ BIAS BAG - Túi Vải Canvas Thời Trang",
    description:
      "Liên hệ ngay với BIAS BAG để được tư vấn mẫu túi vải canvas, báo giá in hình theo yêu cầu và hỗ trợ đơn hàng nhanh chóng qua Hotline, Zalo hoặc Fanpage.",
    path: "/contact",
    keywords: [
      "liên hệ BIAS BAG",
      "tư vấn túi vải canvas",
      "báo giá in hình theo yêu cầu",
      "hotline BIAS BAG",
      "mua túi canvas sỉ lẻ",
      "hỗ trợ đơn hàng",
    ],
  },
} as const satisfies Record<
  string,
  { title: string; description: string; path: string; keywords: readonly string[] }
>;

export type PageSeoKey = keyof typeof PAGE_SEO;

/**
 * Sinh `Metadata` chuẩn SEO từ cấu hình trong `PAGE_SEO`.
 *
 * - `title.absolute` — không dùng template `%s | BIAS BAG` của root layout,
 *   vì tiêu đề đã chứa sẵn tên thương hiệu → tránh bị lặp "BIAS BAG".
 * - `alternates.canonical` — chống trùng lặp nội dung (Google ưu tiên URL chuẩn).
 * - `openGraph` + `twitter` — hiển thị đẹp khi share Facebook/Zalo/Twitter.
 */
export function buildPageMetadata(
  key: PageSeoKey,
  overrides?: Partial<Metadata>,
): Metadata {
  const seo = PAGE_SEO[key];
  const url = `${SITE_URL}${seo.path}`;

  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: [...seo.keywords],
    alternates: { canonical: url },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
      images: [{ url: SITE.logoOg, width: 512, height: 323, alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [SITE.logoOg],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    ...overrides,
  };
}
