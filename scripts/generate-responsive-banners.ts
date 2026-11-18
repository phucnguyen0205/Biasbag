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

/**
 * Bản THUMBNAIL 128px cho dấu chấm/dots của carousel.
 *
 * Thumbnail chỉ hiển thị 64×48px. Nếu dùng `next/image` → mỗi thumbnail là
 * 1 request tới `/_next/image` (4 request cho 4 banner) ⇒ server phải resize
 * lần đầu (cold start) + thêm round-trip.
 *
 * Bản TĨNH 128px nén sẵn (~2KB) ⇒ phục vụ thẳng từ CDN, không có request
 * nào tới app server ⇒ nhanh hơn và tiết kiệm CPU server.
 */
const THUMB_WIDTH = 128;

/**
 * Chất lượng WebP — ảnh nền bị phủ gradient nên nén mạnh vẫn đẹp.
 *
 * ⚠️ Ảnh hero được phủ 2 lớp gradient tối + LQIP làm nền ⇒ chi tiết bị
 * che nhiều. Nén mạnh (q60) gần như không nhận ra khác biệt bằng mắt,
 * nhưng tiết kiệm ~15% băng thông ⇒ LCP về sớm hơn.
 */
const QUALITY = 60;

/**
 * Chất lượng AVIF — định dạng ảnh LCP.
 *
 * AVIF nhỏ hơn WebP ~20–30% ở cùng chất lượng thị giác (nhờ codec AV1).
 * Vì banner là ẢNH LCP của trang chủ, mỗi KB tiết kiệm ở đây quy đổi
 * thẳng sang LCP tốt hơn.
 *
 * ⚠️ `effort: 4` (không phải 6) vì encode AVIF rất chậm — `effort` cao chỉ
 * giảm thêm ~2% dung lượng nhưng gấp đôi thời gian build.
 *
 * ⚠️ `quality: 34` (đo bằng mắt + PSNR trên ảnh thật): ảnh hero bị phủ 2
 * lớp gradient tối nên chi tiết bị che phần lớn. Đo PSNR so với ảnh gốc:
 *
 *   q42 → 31.9 dB  (17.7KB)     q32 → 29.5 dB  (13.7KB)
 *   q36 → 30.3 dB  (15.8KB)     q28 → 28.7 dB  (13.2KB)
 *
 * Ở q34 (≈29.9 dB) sai số PSNR vẫn > 29 dB ⇒ mắt thường không nhận ra
 * khác biệt trên ảnh đã bị overlay. Lighthouse cũng báo "wasted bytes 9383"
 * cho ảnh hero ở q42 ⇒ hạ xuống 34 giúp LCP về sớm hơn ~5KB.
 */
const AVIF_QUALITY = 34;
const AVIF_EFFORT = 5;

/**
 * Cờ `smartSubsample` — tối ưu màu cho ảnh nhiều màu (ảnh banner).
 * Giúp WebP nén tốt hơn ở cùng chất lượng thị giác.
 */
const WEBP_OPTIONS = {
  quality: QUALITY,
  effort: 6,
  smartSubsample: true,
} as const;

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
      const resized = sharp(input).resize(width, undefined, {
        fit: "inside",
        kernel: "lanczos3",
        withoutEnlargement: true,
      });

      // ── WebP (fallback cho trình duyệt cũ) ─────────────────────────────
      const buf = await resized.clone().webp(WEBP_OPTIONS).toBuffer();

      const name = `${base}-${width}.webp`;
      await writeFile(path.join(OUT_DIR, name), buf);
      total += buf.length;
      made.push(`${width}:${(buf.length / 1024).toFixed(0)}KB`);

      // ── AVIF (định dạng ưu tiên — nhỏ hơn WebP ~20–30%) ───────────────
      const avif = await resized
        .clone()
        .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
        .toBuffer();

      await writeFile(path.join(OUT_DIR, `${base}-${width}.avif`), avif);
      total += avif.length;
      made.push(`avif${width}:${(avif.length / 1024).toFixed(0)}KB`);
    }

    // Bản thumbnail 128px (tĩnh) — thay cho `next/image` ở carousel dots.
    const thumb = await sharp(input)
      .resize(THUMB_WIDTH, undefined, {
        fit: "inside",
        kernel: "lanczos3",
        withoutEnlargement: true,
      })
      .webp({ quality: 45, effort: 6 })
      .toBuffer();

    await writeFile(path.join(OUT_DIR, `${base}-thumb.webp`), thumb);
    total += thumb.length;
    made.push(`thumb:${(thumb.length / 1024).toFixed(0)}KB`);

    console.log(`✓ ${base}  ${made.join("  ")}  (tổng ${(total / 1024).toFixed(0)}KB)`);
  }

  console.log(`\nĐã sinh ${files.length} bộ ảnh responsive trong ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error("✗ Không tạo được ảnh banner:", err);
  process.exit(1);
});
