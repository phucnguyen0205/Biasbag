/**
 * Đồng bộ ảnh mẫu từ Unsplash lên Supabase Storage.
 *
 * Dùng khi muốn ảnh sản phẩm nằm trên domain của bạn (Supabase Storage)
 * thay vì phụ thuộc CDN ngoài.
 *
 * Cách chạy:
 *   1. cp .env.example .env.local   (điền SUPABASE_SERVICE_ROLE_KEY)
 *   2. npm run seed:images
 *
 * Lưu ý: script dùng service role key nên BỎ QUA RLS — chỉ chạy cục bộ.
 */

import { createClient } from "@supabase/supabase-js";

const BUCKET = "product-images";
const FOLDER = "seed";

/** Danh sách ảnh mẫu: [tên file, url Unsplash] */
const IMAGES: [string, string][] = [
  ["tote-canvas-be.jpg", "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1200"],
  ["tote-canvas-alt.jpg", "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=1200"],
  ["cross-mini-leather-brown.jpg", "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200"],
  ["cross-mini-leather-alt.jpg", "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200"],
  ["shoulder-softshell-olive.jpg", "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=1200"],
  ["shoulder-softshell-alt.jpg", "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1200"],
  ["backpack-laptop-black.jpg", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200"],
  ["backpack-laptop-alt.jpg", "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=1200"],
];

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

  // Đảm bảo bucket tồn tại và public.
  const { data: bucket, error: bucketError } =
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });

  if (bucketError && !/already exists/i.test(bucketError.message)) {
    console.error("✗ Không tạo được bucket:", bucketError.message);
    process.exit(1);
  }
  console.log(`✓ Bucket "${BUCKET}" sẵn sàng${bucket ? " (đã tạo)" : ""}`);

  const uploaded: Record<string, string> = {};

  for (const [name, imageUrl] of IMAGES) {
    const path = `${FOLDER}/${name}`;
    process.stdout.write(`… ${path} `);

    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") ?? "image/jpeg";

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType,
          cacheControl: "31536000",
          upsert: true,
        });

      if (error) throw new Error(error.message);

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      uploaded[name] = publicUrl;
      console.log("✓");
    } catch (err) {
      console.log(
        `✗ ${err instanceof Error ? err.message : "lỗi không xác định"}`,
      );
    }
  }

  console.log("\n── Cập nhật products.image_url ──\n");

  const MAPPING: [string, string][] = [
    ["tui-tote-canvas-han-quoc-day-khoang-dai", "tote-canvas-be.jpg"],
    ["tui-xach-mini-da-tron-mau-nau", "cross-mini-leather-brown.jpg"],
    ["tui-deo-vai-nu-soft-shell-olive", "shoulder-softshell-olive.jpg"],
    ["balo-laptop-156-inch-water-resistant", "backpack-laptop-black.jpg"],
    ["tui-xach-tron-dang-tron-canvas-trang", "tote-canvas-alt.jpg"],
    ["tui-tote-vai-ni-nu-day-xach-nang", "shoulder-softshell-alt.jpg"],
    ["tui-deo-vai-nu-da-nau-cognac", "cross-mini-leather-alt.jpg"],
    ["cap-tote-laptop-14-inch-da-grainy", "backpack-laptop-alt.jpg"],
  ];

  for (const [slug, file] of MAPPING) {
    const url = uploaded[file];
    if (!url) {
      console.log(`✗ ${slug}: thiếu ảnh ${file}`);
      continue;
    }

    const { error } = await supabase
      .from("products")
      .update({ image_url: url })
      .eq("slug", slug);

    if (error) console.log(`✗ ${slug}: ${error.message}`);
    else console.log(`✓ ${slug}\n    ${url}`);
  }

  console.log("\nHoàn tất.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
