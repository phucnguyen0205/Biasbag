/**
 * Sinh bộ ảnh banner responsive ĐỨNG YÊN (static) cho hero trang chủ.
 *
 * ── Vì sao không dùng Next.js Image Optimizer cho hero? ────────────────────
 *
 * Ảnh hero là phần tử LCP của trang chủ. Khi đi qua `/_next/image`, mỗi kích
 * thước mới phải được optimizer dựng lại ở server lần đầu (cold start) →
 * thêm 300–580ms trước khi trình duyệt nhận được ảnh.
 *
 * Với ảnh nền hero đã được nén sẵn ở chất lượng phù hợp, ta sinh sẵn các
 * bản theo đúng các mốc thiết bị (`deviceSizes` của Next.js) rồi phục vụ
 * trực tiếp từ CDN → không có bước xử lý ảnh nào ở runtime, ảnh LCP về
 * ngay trong HTML và tải song song với CSS/JS.
 *
 * ── Đầu ra ───────────────────────────────────────────────────────────────
 *
 *   public/banners/<tên>-<w>.webp   với <w> ∈ {640, 750, 1080, 1200, 1920}
 *
 * Dùng chung pattern với file `-sm.webp` đã có sẵn.
 *
 * Chạy: npm run banner:responsive
 */

import { readdirSync, existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = "assets/banners";
const OUT_DIR = "public/banners";

/** Các mốc rộng khớp `deviceSizes` trong `next.config.ts`. */
const WIDTHS = [640, 750, 1080, 1200, 1920];

/** Chất lượng WebP — ảnh nền bị phủ gradient nên nén mạnh vẫn đẹp. */
const QUALITY = 70;

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`✗ Không tìm thấy thư mục ${SRC_DIR}/`);
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const files = readdirSync(SRC_DIR)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!files.length) {
    console.error(`✗ Không có ảnh nào trong ${SRC_DIR}/`);
    process.exit(1);
  }

  for (const file of files) {
    const base = path.basename(file, path.extname(file));
    const input = path.join(SRC_DIR, file);

    // Bản gốc đã nén ở 1024px → dùng làm nguồn, resize xuống các mốc nhỏ.
    // Ảnh nguồn 1024px nên các bản >1024px sẽ bị `withoutEnlargement` giữ
    // nguyên 1024px (không làm nhoè).
    let total = 0;
    const made: string[] = [];

    for (const width of WIDTHS) {
      const buf = await sharp(input)
        .resize(width, undefined, {
          fit: "inside",
          kernel: "lanczos3",
          withoutEnlargement: true,
        })
        .webp({ quality: QUALITY, effort: 6 })
        .toBuffer();

      const name = `${base}-${width}.webp`;
      await writeFile(path.join(OUT_DIR, name), buf);
      total += buf.length;
      made.push(`${width}:${(buf.length / 1024).toFixed(0)}KB`);
    }

    console.log(`✓ ${base}  ${made.join("  ")}  (tổng ${(total / 1024).toFixed(0)}KB)`);
  }

  console.log(`\nĐã sinh ${files.length} bộ ảnh responsive trong ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error("✗ Không tạo được ảnh banner:", err);
  process.exit(1);
});
