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
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

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
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Trang chi tiết sản phẩm — lấy động từ database.
  try {
    const { products } = await getProducts({ perPage: 1000 });
    for (const p of products) {
      entries.push({
        url: `${BASE_URL}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
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
        lastModified: now,
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
        lastModified: post.updated_at ? new Date(post.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Không có database — sitemap vẫn có các trang tĩnh.
  }

  return entries;
}

export const revalidate = 3600;

export const dynamic = "force-dynamic";
