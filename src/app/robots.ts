import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const BASE_URL = SITE_URL;

/**
 * `robots.txt` — chỉ dẫn cho crawler của Google/Bing.
 *
 * Lưu ý: `Disallow` KHÔNG ngăn chặn lập chỉ mục, chỉ ngăn crawler đọc
 * trang. Với các trang nhạy cảm (tài khoản, giỏ hàng) ta thêm `noindex`
 * ở cấp metadata của trang đó → vẫn an toàn nếu Google đã lỡ vào index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/login",
          "/account",
          "/cart",
          "/checkout",
          "/checkout/",
          "/orders",
          "/orders/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
