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
   * Redirect slug sản phẩm cũ → slug mới.
   *
   * Admin đã đổi tên sản phẩm cho khớp ảnh thật, dẫn tới slug mới (theo đúng
   * thuật toán `slugify` mà form admin dùng). Các URL cũ đã được Google index
   * và khách đã lưu bookmark → cần redirect 301 về slug mới để không mất
   * thứ hạng SEO và không gặy lỗi 404.
   */
  async redirects() {
    return [
      {
        source: "/products/tui-deo-vai-nu-soft-shell-olive",
        destination:
          "/products/tui-vai-tote-canvas-in-hinh-blackpink-xinh-xan-phong-cach-han-quoc-tui-deo-vai-di-hoc-di-choi-tien-loi",
        permanent: true,
      },
      {
        source: "/products/tui-tote-vai-ni-nu-day-xach-nang",
        destination:
          "/products/tui-tote-canvas-den-in-hinh-y2k-tui-vai-deo-vai-form-rong-di-hoc-di-choi",
        permanent: true,
      },
      {
        source: "/products/tui-xach-tron-dang-tron-canvas-trang",
        destination: "/products/tui-tote-canvas-bigbang-trang-toi-gian-basic",
        permanent: true,
      },
      {
        source: "/products/tui-deo-vai-nu-da-nau-cognac",
        destination:
          "/products/tui-tote-vai-canvas-in-hinh-da-nang-hoi-an-tui-vai-deo-vai-qua-luu-niem-du-lich-di-hoc-di-choi",
        permanent: true,
      },
      {
        source: "/products/cap-tote-laptop-14-inch-da-grainy",
        destination: "/products/tui-tote-canvas-bigbang-den-in-mau-sac-net",
        permanent: true,
      },
      {
        source: "/products/tui-tote-canvas-han-quoc-day-khoang-dai",
        destination:
          "/products/tui-tote-canvas-bias-bag-in-hinh-7-thanh-vien-bts-tui-vai-deo-vai-kpop-form-rong-di-hoc",
        permanent: true,
      },
      {
        source: "/products/tui-xach-mini-da-tron-mau-nau",
        destination:
          "/products/tui-tote-canvas-in-hinh-pho-co-hoi-an-tui-vai-deo-vai-qua-luu-niem-du-lich-di-hoc-di-choi-dep",
        permanent: true,
      },
      {
        source: "/products/balo-laptop-156-inch-water-resistant",
        destination:
          "/products/tui-vai-tote-canvas-rose-blackpink-phong-cach-han-quoc-tui-deo-vai-nang-dong-di-choi-tien-loi",
        permanent: true,
      },
    ];
  },

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

  /**
   * Cache dài hạn cho file tĩnh trong `public/`.
   *
   * Mặc định của Vercel: `public/` được cache `public, max-age=0` → mỗi lượt
   * truy cập vẫn phải hỏi CDN (dù CDN vẫn trả từ edge cache).
   *
   * Với file có tên hash/phiên bản (`.webp` banner responsive, logo) → đặt
   * `max-age=31536000` (1 năm, immutable) ⇒ trình duyệt không hỏi lại server,
   * lượt truy cập sau lấy ảnh từ cache cục bộ → TTFB và LCP giảm rõ rệt.
   *
   * ⚠️ Chỉ áp dụng cho file TĨNH không đổi tên. File đổi tên theo nội dung
   * (`/_next/static/**`) đã có hash nên Next.js tự cache dài hạn.
   */
  async headers() {
    return [
      {
        source: "/banners/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/logo.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/logo-white.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
