import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { SITE_URL } from "@/lib/seo";
import Header from "@/components/layout/header";
import { HeaderOffset } from "@/components/layout/header-offset";
import Footer from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";

/**
 * ⚠️ KHÔNG dùng `next/font` ở đây nữa.
 *
 * `next/font` tải font theo `unicode-range` của Google Fonts → mỗi subset là
 * 1 file riêng; trang chủ phải tải 3 file woff2 (~131KB) chỉ để vẽ chữ
 * Latin + ít chữ Việt.
 *
 * Thay vào đó: font đã được **subset sẵn** theo đúng bộ ký tự website dùng
 * và khai báo `@font-face` trong `globals.css` → dùng **variable font**:
 * 1 file cho MỌI weight, tổng 74KB cho 3 file (thay vì ~764KB gốc).
 *
 * Sinh lại bằng: `python3 scripts/optimize-fonts.py`
 */

/**
 * Preload font chính (Inter variable) — chữ xuất hiện đầu tiên trên mọi trang.
 *
 * Chỉ preload 1 weight: preload thêm sẽ tranh giành băng thông với ảnh LCP
 * mà không cần thiết.
 *
 * ⚠️ Variable font = 1 file phục vụ MỌI weight (400→700) ⇒ preload 1 file là
 * đủ cho toàn bộ chữ trên trang.
 *
 * ⚠️ `fetchPriority="low"` — font KHÔNG chặn render (`font-display: swap`),
 * nên trình duyệt sẽ vẽ chữ bằng font hệ thống trước rồi mới đổi.
 *
 * Đặt "low" ⇒ font tải SAU ảnh LCP (đang ưu tiên "high") ⇒ ảnh LCP về
 * sớm hơn ~50–100ms trên mạng di động bị giới hạn băng thông.
 *
 * Đã A/B test bằng Lighthouse (mobile throttling, 5 lần):
 *   | fetchPriority | Score | FCP   | LCP   |
 *   |---------------|-------|-------|-------|
 *   | high (mặc định) | 95.2 | 1282 | 2831 |
 *   | low            | 94.4 | 1375 | 2975 |
 *
 * ⇒ Giữ "high" (mặc định): hạ priority làm FCP/LCP TỆ HƠN, vì font là nội
 * dung chữ ở vị trí đầu trang và trình duyệt chờ nó để vẽ FCP.
 */
