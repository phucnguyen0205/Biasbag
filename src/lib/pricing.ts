/**
 * Tính tiền cho giỏ hàng / đơn hàng — nguồn tính DUY NHẤT.
 *
 * VÌ SAO CẦN FILE NÀY
 * -----------------
 * Trước đây phí ship được hardcode `30_000` ở hai file khác nhau
 * (`checkout-form.tsx` và `cart-view.tsx`), còn server action lại tính `total`
 * KHÔNG kèm phí ship. Kết quả: khách nhìn thấy "Tổng cộng = tạm tính +
 * 30.000" nhưng đơn lưu trong DB lại chỉ có tạm tính → lệch 30.000đ.
 *
 * Ở đây MỌI nơi (UI và server) đều gọi chung `calculateTotals()` với cùng
 * một bộ quy tắc, nên giá hiển thị và giá lưu vào DB luôn khớp.
 *
 * ⚠️ Server action KHÔNG được tin giá do client gửi lên — nó luôn tính lại
 * từ giá trong database rồi mới gọi hàm này (xem `src/app/checkout/actions.ts`).
 */

import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/constants";

export type PriceLine = {
  price: number;
  salePrice?: number | null;
  quantity: number;
};

export type Totals = {
  /** Tổng tiền hàng (chưa gồm phí vận chuyển). */
  subtotal: number;
  /** Phí vận chuyển (0 nếu đạt ngưỡng miễn phí). */
  shipping: number;
  /** Tổng khách phải trả = subtotal + shipping. */
  total: number;
  /** Còn thiếu bao nhiêu để được miễn phí vận chuyển (0 nếu đã đủ). */
  remainingForFreeShipping: number;
  /** Đã đủ điều kiện miễn phí vận chuyển chưa. */
  freeShipping: boolean;
};

/**
 * Tính tổng tiền từ danh sách dòng hàng.
 *
 * @param lines Dòng hàng — dùng `salePrice` nếu có và nhỏ hơn `price`.
 */
export function calculateTotals(lines: PriceLine[]): Totals {
  const subtotal = lines.reduce((sum, l) => {
    const unit =
      l.salePrice != null && l.salePrice < l.price ? l.salePrice : l.price;
    return sum + unit * l.quantity;
  }, 0);

  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = freeShipping ? 0 : SHIPPING_FEE;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    remainingForFreeShipping: freeShipping
      ? 0
      : Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
    freeShipping,
  };
}
