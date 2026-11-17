/**
 * Mã đơn hàng — nguồn sinh DUY NHẤT.
 *
 * Định dạng: `BB-YYMMDD-000123`
 *   - `BB`     → viết tắt BIAS BAG
 *   - `YYMMDD` → ngày đặt hàng (tra cứu theo ngày rất tiện)
 *   - `000123` → số thứ tự tăng dần (duy nhất tuyệt đối)
 *
 * Mã này là thông tin khách cần nhớ để tra cứu đơn khi KHÔNG đăng nhập.
 * Vì vậy nó phải:
 *   1. Dễ đọc / dễ gõ lại (viết hoa, dấu `-` rõ ràng).
 *   2. Đủ dài để không đoán trúng (6 chữ số + ngày).
 *
 * ⚠️ Nguồn số thứ tự CHÍNH XÁC là sequence `public.order_code_seq` trong
 * Postgres (hàm `next_order_code()`), đảm bảo 2 đơn song song không trùng.
 * Hàm `fallbackOrderCode()` ở đây chỉ dùng khi DB chưa có sequence
 * (demo / chưa migrate) — khi đó mã sinh từ timestamp + random.
 */

/** Chuẩn hoá mã đơn về dạng `BB-YYMMDD-000123` (uppercase, gọn). */
export function normalizeOrderCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/** Mã đơn dự phòng khi DB chưa có sequence `next_order_code()`. */
export function fallbackOrderCode(date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `BB-${yy}${mm}${dd}-${seq}`;
}

/**
 * Mã đơn hiển thị từ UUID (dùng cho đơn cũ chưa có cột `order_code`).
 *
 * Lấy 6 ký tự đầu của UUID không gạch, uppercase → gọn và vẫn duy nhất
 * trong phạm vi thực tế.
 */
export function orderCodeFromId(id: string): string {
  const hex = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `BB-${hex}`;
}
