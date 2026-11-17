/**
 * Đồng bộ lại dữ liệu sản phẩm cho khớp với ảnh & tên thật trong shop.
 *
 * Vấn đề: admin đã đổi tên + upload ảnh thật cho từng sản phẩm, nhưng các
 * cột `slug`, `category_id`, `description`, `material`, `color`, `size`,
 * `features`, `images[]` vẫn giữ giá trị cũ từ dữ liệu mô phỏng → trang
 * chi tiết hiển thị sai thông tin (ví dụ ảnh BTS nhưng mô tả "soft shell
 * olive", danh mục thuộc về dòng khác).
 *
 * Script này:
 *   1. Đổi `slug` theo đúng thuật toán `slugify()` mà admin form dùng.
 *   2. Gán lại `category_id` theo chủ đề thật của từng sản phẩm.
 *   3. Xoá `images[]` mô phỏng (URL Unsplash không liên quan ảnh thật).
 *   4. Viết lại `description` / `features` / `material` / `color` / `size`.
 *
 * Cách chạy:
 *   node --env-file=.env.local scripts/sync-product-data.ts
 *
 * Dùng service role key → bỏ qua RLS, chỉ chạy cục bộ.
 */

import { createClient } from "@supabase/supabase-js";
import { slugify } from "../src/lib/utils";

