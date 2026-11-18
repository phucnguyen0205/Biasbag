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

  // ── Bản WEBP/AVIF cho header/footer ─────────────────────────────────────
  //
  // Logo hiển thị ở header chỉ ~104×65px (DPR 2 → 208px).
  //
  // Bản 256px là bản "full" dùng cho OG + footer + `srcset` DPR cao.
  // Nhưng header chỉ hiển thị 104×65px ⇒ sinh thêm bản **nhỏ** 160px:
  //   • 160px @ DPR1.5 = 240px gần đúng nhu cầu → dùng làm `srcset` mặc định
  //   • Tiết kiệm ~7KB/bản so với bản 256px.
  //
  // ⚠️ KHÔNG dùng `unoptimized` vô điều kiện: bản nhỏ phải là file TĨNH
  // có tên riêng để browser cache theo `srcset`.
  //
  // ── AVIF ─────────────────────────────────────────────────────────────────
  // AVIF nhỏ hơn WebP ~45% ở cùng chất lượng thị giác với logo (logo là
  // hình phẳng, nhiều vùng đồng nhất → AVIF rất hiệu quả):
  //   webp 256px = 20.6KB  →  avif 256px = 10.7KB  (−48%!)
  //
  // Header là ảnh hiển thị NGAY trên màn hình đầu tiên (cùng cấp độ ưu
  // tiên với ảnh LCP) ⇒ mỗi KB ở đây cũng quyết định tốc độ hiển thị.
  const webp = (buf: Buffer, w: number) =>
    sharp(buf)
      .resize(w)
      .webp({ quality: 82, effort: 6, alphaQuality: 100 })
      .toBuffer();

  /**
   * ⚡ Chất lượng AVIF cho logo.
   *
   * Logo là hình phẳng 2 màu (không gradient) ⇒ AVIF nén rất hiệu quả và
   * hạ chất lượng không làm nhoè.
   *
   * Lighthouse báo "wasted bytes 4728" cho `logo-md.avif` ở quality 55 ⇒
   * giảm xuống **45**: nhỏ hơn ~18% (8.7KB → 7.3KB), hiển thị KHÔNG đổi.
   */
  const avif = (buf: Buffer, w: number) =>
    sharp(buf)
      .resize(w)
      .avif({ quality: 45, effort: 6 })
      .toBuffer();

  // Bản 208px — dành cho màn hình DPR 2 (104px × 2 = 208px).
  //
  // ⚡ Nhờ có bản 208px, trình duyệt chọn đúng 208px ở màn DPR 2 thay vì
  // phải nhảy lên 256px ⇒ tiết kiệm ~3KB mỗi lượt tải logo.
  const logoWebp = await webp(color, 256);
  const logoWhiteWebp = await webp(white, 256);
  const logoWebpSm = await webp(color, 160);
  const logoWhiteWebpSm = await webp(white, 160);
  const logoWebpMd = await webp(color, 208);
  const logoWhiteWebpMd = await webp(white, 208);

  const logoAvif = await avif(color, 256);
  const logoWhiteAvif = await avif(white, 256);
  const logoAvifSm = await avif(color, 160);
  const logoWhiteAvifSm = await avif(white, 160);
  const logoAvifMd = await avif(color, 208);
  const logoWhiteAvifMd = await avif(white, 208);

  await writeFile("public/logo.webp", logoWebp);
  await writeFile("public/logo-white.webp", logoWhiteWebp);
  await writeFile("public/logo-sm.webp", logoWebpSm);
  await writeFile("public/logo-white-sm.webp", logoWhiteWebpSm);
  await writeFile("public/logo.avif", logoAvif);
  await writeFile("public/logo-white.avif", logoWhiteAvif);
  await writeFile("public/logo-sm.avif", logoAvifSm);
  await writeFile("public/logo-white-sm.avif", logoWhiteAvifSm);
  await writeFile("public/logo-md.webp", logoWebpMd);
  await writeFile("public/logo-md.avif", logoAvifMd);

  console.log(
    `✓ public/logo.webp        256px  ${(logoWebp.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-white.webp  256px  ${(logoWhiteWebp.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-sm.webp      160px  ${(logoWebpSm.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-white-sm.webp 160px  ${(logoWhiteWebpSm.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo.avif         256px  ${(logoAvif.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-white.avif   256px  ${(logoWhiteAvif.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-sm.avif       160px  ${(logoAvifSm.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-white-sm.avif 160px  ${(logoWhiteAvifSm.length / 1024).toFixed(1)}KB`,
  );
  console.log(
    `✓ public/logo-md.avif       208px ${(logoAvifMd.length / 1024).toFixed(1)}KB`,
  );


  // ── FAVICON chuyên dụng ─────────────────────────────────────────────────
  //
  // ⚠️ Trước đây `<link rel="icon" href="/logo.webp">` trỏ tới bản 256px
  // (21KB) — trình duyệt tải 21KB chỉ để vẽ icon 16×16 trên tab!
  //
  // Favicon hiển thị ở 16–48px ⇒ sinh bản 64px là đủ (DPR 3 → 48px).
  // Dạng PNG để mọi trình duyật hỗ trợ (ICO không cần thiết).
  const favicon = await sharp(color)
    .trim({ threshold: 10 })
    .resize(64, 64, { fit: "inside", kernel: "lanczos3" })
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();

  await writeFile("public/favicon.png", favicon);
  console.log(
    `✓ public/favicon.png       64px   ${(favicon.length / 1024).toFixed(1)}KB`,
  );

  // ── APPLE TOUCH ICON ──────────────────────────────────────────────────────
  //
  // ⚠️ Trước đây `apple: [{ url: SITE.logoOg }]` trỏ tới `/logo-og.png`
  // (512px, **139KB**) — iOS tải file 139KB chỉ để vẽ icon 180×180 trên
  // màn hình home!
  //
  // Sinh bản riêng 180×180 (kích thước chuẩn của apple-touch-icon) ⇒ ~6KB.
  // iOS tự phóng to, nên 180px là đủ và nhìn sắc nét.
  const appleTouch = await sharp(color)
    .trim({ threshold: 10 })
    .resize(180, 180, { fit: "inside", kernel: "lanczos3" })
    .png({ compressionLevel: 9, palette: true, effort: 10 })
    .toBuffer();

  await writeFile("public/apple-touch-icon.png", appleTouch);
  console.log(
    `✓ public/apple-touch-icon.png 180px ${(appleTouch.length / 1024).toFixed(1)}KB`,
  );

  console.log(
    "\nDùng `unoptimized` trên <Image> cho logo để không bị optimizer nén lại.",
  );
}

main().catch((err) => {
  console.error("✗ Không tạo được logo:", err);
  process.exit(1);
});
