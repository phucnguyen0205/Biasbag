/**
 * Truy vấn đơn hàng — dùng chung cho khách hàng và admin.
 *
 * Vì sao tách riêng khỏi `src/lib/data/products.ts`?
 *   - Truy vấn đơn hàng luôn cần service role (khách chưa đăng nhập có
 *     `user_id = null` → RLS chặn `anon` đọc `orders`).
 *   - Tra cứu đơn của khách là luồng thanh toán, không phải luồng dữ liệu
 *     sản phẩm.
 */

import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { normalizeOrderCode, orderCodeFromId } from "@/lib/order-code";
import type { Order, OrderItem } from "@/lib/types";

/**
 * Chuẩn hoá bản ghi đơn để hiển thị.
 *
 * Đơn cũ (tạo trước khi có cột `order_code`) sẽ có `order_code = null` →
 * sinh mã hiển thị từ `id` để khách vẫn có mã tra cứu.
 */
export function withOrderCode(order: Order): Order & { displayCode: string } {
  return {
    ...order,
    displayCode: order.order_code?.trim() || orderCodeFromId(order.id),
  };
}

/**
 * Các cột mới của bảng `orders` (thêm ở migration `order_payment`).
 *
 * Nếu DB chưa chạy migration thì `select("*")` vẫn hoạt động (chỉ thiếu
 * field), nhưng `select("order_code")` sẽ lỗi. Vì vậy mọi truy vấn dùng
 * `select("*")` và các field mới được đọc an toàn qua `?? default`.
 */
export function orderSubtotal(order: Order): number {
  return Number(order.subtotal ?? 0);
}

export function orderShippingFee(order: Order): number {
  return Number(order.shipping_fee ?? 0);
}

export function orderPaymentStatus(order: Order): string {
  return order.payment_status ?? "unpaid";
}

/**
 * Chi tiết sản phẩm của một đơn.
 *
 * Dùng service role: RLS của `order_items` chỉ cho `authenticated` đọc được
 * đơn của chính mình (`auth.uid() = orders.user_id`). Đơn của khách CHƯA
 * đăng nhập có `user_id = null` → policy chặn → `items` rỗng → trang chi
 * tiết hiện "Sản phẩm trong đơn (0)" dù đơn có sản phẩm.
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = await createAdminClient();
  const { data } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("id");
  return data ?? [];
}

/** Tất cả đơn hàng (admin). */
export async function getOrders(): Promise<Order[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = await createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Đơn hàng của người dùng đang đăng nhập.
 *
 * Dùng service role vì RLS chỉ cho `authenticated` đọc đơn của chính mình
 * (`auth.uid() = user_id`) — vẫn đúng, nhưng dùng admin client giúp nhất
 * quán và tránh rủi ro policy lệch phiên bản.
 */
export async function getMyOrders(): Promise<Order[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = await createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Tra cứu đơn hàng bằng mã đơn + email (khách chưa đăng nhập).
 *
 * ⚠️ Bảo mật: bắt buộc phải khớp CẢ mã đơn LẪN email (hoặc số điện thoại).
 * Chỉ dựa vào mã đơn là không đủ — mã đơn có thể bị đoán/dò.
 *
 * @returns Đơn hàng nếu tìm thấy, `null` nếu không khớp.
 */
export async function lookupOrderByCode(
  code: string,
  contact: string,
): Promise<Order | null> {
  if (!isSupabaseConfigured()) return null;

  const normalized = normalizeOrderCode(code);
  if (!normalized) return null;

  const needle = contact.trim().toLowerCase();
  if (!needle) return null;

  const admin = await createAdminClient();

  // Ưu tiên tìm theo `order_code` (nhanh, có index).
  //
  // Nếu DB chưa chạy migration thì cột `order_code` chưa tồn tại → PostgREST
  // báo lỗi column not found. Khi đó fallback sang tìm theo mã hiển thị từ
  // `id` (đơn cũ).
  let order: Order | null = null;

  const { data: byCode, error: byCodeError } = await admin
    .from("orders")
    .select("*")
    .eq("order_code", normalized)
    .limit(1);

  if (!byCodeError && byCode?.length) {
    order = byCode[0];
  } else {
    // Đơn cũ chưa có `order_code` → thử tìm theo mã hiển thị từ `id`.
    const suffix = normalized.replace(/^BB-/, "").toLowerCase();
    if (suffix.length >= 4) {
      const { data: byId } = await admin
        .from("orders")
        .select("*")
        .like("id", `${suffix}%`)
        .limit(1);
      order = byId?.[0] ?? null;
    }
  }

  if (!order) return null;

  // Xác thực chủ đơn: email hoặc số điện thoại phải khớp.
  const email = order.customer_email?.toLowerCase() ?? "";
  const phone = order.customer_phone?.replace(/\s/g, "") ?? "";
  const contactDigits = needle.replace(/\s/g, "");

  const match =
    email === needle ||
    phone === contactDigits ||
    phone === contactDigits.replace(/^\+84/, "0");

  return match ? order : null;
}

/** Một đơn hàng cụ thể (theo id) — dùng cho trang xác nhận / chi tiết. */
export async function getOrderById(id: string): Promise<Order | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = await createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}
