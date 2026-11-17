/**
 * Tuỳ chọn phiên đăng nhập ("ghi nhớ đăng nhập").
 *
 * Supabase SSR mặc định ghi cookie phiên với `maxAge` 400 ngày. Muốn phiên
 * chỉ sống trong tab trình duyệt (tắt browser là mất), ta phải ghi đè
 * `maxAge` khi set cookie — việc này phải làm ở TẤT CẢ nơi ghi cookie auth:
 *   - Server Action đăng nhập (`src/app/login/actions.ts`)
 *   - Middleware (`src/middleware.ts`) khi refresh token
 *
 * Nếu chỉ xử lý ở một chỗ, middleware sẽ "đánh bóng" cookie phiên thành
 * cookie dài hạn khi refresh token → tuỳ chọn của người dùng bị mất.
 *
 * File này cố tình không import gì từ `next/headers` để dùng được trong
 * middleware (Edge Runtime) lẫn Server Action (Node Runtime).
 */

/** Cookie ghi nhớ lựa chọn "ghi nhớ đăng nhập" của người dùng. */
export const REMEMBER_COOKIE = "biasbag-remember";

/** 1 năm — đủ lâu cho "ghi nhớ đăng nhập". */
const REMEMBER_MAX_AGE = 365 * 24 * 60 * 60;

/** Giá trị cookie: "1" = ghi nhớ, "0" = chỉ phiên trình duyệt. */
export const REMEMBER_ON = "1";
export const REMEMBER_OFF = "0";

/**
 * Ghi đè `maxAge` của cookie auth theo lựa chọn "ghi nhớ đăng nhập".
 *
 * - `remember = true`  → giữ `maxAge` mặc định của @supabase/ssr (400 ngày).
 * - `remember = false` → xoá `maxAge` ⇒ cookie phiên, tự xoá khi đóng browser.
 *
 * Cookie đang bị xoá (`maxAge = 0`) thì giữ nguyên — nếu không sẽ biến lệnh
 * xoá thành cookie phiên và user không bao giờ đăng xuất được.
 */
export function applyRemember(
  options: { maxAge?: number } & Record<string, unknown>,
  remember: boolean,
): { maxAge?: number } & Record<string, unknown> {
  if (remember) return options;
  if (options.maxAge === 0) return options;
  // Bỏ `maxAge` ⇒ cookie phiên (tự xoá khi đóng trình duyệt).
  const rest = { ...options };
  delete rest.maxAge;
  return rest;
}

/** Đọc lựa chọn "ghi nhớ đăng nhập" từ cookie request. */
export function readRemember(
  cookieValue: string | undefined,
  fallback = true,
): boolean {
  if (cookieValue === REMEMBER_ON) return true;
  if (cookieValue === REMEMBER_OFF) return false;
  return fallback;
}

/** Tuỳ chọn cookie cho chính cookie `biasbag-remember`. */
export function rememberCookieOptions(remember: boolean) {
  return {
    path: "/",
    sameSite: "lax" as const,
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  };
}
