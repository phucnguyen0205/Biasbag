import type { MetadataRoute } from "next";
import { getProducts, getCategories } from "@/lib/data/products";
import { getPosts } from "@/lib/data/posts";
import { SITE_URL } from "@/lib/seo";

const BASE_URL = SITE_URL;

/**
 * `sitemap.xml` — danh sách URL nên lập chỉ mục.
 *
 * Nguyên tắc:
 *   - Chỉ liệt kê trang CÔNG KHAI, có nội dung thật (không phải trang rỗng).
 *   - URL phải là URL canonical (không có query string lọc/sắp xếp) — Google
 *     coi `/products?category=x` là trang khác `/products`, dính duplicate.
 *   - `lastModified` thật (từ DB) để Google thu thập lại đúng lúc nội dung
 *     đổi, thay vì `new Date()` cho mọi URL (khiến Google crawl lại vô ích).
 *
 * ⚠️ VỀ ĐỘ ỔN ĐỊNH (rất quan trọng cho Google Search Console):
 *
 *   Search Console báo lỗi "Sơ đồ trang web của bạn dường như là một trang
 *   HTML" khi nó fetch `/sitemap.xml` mà nhận về HTML thay vì XML. Chuyện này
 *   xảy ra nếu route throw exception → Next.js trả về trang lỗi HTML.
 *
 *   Vì vậy route này:
 *     1. Bọc mọi truy vấn DB trong try/catch (lỗi DB → vẫn trả XML hợp lệ
 *        với các trang tĩnh, KHÔNG bao giờ trả HTML).
 *     2. Cache kết quả 1 giờ (`revalidate`) để không phụ thuộc Supabase mỗi
 *        lần Google fetch → không bao giờ timeout.
 *     3. `lastModified` của trang tĩnh dùng mốc thời gian CỐ ĐỊNH
 *        (`STATIC_LASTMOD`) thay vì `new Date()` → `lastmod` không đổi mỗi
 *        lần fetch, nên Google không phải thu thập lại liên tục.
 */

/** Mốc thời gian cố định cho các trang tĩnh (không đổi mỗi lần render). */
const STATIC_LASTMOD = new Date("2026-01-01T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: "daily" | "weekly" | "monthly";
  }[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/products", priority: 0.9, changeFrequency: "daily" },
    { path: "/blog", priority: 0.7, changeFrequency: "daily" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
    { path: "/policies", priority: 0.5, changeFrequency: "monthly" },
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: STATIC_LASTMOD,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Trang chi tiết sản phẩm — lấy động từ database.
  //
  // Bọc try/catch: nếu Supabase lỗi, route vẫn phải trả XML hợp lệ —
  // KHÔNG được để exception nổi lên (Next.js sẽ trả trang lỗi HTML và
  // Search Console báo "sitemap có vẻ là trang HTML").
  try {
    const { products } = await getProducts({ perPage: 1000 });
    for (const p of products) {
      entries.push({
        url: `${BASE_URL}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : STATIC_LASTMOD,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Không có database — sitemap vẫn có các trang tĩnh.
  }

  // Trang danh mục sản phẩm — URL dạng `/products?category=slug`.
  // Đây là các landing page quan trọng cho từ khoá "túi canvas theo chủ đề".
  try {
    const categories = await getCategories();
    for (const c of categories) {
      entries.push({
        url: `${BASE_URL}/products?category=${c.slug}`,
        lastModified: STATIC_LASTMOD,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Bỏ qua nếu không có database.
  }

  // Bài viết — lấy động từ database.
  try {
    const { posts } = await getPosts({ perPage: 1000 });
    for (const post of posts) {
      entries.push({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : STATIC_LASTMOD,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Không có database — sitemap vẫn có các trang tĩnh.
  }

  return entries;
}

/**
 * Cache 1 giờ.
 *
 * `force-dynamic` + `revalidate` cùng lúc: route luôn render mới nhưng kết
 * quả được cache lại 1 giờ → Google fetch nhanh, không phụ thuộc Supabase.
 */
export const revalidate = 3600;

export const dynamic = "force-dynamic";
