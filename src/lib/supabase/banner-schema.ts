/**
 * Helper ghi vào bảng `public.banners` — tương thích với DB chưa migrate.
 *
 * VÌ SAO CẦN FILE NÀY
 * -----------------
 * Migration `20261117193000_banner_mobile_image.sql` thêm cột
 * `image_url_mobile` cho bảng `banners`:
 *
 *     image_url_mobile text
 *
 * Nếu code được deploy TRƯỚC khi migration chạy, mọi câu `insert`/`update`
 * có kèm cột đó sẽ fail với:
 *
 *     column banners.image_url_mobile does not exist
 *
 * → Admin không thêm/sửa được banner.
 *
 * Cách xử lý: dò cột một lần (cache trong process), rồi chỉ ghi cột mà DB
 * thực sự có. Sau khi migration chạy, hành vi y hệt bình thường và không có
 * round-trip thừa (kết quả được cache).
 *
 * Tương tự `src/lib/supabase/order-schema.ts` (dò cột `orders.*`).
 */

/** Tập các cột mới của bảng `banners`. */
const NEW_BANNER_COLUMNS = ["image_url_mobile"] as const;

export type NewBannerColumn = (typeof NEW_BANNER_COLUMNS)[number];

/** Cache trạng thái cột: `null` = chưa kiểm tra. */
let bannerColumnsCache: Set<NewBannerColumn> | null = null;

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
 * Dò xem `public.banners` đã có các cột mới chưa.
 *
 * Dùng service role client (bypass RLS). PostgREST tự refresh schema cache
 * sau vài giây nên lần đầu có thể báo "column not found" dù cột đã tồn tại.
 */
export async function detectBannerColumns(
  client: ProbeClient,
): Promise<Set<NewBannerColumn>> {
  if (bannerColumnsCache) return bannerColumnsCache;

  const found = new Set<NewBannerColumn>();

  // Dò từng cột một: nếu gộp tất cả vào 1 lần select thì PostgREST báo lỗi
  // chung "column not found" mà không chỉ ra cột nào → không biết cột nào đã
  // có. Dò từng cột để xác định chính xác. Chỉ chạy 1 lần cho toàn tiến
  // trình (cache).
  await Promise.all(
    NEW_BANNER_COLUMNS.map(async (column) => {
      const { error } = await client
        .from("banners")
        .select(column)
        .limit(1)
        .maybeSingle();

      if (!error) found.add(column);
    }),
  );

  bannerColumnsCache = found;
  return found;
}

/**
 * Bỏ các cột chưa tồn tại khỏi payload `banners`.
 *
 * Giữ nguyên kiểu dữ liệu của payload — chỉ lọc key.
 */
export function stripMissingBannerColumns<
  T extends Partial<Record<NewBannerColumn, unknown>>,
>(payload: T, available: Set<NewBannerColumn>): T {
  if (available.size === NEW_BANNER_COLUMNS.length) return payload;

  const result = { ...payload } as Record<string, unknown>;
  for (const column of NEW_BANNER_COLUMNS) {
    if (!available.has(column)) delete result[column];
  }
  return result as T;
}

/** Chỉ dùng cho test — reset cache. */
export function resetBannerColumnCache(): void {
  bannerColumnsCache = null;
}
