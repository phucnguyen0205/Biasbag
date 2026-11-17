/**
 * Sinh các phiên bản logo đã tối ưu sẵn, tránh bị Next.js Image optimizer
 * nén lại bằng palette quantization (làm mất ~46% độ sắc nét).
 *
 * Đầu ra (mỗi file PNG lossless, alpha giữ nguyên):
 *   public/logo.png         — bản màu, 256px  (header 56px, login 56px, admin 44px)
 *   public/logo-white.png   — bản trắng, 256px (footer 64px, hero 80/96px)
 *   public/logo-og.png      — bản màu, 512px  (Open Graph / favicon)
 *
 * Viền trong suốt của ảnh gốc được cắt bỏ (`.trim()`) ⇒ mép wordmark
 * "BIAS BAG" nằm sát mép trái file, nhờ đó logo căn thẳng với text đặt
 * cạnh (footer) thay vì lệch ~7px.
 *
 * Nguồn: assets/logo-source.png (ản gốc do người dùng cung cấp).
 *
 * Chạy: npm run logo:optimize
 */

import { readFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "assets/logo-source.png";
const TARGET = 256;
const OG_TARGET = 512;

/** Đổi mọi pixel RGB thành trắng, giữ nguyên alpha. */
async function toWhite(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = data[i + 3];
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Resize + PNG lossless (palette: false để không dùng palette quantization).
 * `kernel: lanczos3` cho nét mảnh của chữ calligraphy sắc nhất.
 *
 * TRƯỚC khi resize, cắt bỏ viền trong suốt của ảnh gốc (`.trim()`).
 * Nếu không cắt, mép trong suốt lệch trái ~5.9% khiến wordmark "BIAS BAG"
 * lệch ~7px so với đoạn mô tả bên dưới trong footer (và lệch so với text
 * đi kèm ở header / form đăng nhập / trang quản trị).
 * `trim()` cắt theo alpha nên mép cắt bám sát nét chữ calligraphy.
 */
async function render(input: Buffer, size: number): Promise<Buffer> {
  return sharp(input)
    .trim({ threshold: 10 })
    .resize(size, size, {
      fit: "inside",
      kernel: "lanczos3",
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9, palette: false, effort: 10 })
    .toBuffer();
}

async function main() {
  const original = readFileSync(SRC);

  // Bản trắng từ ảnh gốc (không phải từ bản đã resize — tránh nhân nhiều lần).
  const whiteOriginal = await toWhite(original);

  const color = await render(original, TARGET);
  const white = await render(whiteOriginal, TARGET);
  const og = await render(original, OG_TARGET);

  const { writeFile } = await import("node:fs/promises");

  await writeFile("public/logo.png", color);
  await writeFile("public/logo-white.png", white);
  await writeFile("public/logo-og.png", og);

  console.log(`✓ public/logo.png        ${TARGET}px  ${color.length}B`);
  console.log(`✓ public/logo-white.png  ${TARGET}px  ${white.length}B`);
  console.log(`✓ public/logo-og.png     ${OG_TARGET}px  ${og.length}B`);

  // ── Bản WEBP cho header/footer ────────────────────────────────────────
  // Logo hiển thị ở header chỉ ~104×65px (DPR 2 → 208px) ⇒ bản 256px PNG
  // (45KB) là dư thừa. Bản WebP 256px chỉ ~22KB, bản 160px chỉ ~12KB.
  const webp = (buf: Buffer, w: number) =>
    sharp(buf)
      .resize(w)
      .webp({ quality: 88, effort: 6, alphaQuality: 100 })
      .toBuffer();

  const logoWebp = await webp(color, 256);
  const logoWhiteWebp = await webp(white, 256);

  await writeFile("public/logo.webp", logoWebp);
  await writeFile("public/logo-white.webp", logoWhiteWebp);

  console.log(
    `✓ public/logo.webp        256px  ${(logoWebp.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-white.webp  256px  ${(logoWhiteWebp.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    "\nDùng `unoptimized` trên <Image> cho logo để không bị optimizer nén lại.",
  );
}

main().catch((err) => {
  console.error("✗ Không tạo được logo:", err);
  process.exit(1);
});
