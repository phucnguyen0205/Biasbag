import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, Titan_One } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { SITE_URL } from "@/lib/seo";
import Header from "@/components/layout/header";
import { HeaderOffset } from "@/components/layout/header-offset";
import Footer from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["vietnamese", "latin"], variable: "--font-inter" });
// Display font: sans-serif hiện đại (bo tròn, mềm) — khớp tinh thần
// "phụ kiện nhỏ, phong cách riêng" và tránh mọi fallback serif (Times New Roman).
const jakarta = Plus_Jakarta_Sans({
  subsets: ["vietnamese", "latin"],
  variable: "--font-jakarta",
});
// Display font dạng chữ đậm/bo tròn, khớp với wordmark trong logo BIAS BAG
// (Titan One chỉ có subset latin — dùng cho wordmark "Bias Bag")
const titanOne = Titan_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brand",
});

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
      { url: SITE.logo, type: "image/png", sizes: "256x161" },
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
    <html
      lang="vi"
      className={`${inter.variable} ${jakarta.variable} ${titanOne.variable}`}
    >
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
