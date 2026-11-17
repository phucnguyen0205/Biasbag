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
 */
const FONT_PRELOADS = [
  {
    href: "/fonts/inter-variable.woff2",
    type: "font/woff2",
    crossOrigin: "anonymous",
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
    icon: [
      { url: SITE.logo, type: "image/webp", sizes: "256x161" },
    ],
    apple: [{ url: SITE.logoOg, type: "image/png", sizes: "512x323" }],
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
          />
        ))}
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
