/**
 * ════════════════════════════════════════════════════════════════════════
 * PHÁT HIỆN COOKIE PHIÊN SUPABASE — KHÔNG CẦN `supabase-js`
 * ════════════════════════════════════════════════════════════════════════
 *
 * ── Vấn đề ────────────────────────────────────────────────────────────────
 *
 * `supabase-js` + `@supabase/ssr` là **~260KB** JavaScript (chunk `6140` +
 * `44530001` trong build production). Chỉ cần để biết "khách đã đăng nhập
 * chưa" và "role là gì" — nhưng lại được tải cho MỌI khách, kể cả khách
 * không đăng nhập (đa số).
 *
 * Hậu quả trên Lighthouse / PageSpeed:
 *   • 260KB JS tải xuống → nặng băng thông, cạnh tranh với ảnh LCP.
 *   • Chunk `6140` (193KB) parse + evaluate mất ~150ms trên main thread
 *     ⇒ TBT tăng, LCP render delay tăng.
 *
 * ── Giải pháp ────────────────────────────────────────────────────────────
 *
 * Cookie phiên của `@supabase/ssr` tên theo mẫu:
 *
 *   sb-<project-ref>-auth-token[.0][.1]...
 *
 * ⇒ Chỉ cần đọc `document.cookie` là biết khách đã đăng nhập hay chưa,
 * KHÔNG cần nạp thư viện 260KB.
 *
 *   • Khách KHÔNG đăng nhập (đa số) → không bao giờ nạp `supabase-js`.
 *   • Khách ĐÃ đăng nhập → nạp `supabase-js` như cũ để lấy role + nghe
 *     `onAuthStateChange` (giữ nguyên hành vi đăng nhập/đăng xuất).
 *
 * Rủi ro = 0: đường đăng nhập không đổi, chỉ là "khách vãng lai" không
 * phải tải thư viện không cần.
 */

/**
 * Project ref của Supabase, lấy từ `NEXT_PUBLIC_SUPABASE_URL`.
 *
 * Ví dụ: `https://abcxyz.supabase.co` → `abcxyz`.
 */
function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;

  try {
    const host = new URL(url).hostname;
    // `xxx.supabase.co` → `xxx`; `xxx.<region>.supabase.co` → `xxx`
    const first = host.split(".")[0];
    return first || null;
  } catch {
    return null;
  }
}

/** Tên cookie phiên (không kể hậu tố chunk `.0`, `.1`…). */
export function getAuthCookieName(): string | null {
  const ref = getProjectRef();
  return ref ? `sb-${ref}-auth-token` : null;
}

/**
 * `true` nếu trình duyệt hiện đang có cookie phiên Supabase.
 *
 * Chỉ cần kiểm tra TÊN cookie có tồn tại — không cần đọc/ghi giải mã nội
 * dung (token có thể là chunked, base64url, còn refresh token…).
 */
export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;

  const name = getAuthCookieName();
  if (!name) return false;

  // `document.cookie` = "a=1; b=2" → so sánh theo tên, có thể có hậu tố
  // chunk (`.0`, `.1`).
  const prefix = `${name}=`;
  const chunkPrefix = `${name}.`;

  for (const part of document.cookie.split(";")) {
    const c = part.trim();
    if (c.startsWith(prefix) || c.startsWith(chunkPrefix)) {
      // Cookie rỗng (giá trị "") = đã bị xoá → coi như chưa đăng nhập.
      const value = c.slice(c.indexOf("=") + 1);
      if (value.length > 0) return true;
    }
  }

  return false;
}
