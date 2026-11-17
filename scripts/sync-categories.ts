/**
 * Đồng bộ danh mục sản phẩm trong Supabase theo danh mục mới (chia theo
 * chủ đề hình in trên túi tote canvas).
 *
 * - Tạo danh mục mới (nếu chưa có).
 * - Gán lại sản phẩm sang danh mục mới tương ứng.
 * - Danh mục cũ được giữ lại để không mất dữ liệu lịch sử đơn hàng.
 *
 * Chạy: npx tsx scripts/sync-categories.ts
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const CATEGORIES = [
  {
    name: "Túi Tote K-Pop",
    slug: "tui-tote-kpop",
    description: "In hình idol, nhóm nhạc, concert — BTS, BLACKPINK, Jungkook",
    image_url:
      "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600",
  },
  {
    name: "Túi Tote Logo",
    slug: "tui-tote-logo",
    description: "Thương hiệu, câu slogan, logo nổi tiếng",
    image_url:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600",
  },
  {
    name: "Túi Tote Địa Điểm",
    slug: "tui-tote-dia-diem",
    description: "Đà Nẵng, Hội An, phố cổ — Việt Nam trong từng hình thêu",
    image_url:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
  },
  {
    name: "Túi Tote Tối Giản",
    slug: "tui-tote-toi-gian",
    description: "Trắng, đen, in đơn sắc — mẫu mã an toàn cho mọi outfit",
    image_url:
      "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=600",
  },
  {
    name: "Túi Tote Y2K",
    slug: "tui-tote-y2k",
    description: "Họa tiết trendy, màu sắc Y2K đầy cá tính",
    image_url:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
  },
];

/** slug sản phẩm → slug danh mục mới */
const PRODUCT_CATEGORY: [string, string][] = [
  ["tui-tote-canvas-han-quoc-day-khoang-dai", "tui-tote-toi-gian"],
  ["tui-xach-mini-da-tron-mau-nau", "tui-tote-logo"],
  ["tui-deo-vai-nu-soft-shell-olive", "tui-tote-kpop"],
  ["balo-laptop-156-inch-water-resistant", "tui-tote-y2k"],
  ["tui-xach-tron-dang-tron-canvas-trang", "tui-tote-toi-gian"],
  ["tui-tote-vai-ni-nu-day-xach-nang", "tui-tote-toi-gian"],
  ["tui-deo-vai-nu-da-nau-cognac", "tui-tote-dia-diem"],
  ["cap-tote-laptop-14-inch-da-grainy", "tui-tote-logo"],
];

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1. Tạo / cập nhật danh mục mới.
  for (const c of CATEGORIES) {
    const { data, error } = await supabase
      .from("categories")
      .upsert(
        {
          name: c.name,
          slug: c.slug,
          description: c.description,
          image_url: c.image_url,
        },
        { onConflict: "slug" },
      )
      .select("id, slug")
      .single();
    if (error) {
      console.error(`✗ ${c.slug}:`, error.message);
      process.exit(1);
    }
    console.log(`✓ ${c.slug} → ${data.id}`);
  }

  const { data: cats } = await supabase.from("categories").select("id, slug");
  const bySlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));

  // 2. Gán lại sản phẩm.
  for (const [productSlug, categorySlug] of PRODUCT_CATEGORY) {
    const categoryId = bySlug.get(categorySlug);
    if (!categoryId) {
      console.error(`✗ thiếu danh mục ${categorySlug}`);
      continue;
    }
    const { error } = await supabase
      .from("products")
      .update({ category_id: categoryId })
      .eq("slug", productSlug);
    if (error) console.error(`✗ ${productSlug}:`, error.message);
    else console.log(`✓ ${productSlug} → ${categorySlug}`);
  }

  // 3. Xoá danh mục cũ (không còn sản phẩm nào trỏ tới) để bộ lọc
  //    và trang chủ chỉ hiện danh mục mới.
  const { data: oldCats } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", ["tui-tote", "tui-xach", "tui-deo-vai", "balo-cap"]);
  for (const c of oldCats ?? []) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", c.id);
    if ((count ?? 0) > 0) {
      console.log(`⚠ giữ lại ${c.slug}: còn ${count} sản phẩm trỏ tới`);
      continue;
    }
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) console.error(`✗ xoá ${c.slug}:`, error.message);
    else console.log(`✓ đã xoá danh mục cũ ${c.slug}`);
  }

  // 4. Kiểm tra lại.
  const { data: finalCats } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");
  console.log("\n── Danh mục hiện tại ──");
  for (const c of finalCats ?? []) console.log(` • ${c.name} (${c.slug})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
