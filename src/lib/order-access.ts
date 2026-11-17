import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Quyền xem chi tiết đơn hàng cho khách CHƯA đăng nhập.
 *
 * VÌ SAO CẦN FILE NÀY
 * -----------------
 * Trang `/orders/[id]` hiển thị thông tin cá nhân (họ tên, SĐT, email, địa
 * chỉ giao hàng) của đơn hàng. Nếu chỉ dựa vào UUID trong URL thì bất kỳ ai
 * biết UUID cũng xem được → lộ thông tin khách hàng.
 *
 * Cơ chế: sau khi tra cứu / đặt hàng thành công, server ký một token
 * HMAC chứa `orderId` + thời hạn, gửi về client trong cookie `httpOnly`.
 * Trang chi tiết xác thực token đó trước khi render dữ liệu.
 *
 * Khoá HMAC lấy từ `SUPABASE_SERVICE_ROLE_KEY` (secret chỉ có ở server).
 * Nếu biến này không có (demo) → dùng khoá dự phòng để ứng dụng vẫn chạy,
 * chỉ mất tính năng xác thực chéo giữa các phiên.
 *
 * ⚠️ Token KHÔNG thay thế việc xác thực mã đơn + email/số điện thoại ở
 * bước tra cứu — đó mới là lớp xác thực chính. Cookie này chỉ để khách
 * vừa tra cứu mở được trang chi tiết mà không phải nhập lại.
 */

export const ORDER_ACCESS_COOKIE = "bb_order_access";

/** Thời hạn cookie truy cập đơn hàng (7 ngày). */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSigningKey(): string {
  const secret =
    process.env.ORDER_SESSION_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "biasbag-dev-secret-change-me";
  return secret;
}

function hmac(payload: string): string {
  return createHmac("sha256", getSigningKey())
    .update(payload)
    .digest("hex");
}

/** Tạo token truy cập cho một đơn hàng. */
export function createOrderAccessToken(orderId: string): string {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${orderId}.${expiresAt}`;
  return `${expiresAt}.${hmac(payload)}`;
}

/** Kiểm tra token có hợp lệ cho đơn hàng này không. */
export function verifyOrderAccessToken(
  token: string | undefined,
  orderId: string,
): boolean {
  if (!token) return false;

  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = hmac(`${orderId}.${expiresAtRaw}`);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/**
 * Ghi cookie truy cập cho đơn hàng (gọi từ Server Action).
 *
 * `httpOnly` → JavaScript không đọc được. `sameSite: lax` → không bị gửi
 * kèm khi nhảy từ site khác.
 */
export async function grantOrderAccess(orderId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ORDER_ACCESS_COOKIE, createOrderAccessToken(orderId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Đọc cookie truy cập (dùng trong Server Component). */
export async function hasOrderAccess(orderId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ORDER_ACCESS_COOKIE)?.value;
  return verifyOrderAccessToken(token, orderId);
}