/** Thông tin chuẩn cho từng sản phẩm, định danh theo `slug` CŨ. */
const PRODUCTS = [
  {
    oldSlug: "tui-deo-vai-nu-soft-shell-olive",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794937429542-j2ha56.webp",
    category: "tui-tote-kpop",
    name: "Túi Vải Tote Canvas In Hình BLACKPINK Xinh Xắn Phong Cách Hàn Quốc, Túi Đeo Vai Đi Học Đi Chơi Tiện Lợi",
    material: "Canvas dệt thô",
    color: "Đen",
    size: "38 x 42 x 12 cm",
    description:
      "Túi tote canvas in hình BLACKPINK, form rộng, dây khoang dài đeo vai hoặc đeo chéo. Chất liệu canvas dày dặn chịu lực tốt, đựng vừa sách vở A4 cùng đồ cá nhân. Phù hợp đi học, đi làm và làm phụ kiện thời trang cho các fan K-Pop.",
    features: [
      "Canvas dệt thô dày, chịu lực tốt",
      "Form rộng, đựng vừa sách A4",
      "Dây khoang dài đeo vai hoặc đeo chéo",
      "Hình in BLACKPINK sắc nét, không phai",
    ],
  },
  {
    oldSlug: "tui-tote-vai-ni-nu-day-xach-nang",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794938190931-7ogbjt.webp",
    category: "tui-tote-y2k",
    name: "Túi Tote Canvas Đen In Hình Y2K - Túi Vải Đeo Vai Form Rộng Đi Học, Đi Chơi",
    material: "Canvas",
    color: "Đen",
    size: "38 x 40 x 12 cm",
    description:
      "Túi tote canvas nền đen in họa tiết Y2K đầy màu sắc và cá tính. Form rộng, quai dài đeo vai thoải mái, chất liệu canvas mềm dễ vệ sinh. Mẫu túi dễ phối với outfit trẻ năng động.",
    features: [
      "Họa tiết Y2K màu sắc bắt mắt",
      "Form rộng, đựng nhiều đồ",
      "Quai dài đeo vai thoải mái",
      "Nền canvas dễ vệ sinh",
    ],
  },
  {
    oldSlug: "tui-xach-tron-dang-tron-canvas-trang",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794938559309-44cheb.webp",
    category: "tui-tote-toi-gian",
    name: "Túi Tote Canvas BIGBANG Trắng Tối Giản Basic",
    material: "Canvas",
    color: "Trắng",
    size: "36 x 40 x 12 cm",
    description:
      "Túi tote canvas nền trắng in hình BIGBANG theo phong cách tối giản. Thiết kế gọn gàng, không rườm rà, form rộng dễ dùng hằng ngày. Hình in sắc nét, màu trắng dễ phối với trang phục tông trung tính.",
    features: [
      "Thiết kế tối giản, không hình thêu rườm rà",
      "Hình in BIGBANG sắc nét",
      "Form rộng, đựng nhiều đồ",
      "Nền trắng dễ phối",
    ],
  },
  {
    oldSlug: "tui-deo-vai-nu-da-nau-cognac",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794938297121-h1861s.webp",
    category: "tui-tote-dia-diem",
    name: "Túi Tote Vải Canvas In Hình Đà Nẵng Hội An, Túi Vải Đeo Vai Quà Lưu Niệm Du Lịch Đi Học Đi Chơi",
    material: "Canvas",
    color: "Be",
    size: "38 x 42 x 12 cm",
    description:
      "Túi tote canvas in hình Đà Nẵng – Hội An, mỗi hình thêu gợi nhớ chuyến đi chơi. Chất liệu canvas dày, dây khoang dài đeo vai, form rộng. Món quà lưu niệm ý nghĩa cho học sinh, sinh viên và người trẻ thích du lịch.",
    features: [
      "Hình in Đà Nẵng – Hội An sắc nét",
      "Chất liệu canvas dày dặn",
      "Dây khoang dài đeo vai",
      "Quà lưu niệm du lịch ý nghĩa",
    ],
  },
  {
    oldSlug: "cap-tote-laptop-14-inch-da-grainy",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794938387159-gptn5g.webp",
    category: "tui-tote-kpop",
    name: "Túi Tote Canvas BIGBANG Đen In Màu Sắc Nét",
    material: "Canvas",
    color: "Đen",
    size: "38 x 40 x 12 cm",
    description:
      "Túi tote canvas nền đen in hình BIGBANG với màu sắc sắc nét, tương phản rõ trên nền tối. Form rộng, dây khoang dài, chất liệu canvas dày chịu lực tốt. Phối đồ cực hợp cho fan K-Pop thích tông màu tối.",
    features: [
      "Hình in BIGBANG tương phản rõ",
      "Nền canvas đen dễ phối đồ",
      "Form rộng, đựng nhiều đồ",
      "Dây khoang dài bền chắc",
    ],
  },
  {
    oldSlug: "tui-tote-canvas-han-quoc-day-khoang-dai",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794938464240-v723hb.webp",
    category: "tui-tote-logo",
    name: "Túi Tote Canvas BIAS BAG In Hình 7 Thành Viên BTS, Túi Vải Đeo Vai Kpop Form Rộng Đi Học",
    material: "Canvas dệt thô",
    color: "Be",
    size: "38 x 42 x 12 cm",
    description:
      "Túi tote canvas in hình 7 thành viên BTS, form rộng dễ dùng hằng ngày. Chất liệu canvas dệt thô dày dặn, dây khoang dài đeo vai hoặc đeo chéo, ngăn trong lót vải. Mẫu túi dành cho fan BTS và các bạn trẻ thích nhạc K-Pop.",
    features: [
      "Hình in 7 thành viên BTS sắc nét",
      "Canvas dệt thô dày, chịu lực tốt",
      "Form rộng, đựng vừa sách A4",
      "Ngăn trong lớp lót vải",
    ],
  },
  {
    oldSlug: "tui-xach-mini-da-tron-mau-nau",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794938635399-rr0jd9.webp",
    category: "tui-tote-dia-diem",
    name: "Túi Tote Canvas In Hình Phố Cổ Hội An, Túi Vải Đeo Vai Quà Lưu Niệm Du Lịch Đi Học Đi Chơi Đẹp",
    material: "Canvas",
    color: "Be",
    size: "38 x 42 x 12 cm",
    description:
      "Túi tote canvas in hình phố cổ Hội An với nét vẽ tinh nghề, màu sắc tươi sáng. Form rộng, dây khoang dài, chất liệu canvas dày dặn. Món quà lưu niệm xứ Đà Nẵng cho học sinh, sinh viên và khách du lịch.",
    features: [
      "Hình phố cổ Hội An tinh nghề",
      "Chất liệu canvas dày dặn",
      "Dây khoang dài đeo vai",
      "Quà lưu niệm du lịch ý nghĩa",
    ],
  },
  {
    oldSlug: "balo-laptop-156-inch-water-resistant",
    imageUrl: "https://wghhwlpgutmhyszpbxus.supabase.co/storage/v1/object/public/product-images/products/1794937939898-zu21q5.webp",
    category: "tui-tote-kpop",
    name: "Túi Vải Tote Canvas Rosé BLACKPINK Phong Cách Hàn Quốc, Túi Đeo Vai Năng Động Đi Chơi Tiện Lợi",
    material: "Canvas",
    color: "Hồng pastel",
    size: "38 x 42 x 12 cm",
    description:
      "Túi tote canvas hồng pastel in hình Rosé BLACKPINK, phong cách Hàn Quốc nhẹ nhàng và năng động. Form rộng, dây khoang dài đeo vai, canvas mềm dễ vệ sinh. Mẫu túi nổi bật cho các bạn trẻ yêu thích K-Pop.",
    features: [
      "Hình in Rosé BLACKPINK sắc nét",
      "Màu hồng pastel nổi bật, dễ phối",
      "Dây khoang dài đeo vai",
      "Canvas mềm dễ vệ sinh",
    ],
  },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "✗ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Map slug danh mục → id.
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, slug");
  if (catError) {
    console.error("✗ Không đọc được categories:", catError.message);
    process.exit(1);
  }
  const categoryIdBySlug = new Map(
    (categories ?? []).map((c) => [c.slug as string, c.id as string]),
  );

  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.category);
    if (!categoryId) {
      console.log(`✗ ${p.oldSlug}: không tìm thấy danh mục "${p.category}"`);
      continue;
    }

    const newSlug = slugify(p.name);

    // Tìm sản phẩm theo ảnh (định danh duy nhất, không đổi theo tên) để
    // script chạy lại được nhiều lần mà không vỡ.
    const { data: rows } = await supabase
      .from("products")
      .select("id, slug, image_url")
      .eq("image_url", p.imageUrl);

    const target = rows?.[0];
    if (!target) {
      console.log(`✗ ${p.oldSlug}: không tìm thấy sản phẩm (ảnh ${p.imageUrl})`);
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update({
        slug: newSlug,
        name: p.name,
        category_id: categoryId,
        description: p.description,
        features: [...p.features],
        material: p.material,
        color: p.color,
        size: p.size,
        // Xoá ảnh phụ mô phỏng (URL Unsplash không liên quan ảnh thật).
        images: [],
      })
      .eq("id", target.id);

    if (error) {
      console.log(`✗ ${p.oldSlug}: ${error.message}`);
    } else {
      console.log(`✓ ${target.slug}\n    → ${newSlug}`);
    }
  }

  console.log("\nHoàn tất.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
