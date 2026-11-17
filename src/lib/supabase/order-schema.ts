/**
 * Helper ghi vào bảng `public.orders` — tương thích với DB chưa migrate.
 *
 * VÌ SAO CẦN FILE NÀY
 * -----------------
 * Migration `20261117050000_order_payment.sql` thêm các cột mới cho `orders`:
 *
 *     order_code, payment_status, paid_at, subtotal, shipping_fee
 *
 * Nếu code được deploy TRƯỚC lúc migration chạy, mọi câu `insert`/`update`
 * có kèm các cột đó sẽ fail với:
 *
 *     column orders.order_code does not exist
 *
 * → Toàn bộ luồng thanh toán sập (không đặt được hàng).
 *
 * Cách xử lý: dò cột một lần (cache trong process), rồi chỉ ghi các cột
 * mà DB thực sự có. Sau khi migration chạy, hành vi vẫn y hệt bình thường
 * và không có round-trip thừa (kết quả được cache).
 *
 * Tương tự `src/lib/supabase/profiles.ts` (dò cột `profiles.phone`).
 */

/** Tập các cột mới của bảng `orders`. */
const NEW_ORDER_COLUMNS = [
  "order_code",
  "payment_status",
  "paid_at",
  "subtotal",
  "shipping_fee",
] as const;

export type NewOrderColumn = (typeof NEW_ORDER_COLUMNS)[number];

/** Cache trạng thái cột: `null` = chưa kiểm tra. */
let orderColumnsCache: Set<NewOrderColumn> | null = null;

/** Client tối thiểu cần cho việc dò cột. */
type ProbeClient = {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (n: number) => {
        maybeSingle: () => PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };
};

/**
 * Dò xem `public.orders` đã có các cột mới chưa.
 *
 * Dùng service role client (bypass RLS). PostgREST tự refresh schema cache
 * sau vài giây nên lần đầu có thể báo "column not found" dù cột đã tồn tại.
 */
export async function detectOrderColumns(
  client: ProbeClient,
): Promise<Set<NewOrderColumn>> {
  if (orderColumnsCache) return orderColumnsCache;

  const found = new Set<NewOrderColumn>();

  // Dò từng cột một: nếu gộp tất cả vào 1 lần select thì chỉ cần 1 round
  // trip, nhưng PostgREST báo lỗi chung "column not found" mà không chỉ ra
  // cột nào → không biết cột nào đã có. Dò từng cột để xác định chính xác.
  // Chỉ chạy 1 lần cho toàn tiến trình (cache).
  await Promise.all(
    NEW_ORDER_COLUMNS.map(async (column) => {
      const { error } = await client
        .from("orders")
        .select(column)
        .limit(1)
        .maybeSingle();

      if (!error) found.add(column);
    }),
  );

  orderColumnsCache = found;
  return found;
}

/**
 * Bỏ các cột chưa tồn tại khỏi payload `orders`.
 *
 * Giữ nguyên kiểu dữ liệu của payload — chỉ lọc key.
 */
export function stripMissingOrderColumns<
  T extends Partial<Record<NewOrderColumn, unknown>>,
>(payload: T, available: Set<NewOrderColumn>): T {
  if (available.size === NEW_ORDER_COLUMNS.length) return payload;

  const result = { ...payload } as Record<string, unknown>;
  for (const column of NEW_ORDER_COLUMNS) {
    if (!available.has(column)) delete result[column];
  }
  return result as T;
}

/** Chỉ dùng cho test — reset cache. */
export function resetOrderColumnCache(): void {
  orderColumnsCache = null;
}
