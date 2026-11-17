import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Titan_One } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";
import Header from "@/components/layout/header";
import { HeaderOffset } from "@/components/layout/header-offset";
import Footer from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["vietnamese", "latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["vietnamese", "latin"],
  variable: "--font-playfair",
});
// Display font dạng chữ đậm/bo tròn, khớp với wordmark trong logo BIAS BAG
// (Titan One chỉ có subset latin — dùng cho wordmark "Bias Bag")
const titanOne = Titan_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-brand",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://biasbag.vn",
  ),
  title: {
    default: `${SITE.name} — ${SITE.slogan}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  generator: "Next.js",
  icons: {
    icon: [
      { url: SITE.logo, type: "image/png", sizes: "256x161" },
    ],
    apple: [{ url: SITE.logoOg, type: "image/png", sizes: "512x323" }],
  },
  keywords: [
    "túi xách",
    "túi xách nữ",
    "túi tote",
    "balo laptop",
    "túi đeo vai",
    "phụ kiện thời trang",
    "mua túi xách giá rẻ",
  ],
  openGraph: {
    title: `${SITE.name} — ${SITE.slogan}`,
    description: SITE.description,
    type: "website",
    locale: "vi_VN",
    siteName: SITE.name,
    images: [{ url: SITE.logoOg, width: 512, height: 323, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.slogan}`,
    description: SITE.description,
    images: [SITE.logoOg],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, address: true, email: true },
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
    <html lang="vi" className={`${inter.variable} ${playfair.variable} ${titanOne.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <HeaderOffset />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
