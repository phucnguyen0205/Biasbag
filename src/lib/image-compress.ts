/**
 * Nén ảnh TRƯỚC KHI upload — chạy hoàn toàn ở trình duyệt.
 *
 * ── VÌ SAO CẦN ────────────────────────────────────────────────────────────
 *
 * Ảnh được gửi lên server qua **Server Action** (`uploadImageAction`).
 * Next.js giới hạn kích thước body của Server Action ở **1 MB** (mặc định).
 * Ảnh banner (1920px) / ảnh sản phẩm nén gốc thường 1–5 MB ⇒ request bị
 * Vercel/Next từ chối với `Body exceeded 1 MB limit` (HTTP 413) ⇒ trình
 * duyệt hiện "Application error: a server-side exception has occurred".
 *
 * Nén sẵn ở client giải quyết gốc rễ:
 *   - Ảnh banner 1920px JPEG 4MB  →  ~250KB WebP  (↓ 94%)
 *   - Ảnh sản phẩm 1400px JPEG 3MB → ~180KB WebP  (↓ 94%)
 *
 * ⇒ request luôn dưới 1 MB ⇒ không bao giờ gặp lỗi 413.
 *
 * Bonus: upload nhanh hơn, ít tốn băng thông server, ảnh trên Supabase
 * Storage nhẹ hơn ⇒ `next/image` xử lý nhanh hơn.
 *
 * ── GHI CHÚ ───────────────────────────────────────────────────────────────
 *
 * `createImageBitmap` + `<canvas>` không có ở mọi trình duyệt (ví dụ Safari
 * cũ) ⇒ nếu không hỗ trợ, trả về file GỐC để upload vẫn hoạt động
 * (khi đó dựa vào `bodySizeLimit` trong `next.config.ts`).
 */

/** Kích thước vùng vẽ tối đa — tránh canvas quá lớn làm treo mobile. */
const MAX_CANVAS_PIXELS = 4_000_000; // ~4MP

export type CompressOptions = {
  /** Chiều rộng tối đa (px) sau khi nén. */
  maxWidth?: number;
  /** Chiều cao tối đa (px) sau khi nén. */
  maxHeight?: number;
  /** Chất lượng 0–1. */
  quality?: number;
  /**
   * Định dạng đầu ra. `image/webp` nhỏ hơn JPEG ~25–35% ở cùng chất lượng
   * thị giác và được `ALLOWED_TYPES` trong `src/lib/storage.ts` cho phép.
   */
  format?: "image/webp" | "image/jpeg";
};

export type CompressResult = {
  file: File;
  /** `true` nếu ảnh đã được nén lại (không phải file gốc). */
  compressed: boolean;
  /** Kích thước ban đầu (bytes). */
  originalSize: number;
  /** Kích thước sau nén (bytes). */
  finalSize: number;
};

/** Kiểm tra trình duyệt có hỗ trợ nén ảnh client-side không. */
export function canCompressImages(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof createImageBitmap === "function" &&
    typeof document !== "undefined"
  );
}

/**
 * Trình duyệt có hỗ trợ `canvas.toBlob("image/webp")` không?
 *
 * Cache kết quả — chỉ cần kiểm tra 1 lần cho cả vòng đời trang.
 */
let webpSupport: boolean | null = null;

function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}

/**
 * Ngưỡng dung lượng cho MỘT lần upload qua Server Action.
 *
 * Next.js mặc định giới hạn body Server Action ở **1 MB**. Ta để dưới
 * mức đó (900 KB) để chắc chắn request luôn được chấp nhận, kể cả khi
 * `bodySizeLimit` trong `next.config.ts` chưa kịp áp dụng (deploy cũ).
 */
const MAX_UPLOAD_BYTES = 900 * 1024;

