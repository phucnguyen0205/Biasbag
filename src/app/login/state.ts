/**
 * Kiểu dữ liệu trạng thái của form đăng nhập / đăng ký.
 *
 * Tách ra khỏi `actions.ts` vì file đó có `"use server"` — Next.js chỉ cho
 * phép export **async function** từ file "use server". Export thêm hằng số
 * hay object sẽ gây lỗi runtime:
 *
 *     A "use server" file can only export async functions, found object.
 */

/** Trạng thái form sau mỗi lần submit. */
export type AuthState = {
  status: "idle" | "error";
  /** Thông báo lỗi chung (đẩy lên đầu form). */
  message?: string;
  /** Lỗi theo từng trường — hiển thị ngay dưới input. */
  fieldErrors?: Record<string, string>;
  /** Đường dẫn nội bộ để chuyển hướng sau khi thành công. */
  redirectTo?: string;
};

/** State ban đầu cho `useActionState`. */
export const initialAuthState: AuthState = { status: "idle" };
