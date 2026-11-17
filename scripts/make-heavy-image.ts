/**
 * Sinh ảnh BANNER nặng (~2.4 MB) dùng cho benchmark LCP.
 *
 * Ảnh gốc `public/banners/banner-1.webp` chỉ ~57 KB. Để kéo chỉ số LCP xuống
 * (mô phỏng ảnh hero tải chậm), cần một ảnh lớn gấp ~40 lần.
 *
 * Ảnh này **không được commit** (xem `.gitignore`) — chạy script này khi cần:
 *   npm run perf:heavy-image
 *
 * Script tự sinh lại từ `banner-1.webp` nên không cần lưu file nhị phân.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "public/banners/banner-1.webp");
const OUT = path.join(ROOT, "public/banners/perf-heavy.jpg");

/** Chiều rộng sau khi phóng to → file JPEG chất lượng cao ~2–3 MB. */
const TARGET_WIDTH = 5000;

async function main() {
  if (!existsSync(SRC)) {
    console.error(
      `✗ Không tìm thấy ${SRC}\n  → Chạy trước: npm run banner:optimize`,
    );
    process.exit(1);
  }

  const info = await sharp(SRC)
    .resize({ width: TARGET_WIDTH, withoutEnlargement: false })
    .jpeg({ quality: 100, mozjpeg: false })
    .toFile(OUT);

  const mb = (info.size / 1024 / 1024).toFixed(2);
  console.log(
    `✓ Đã tạo ${path.relative(ROOT, OUT)} — ${info.width}×${info.height}, ${mb} MB`,
  );
  console.log(
    "  Dùng cờ `lcp` để kích hoạt: NEXT_PUBLIC_PERF_DEGRADE=lcp",
  );
}

main().catch((err) => {
  console.error("✗ Lỗi:", err);
  process.exit(1);
});
