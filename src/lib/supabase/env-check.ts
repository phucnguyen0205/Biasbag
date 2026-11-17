/**
 * Kiểm tra cấu hình môi trường Supabase.
 *
 * Mục đích: khi deploy lên Vercel mà thiếu biến môi trường, lỗi hiện ra
 * rất khó hiểu (đăng nhập admin bị đẩy về `/account`, đơn hàng không tạo
 * được…). Hàm này gom các biến bắt buộc + biến hay quên thành 1 danh sách
 * để log ra server log và hiển thị cho admin.
 */

export type SupabaseEnvReport = {
  ok: boolean;
  /** Biến bắt buộc — thiếu là app không hoạt động. */
  missing: string[];
  /** Biến nên có — thiếu thì một số chức năng sẽ hỏng (vd: admin login). */
  missingOptional: string[];
};

/**
 * Biến CẦN CÓ để các chức năng quản trị hoạt động trên production.
 *
 * - `SUPABASE_SERVICE_ROLE_KEY`: dùng để tạo user, đổi email/mật khẩu admin,
 *   ghi hồ sơ (RLS cố tình chặn user tự sửa hồ sơ).
 * - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: fallback key nếu dùng anon key cũ.
 */

/**
 * Lấy danh sách biến môi trường đang thiếu.
 *
 * Hàm này chạy được cả ở Edge Runtime (middleware) lẫn Node runtime.
 */
export function getSupabaseEnvReport(): SupabaseEnvReport {
  const missing: string[] = [];
  const missingOptional: string[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publishable) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  // `SUPABASE_SERVICE_ROLE_KEY` — không bắt buộc cho trang công khai, nhưng
  // thiếu thì admin login / đổi email / đổi mật khẩu sẽ hỏng.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missingOptional.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) {
    missingOptional.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { ok: missing.length === 0, missing, missingOptional };
}

/** True nếu có service role key — dùng để gate các chức năng admin. */
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Log cảnh báo cấu hình thiếu (chỉ 1 lần mỗi process để tránh spam log).
 */
let warned = false;
export function warnMissingEnv(): void {
  if (warned) return;
  warned = true;

  const report = getSupabaseEnvReport();
  if (report.missing.length) {
    console.error(
      `[supabase] THIẾU biến môi trường bắt buộc: ${report.missing.join(", ")}. ` +
        `Ứng dụng sẽ không hoạt động.`,
    );
  }
  if (report.missingOptional.length) {
    console.warn(
      `[supabase] Thiếu biến môi trường khuyến nghị: ${report.missingOptional.join(", ")}. ` +
        `Các chức năng quản trị (đăng nhập admin, đổi email/mật khẩu) có thể không hoạt động.`,
    );
  }
}
