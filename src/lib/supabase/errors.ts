/**
 * Xử lý lỗi truy vấn Supabase.
 *
 * Phân biệt 2 loại lỗi:
 *   - "Schema chưa được tạo" (bảng chưa tồn tại) — đây là trạng thái bình
 *     thường khi mới cài đặt, app dùng dữ liệu mẫu fallback. Chỉ cảnh báo
 *     1 lần cho mỗi bảng để tránh spam console mỗi lần render.
 *   - Lỗi thực sự (sai key, mất mạng, RLS…) — log đầy đủ.
 */

/** Mã lỗi PostgREST khi bảng không tồn tại trong schema cache. */
const SCHEMA_CACHE_CODES = new Set([
  "PGRST205", // table not found
  "42P01", // undefined_table (Postgres error code)
]);

const schemaWarned = new Set<string>();

/** Kiểm tra lỗi có phải do schema chưa được tạo không. */
export function isSchemaNotReadyError(message: string): boolean {
  if (SCHEMA_CACHE_CODES.has(message.trim())) return true;
  return (
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

/**
 * Ghi log lỗi truy vấn.
 *
 * @param scope   Tên hàm bị lỗi, ví dụ "getProducts"
 * @param message Thông điệp lỗi từ Supabase
 */
export function logQueryError(scope: string, message: string): void {
  if (isSchemaNotReadyError(message)) {
    // Chỉ cảnh báo 1 lần cho mỗi bảng để không spam console.
    const table = message.match(/table '([^']+)'/)?.[1] ?? message;
    if (schemaWarned.has(table)) return;
    schemaWarned.add(table);
    console.warn(
      `[${scope}] Bảng "${table}" chưa được tạo — đang dùng dữ liệu mẫu. ` +
        `Chạy supabase/schema.sql trong Supabase SQL Editor để dùng database thật.`,
    );
    return;
  }

  console.error(`[${scope}]`, message);
}
