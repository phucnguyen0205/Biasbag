import type { NextConfig } from "next";

/**
 * Host ảnh được phép tải qua Next.js Image Optimizer.
 *
 * Ảnh bài viết lưu trong Supabase Storage (admin upload) → đã được cho
 * phép sẵn bởi pattern `**.supabase.co`.
 *
 * Ngoài ra có thể cho phép thêm host tuỳ chỉnh qua biến môi trường
 * `IMAGE_REMOTE_HOSTS` (danh sách host, phân tách bằng dấu phẩy) — dùng khi
 * dán URL ảnh từ nguồn ngoài vào bài viết.
 */
function customRemoteHosts(): {
  protocol: "https";
  hostname: string;
  pathname: "/**";
}[] {
  const hosts = new Set<string>();

  for (const h of (process.env.IMAGE_REMOTE_HOSTS ?? "").split(",")) {
    const host = h.trim();
    if (host) hosts.add(host);
  }

  return [...hosts].map((hostname) => ({
    protocol: "https" as const,
    hostname,
    pathname: "/**" as const,
  }));
}

const nextConfig: NextConfig = {
  images: {
    /**
     * Định dạng ảnh trả về, theo thứ tự ưu tiên.
     *
     * AVIF nhỏ hơn WebP ~25–35% ở cùng chất lượng thị giác → ảnh hero tải
     * nhanh hơn → LCP (Largest Contentful Paint) giảm trực tiếp. Trình
     * duyệt không hỗ trợ AVIF sẽ tự fallback về WebP (Next.js kiểm tra header
     * `Accept`).
     */
    formats: ["image/avif", "image/webp"],

    /**
     * Allowlist chất lượng.
     *
     * Next.js 15.5+ chỉ cho phép dùng `quality` nằm trong danh sách này —
     * mọi giá trị ngoài sẽ trả về 400. Khai báo trước để `quality` tùy chỉnh
     * ở từng chỗ không làm hỏng request ảnh.
     */
    qualities: [55, 60, 65, 70, 72, 75, 80, 85, 90],

    /**
     * Kích thước ảnh phục vụ theo device.
     *
     * Bỏ bớt các mốc không dùng (828, 2048, 3840) và thêm 1536 (rất phổ
     * biến trên laptop 1440–1600px) → `srcset` ngắn hơn ⇒ trình duyệt chọn
     * được ảnh gần đúng kích thước hiển thị, ít dư lượng tải vô ích.
     */
    deviceSizes: [640, 750, 1080, 1200, 1536, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],

    /**
     * Cache ảnh đã tối ưu trên disk tối đa 30 ngày.
     *
     * Mặc định của Next.js là 60 giây → mỗi lượt truy cập lại tính lại ảnh
     * (CPU + độ trễ). Ảnh sản phẩm của shop hầu như không đổi nên cache
     * dài giúp TTFB của request ảnh gần như tức thì.
     */
    minimumCacheTTL: 60 * 60 * 24 * 30,

    remotePatterns: [
      // Supabase Storage — ảnh sản phẩm & ảnh bài viết do admin upload
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/**" },
      // Ảnh mẫu
      { protocol: "https", hostname: "images.unsplash.com" },
      // Host tuỳ chỉnh (IMAGE_REMOTE_HOSTS) — khi dán URL ảnh ngoài vào bài viết
      ...customRemoteHosts(),
    ],
  },

  /**
   * Giảm JS gửi xuống client.
   *
   * `swcMinify` (mặc định true từ Next 14) + `compress` giúp HTML/CSS/JS nhỏ
   * hơn → parse nhanh hơn → TBT/FCP cải thiện.
   */
  compress: true,

  /**
   * Tắt `x-powered-by` (không ảnh hưởng perf nhưng sạch header).
   */
  poweredByHeader: false,

  /**
   * Phục vụ file xác minh Google Search Console.
   *
   * Google yêu cầu file `google<token>.html` ở thư mục gốc, nội dung:
   *   `google-site-verification: <token>`
   *
   * Thay vì copy file vào `public/` mỗi lần đổi token, mọi URL có dạng
   * `/google*.html` được rewrite về route xử lý đọc token từ env
   * (`GOOGLE_SITE_VERIFICATION`) → chỉ cần set biến môi trường là xác minh
   * được, không cần build lại.
   */
  async rewrites() {
    return [
      {
        source: "/:file(google[a-zA-Z0-9_-]*\\.html)",
        destination: "/api/google-verification",
      },
    ];
  },
};

export default nextConfig;
