/**
 * Helper ghi vào bảng `public.profiles` — tương thích với DB chưa migrate.
 *
 * VÌ SAO CẦN FILE NÀY
 * -----------------
 * Cột `profiles.phone` được thêm ở schema mới (`supabase/schema.sql`).
 * Nếu code được deploy TRƯỚC lúc migration chạy, mọi câu `insert`/`update`
 * có kèm cột `phone` sẽ fail với:
 *
 *     column profiles.phone does not exist
 *
 * → Toàn bộ luồng đăng ký / cập nhật hồ sơ sập.
 *
 * Cách xử lý: dò cột `phone` một lần (cache trong process), rồi chỉ ghi cột
 * đó khi DB thực sự có. Sau khi migration chạy, hành vi vẩn y hệt bình
 * thường và không có round-trip thừa (kết quả được cache).
 *
 * Lưu ý: số điện thoại LUÔN được lưu trong `auth.users.raw_user_meta_data`
 * (đã có sẵn, không cần migration), nên tính năng không bị ảnh hưởng dù
 * cột `profiles.phone` chưa tồn tại.
 */

/** Cache trạng thái cột `phone`: `null` = chưa kiểm tra. */
let phoneColumnExists: boolean | null = null;

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
 * Kiểm tra bảng `public.profiles` có cột `phone` không.
 *
 * Dùng service role client (bypass RLS). PostgREST tự refresh schema cache
 * sau vài giây nên lần đầu có thể báo "column not found" dù cột đã tồn tại.
 */
export async function hasPhoneColumn(client: ProbeClient): Promise<boolean> {
  if (phoneColumnExists !== null) return phoneColumnExists;

  const { error } = await client
    .from("profiles")
    .select("phone")
    .limit(1)
    .maybeSingle();

  // Cột thực sự không tồn tại ⇔ PostgREST báo lỗi nhắc tới `phone`.
  phoneColumnExists = error ? !/phone/i.test(error.message) : true;
  return phoneColumnExists;
}

/** Bỏ cột `phone` khỏi payload nếu DB chưa có cột đó. */
export function stripPhone<T extends { phone?: string | null }>(
  payload: T,
  hasPhone: boolean,
): Omit<T, "phone"> | T {
  if (hasPhone) return payload;
  const { phone: _omit, ...rest } = payload;
  void _omit;
  return rest;
}

/** Chỉ dùng cho test — reset cache. */
export function resetPhoneColumnCache(): void {
  phoneColumnExists = null;
}