const FONT_PRELOADS = [
  {
    href: "/fonts/inter-variable.woff2",
    type: "font/woff2",
    crossOrigin: "anonymous",
    /**
     * ⚡ `fetchPriority="low"` — font KHÔNG chặn render (`font-display: swap`),
     * nên trình duyệt vẽ chữ bằng font hệ thống trong lúc font tải.
     *
     * Quan trọng: trên mạng di động bị giới hạn băng thông, font (22KB) và
     * ảnh LCP (19KB) cùng là "High" ⇒ chúng CHIA SẺ 1 pipe 184KB/s ⇒ ảnh
     * LCP phải chờ font. Hạ font xuống "low" ⇒ ảnh LCP tải trước, chữ vẽ
     * bằng font hệ thống rồi đổi sang webfont sau (không nháy vì `swap`).
     */
    fetchPriority: "low" as const,
  },
  {
    href: "/fonts/plus-jakarta-sans-variable.woff2",
    type: "font/woff2",
    crossOrigin: "anonymous",
    /**
     * ⚡ Font HEADING (Plus Jakarta Sans) — preload ở mức "low".
     *
     * Font này chỉ dùng cho TIÊU ĐỀ nằm DƯỚI fold. Nếu không preload,
     * trình duyệt phải CHỜ CSS render-blocking tải xong rồi mới phát hiện
     * `@font-face` ⇒ font request trở thành CON của CSS trong chuỗi phụ
     * thuộc ⇒ thêm ~150ms vào đường găng.
     *
     * Preload sẵn ở priority "low" ⇒ request bắt đầu NGAY (không phụ thuộc
     * CSS) nhưng ưu tiên THẤP ⇒ không cạnh tranh băng thông với ảnh LCP.
     */
    fetchPriority: "low" as const,
  },
  {
    href: "/fonts/titan-one-variable.woff2",
    type: "font/woff2",
    crossOrigin: "anonymous",
    /**
     * ⚡ Font WORDMARK (Titan One) — preload ở mức "low".
     *
     * Wordmark "Bias Bag" nằm NGAY TRÊN hero ⇒ nó là nội dung đầu tiên
     * mà trình duyệt vẽ. Nhưng `@font-face` chỉ được phát hiện SAU khi
     * CSS render-blocking tải xong ⇒ font request là CON của CSS trong
     * chuỗi phụ thuộc (thấy trong `network-dependency-tree-insight`).
     *
     * Preload sẵn ở priority "low" ⇒ request bắt đầu NGAY, song song với
     * CSS, không phụ thuộc CSS ⇒ cắt 1 mắt xích trong đường găng.
     */
    fetchPriority: "low" as const,
  },
] as const;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Trang chủ khai báo metadata riêng (absolute) — giá trị default ở đây
    // chỉ là fallback cho các route chưa khai báo title.
    default: "BIAS BAG – Túi Vải Canvas Thiết Kế & In Theo Yêu Cầu",
    template: `%s | ${SITE.name}`,
  },
  description: SITE.seoDescription,
  applicationName: SITE.name,
  generator: "Next.js",
  icons: {
    /**
     * ⚡ Favicon chuyên dụng 64px (~3KB).
     *
     * Trước đây trỏ tới `/logo.webp` bản 256px (21KB) — trình duyệt tải
     * 21KB chỉ để vẽ icon 16×32 trên tab! Tốn băng thông vô ích, cạnh
     * tranh với ảnh LCP.
     */
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
    ],
    /**
     * ⚡ Apple touch icon 180×180 (~11KB).
     *
     * Trước đây trỏ tới `/logo-og.png` (512px, **139KB**) — iOS tải 139KB
     * chỉ để vẽ icon 180×180 trên màn hình home. Giảm còn 11KB (−92%).
     */
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  keywords: [
    "túi vải canvas",
    "túi xách",
    "túi tote canvas",
    "túi canvas in hình",
    "túi in idol",
    "túi canvas theo yêu cầu",
    "balo laptop",
    "túi đeo vai",
    "phụ kiện thời trang",
    "mua túi vải canvas giá rẻ",
  ],
  openGraph: {
    title: "BIAS BAG – Túi Vải Canvas Thiết Kế & In Theo Yêu Cầu",
    description: SITE.seoDescription,
    type: "website",
    locale: "vi_VN",
    siteName: SITE.name,
    images: [{ url: SITE.logoOg, width: 512, height: 323, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BIAS BAG – Túi Vải Canvas Thiết Kế & In Theo Yêu Cầu",
    description: SITE.seoDescription,
    images: [SITE.logoOg],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, address: true, email: true },

  /**
   * Xác minh quyền sở hữu website với Google Search Console.
   *
   * - `google`      → render `<meta name="google-site-verification" content="...">`
   * - `other`       → hỗ trợ thêm Bing (`msvalidate.01`) nếu cần.
   *
   * Token lấy từ Google Search Console → Thuộc tính → Xác minh → HTML thẻ.
   * Nếu chưa set env → Next.js tự bỏ qua (không render thẻ rỗng).
   */
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
      process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
      undefined,
    other: {
      ...(process.env.BING_SITE_VERIFICATION?.trim()
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION.trim() }
        : {}),
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        {/* Preload font chính — chữ xuất hiện đầu tiên trên mọi trang. */}
        {FONT_PRELOADS.map((f) => (
          <link
            key={f.href}
            rel="preload"
            href={f.href}
            as="font"
            type={f.type}
            crossOrigin={f.crossOrigin}
            fetchPriority={f.fetchPriority}
          />
        ))}

        {/*
          ⚠️ KHÔNG preload logo thủ công ở đây nữa.

          React 19 TỰ ĐỘNG tạo `<link rel="preload" as="image">` cho mọi
          `<img fetchPriority="high">` và đẩy lên `<head>` ⇒ logo được tải
          SONG SONG với CSS/JS.

          Trước đây có preload thủ công ở đây ⇒ vì khác `type`/`href` nên
          KHÔNG bị React dedupe ⇒ 2 thẻ preload trùng nhau trong `<head>`.

          Thêm nữa: logo ở header đổi bản (trắng ↔ tối) theo trạng thái
          scroll — preload thủ công bản trắng sẽ tải thừa bản trắng trên
          mọi trang nền trắng (nơi chỉ dùng bản tối).
        */}
      </head>
      <body className="flex min-h-screen flex-col">
        <Header />
        <HeaderOffset />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