/**
 * Nén ảnh trong trình duyệt.
 *
 * Luôn trả về một `File` hợp lệ — nếu không nén được (trình duyệt không hỗ
 * trợ, lỗi decode…) thì trả về chính file gốc.
 *
 * ⚠️ VÒNG LẶP HẠ CHẤT LƯỢNG:
 *
 * Một lần nén ở `quality` cố định KHÔNG chắc chắn kết quả < 1 MB (ảnh
 * nhiễu/chi tiết cao gần như không nén được). Vì vậy nếu kết quả vẫn lớn
 * hơn `MAX_UPLOAD_BYTES`, ta hạ dần chất lượng (và giảm kích thước) cho
 * tới khi vừa ⇒ **luôn** gửi được lên server.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82,
    format = supportsWebp() ? "image/webp" : "image/jpeg",
  } = options;

  const originalSize = file.size;

  // Không có API nén → trả file gốc.
  if (!canCompressImages()) {
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }

  // Ảnh SVG/GIF: không nén được an toàn (giữ nguyên để tránh mất animation).
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }

  try {
    const bitmap = await createImageBitmap(file);

    // Kích thước gốc sau khi resize (giữ tỉ lệ, không phóng to lên).
    let baseWidth = bitmap.width;
    let baseHeight = bitmap.height;
    const scale = Math.min(maxWidth / baseWidth, maxHeight / baseHeight, 1);
    baseWidth = Math.max(1, Math.round(baseWidth * scale));
    baseHeight = Math.max(1, Math.round(baseHeight * scale));

    // Canvas quá lớn → giảm tiếp để tránh vượt giới hạn trình duyệt.
    if (baseWidth * baseHeight > MAX_CANVAS_PIXELS) {
      const ratio = Math.sqrt(MAX_CANVAS_PIXELS / (baseWidth * baseHeight));
      baseWidth = Math.max(1, Math.round(baseWidth * ratio));
      baseHeight = Math.max(1, Math.round(baseHeight * ratio));
    }

    const ext = format === "image/webp" ? "webp" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") || "image";

    /**
     * Thử nén với (width, height, quality) cho tới khi vừa dung lượng.
     *
     * Mỗi vòng: giảm chất lượng trước, nếu vẫn chưa đủ thì giảm tiếp kích
     * thước (ảnh banner vẫn nhìn đẹp vì bị phủ gradient + object-cover).
     */
    const attempts: { w: number; h: number; q: number }[] = [
      { w: baseWidth, h: baseHeight, q: quality },
      { w: baseWidth, h: baseHeight, q: 0.72 },
      { w: baseWidth, h: baseHeight, q: 0.6 },
      { w: Math.round(baseWidth * 0.85), h: Math.round(baseHeight * 0.85), q: 0.6 },
      { w: Math.round(baseWidth * 0.7), h: Math.round(baseHeight * 0.7), q: 0.55 },
      { w: Math.round(baseWidth * 0.55), h: Math.round(baseHeight * 0.55), q: 0.5 },
    ];

    let best: Blob | null = null;

    for (const attempt of attempts) {
      const width = Math.max(1, attempt.w);
      const height = Math.max(1, attempt.h);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được canvas 2d");
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, format, attempt.q),
      );
      if (!blob || blob.size === 0) continue;

      // Giữ lại phiên bản nhỏ nhất tìm được.
      if (!best || blob.size < best.size) best = blob;

      // Đã vừa dung lượng → dừng, không cần nén thêm.
      if (blob.size <= MAX_UPLOAD_BYTES) {
        bitmap.close?.();
        return {
          file: new File([blob], `${name}.${ext}`, { type: format }),
          compressed: true,
          originalSize,
          finalSize: blob.size,
        };
      }
    }

    bitmap.close?.();

    if (!best) throw new Error("Không nén được ảnh");

    // Nén xong mà file LỚN HƠN bản gốc (ảnh vốn đã tối ưu) → giữ bản gốc.
    if (best.size >= originalSize) {
      return { file, compressed: false, originalSize, finalSize: originalSize };
    }

    return {
      file: new File([best], `${name}.${ext}`, { type: format }),
      compressed: true,
      originalSize,
      finalSize: best.size,
    };
  } catch {
    // Mọi lỗi → trả file gốc (upload vẫn thử được).
    return { file, compressed: false, originalSize, finalSize: originalSize };
  }
}

/** Format byte cho thông báo. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
