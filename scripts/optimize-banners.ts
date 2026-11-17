/**
 * Tối ưu ảnh banner gốc cho hero trang chủ.
 *
 * Ảnh gốc từ `assets/banners/*.jpg` (do người dùng cung cấp, 1024px).
 * Đầu ra trong `public/banners/`:
 *   - banner-N.webp     — 1920px rộng, dùng cho màn hình lớn (quality 78)
 *   - banner-N-sm.webp  — 960px rộng, dùng cho mobile (quality 72)
 *   - banner-N.jpg      — 1920px fallback cho trình duyệt cũ
 *
 * Ảnh hero được phủ gradient + nội dung chữ nên có thể nén mạnh hơn
 * ảnh sản phẩm mà vẫn giữ chất lượng thị giác.
 *
 * Chạy: npm run banner:optimize
 */

import { readdirSync, existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = "assets/banners";
const OUT_DIR = "public/banners";

const WIDTH_FULL = 1920;
const WIDTH_SMALL = 960;
const QUALITY_FULL = 78;
const QUALITY_SMALL = 72;

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

    const full = await sharp(input)
      .resize(WIDTH_FULL, undefined, {
        fit: "inside",
        kernel: "lanczos3",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY_FULL, effort: 6 })
      .toBuffer();

    const small = await sharp(input)
      .resize(WIDTH_SMALL, undefined, {
        fit: "inside",
        kernel: "lanczos3",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY_SMALL, effort: 6 })
      .toBuffer();

    const jpg = await sharp(input)
      .resize(WIDTH_FULL, undefined, {
        fit: "inside",
        kernel: "lanczos3",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 76, mozjpeg: true, progressive: true })
      .toBuffer();

    await writeFile(path.join(OUT_DIR, `${base}.webp`), full);
    await writeFile(path.join(OUT_DIR, `${base}-sm.webp`), small);
    await writeFile(path.join(OUT_DIR, `${base}.jpg`), jpg);

    console.log(
      `✓ ${base}  webp ${(full.length / 1024).toFixed(0)}KB  ` +
        `sm ${(small.length / 1024).toFixed(0)}KB  ` +
        `jpg ${(jpg.length / 1024).toFixed(0)}KB`,
    );
  }

  console.log(`\nĐã tạo ${files.length} bộ banner trong ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error("✗ Không tạo được banner:", err);
  process.exit(1);
});
