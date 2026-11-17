import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/data/products";
import { getPosts } from "@/lib/data/posts";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://biasbag.vn";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/products", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/blog", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/policies", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/orders", priority: 0.4, changeFrequency: "weekly" as const },
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Trang chi tiết sản phẩm — lấy động từ database.
  try {
    const { products } = await getProducts({ perPage: 1000 });
    for (const p of products) {
      entries.push({
        url: `${BASE_URL}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Không có database — sitemap vẫn có các trang tĩnh.
  }

  // Bài viết — lấy động từ database.
  try {
    const { posts } = await getPosts({ perPage: 1000 });
    for (const post of posts) {
      entries.push({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
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
