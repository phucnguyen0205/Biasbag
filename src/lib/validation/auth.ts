import { z } from "zod";

/**
 * Schema dùng chung cho cả client và server.
 *
 * - Client: kiểm tra nhanh trước khi gửi (không mất thời gian round-trip).
 * - Server: nguồn kiểm tra duy nhất được tin cậy (client có thể bị giả mạo).
 *
 * Vì vậy thông báo lỗi được viết ở đây một lần, không lặp lại ở hai nơi.
 */

/** Chuẩn hoá email: bỏ khoảng trắng + hạ chữ thường (email không phân biệt hoa thường). */
const email = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email")
  .email("Email không hợp lệ")
  .transform((v) => v.toLowerCase());

/** Số điện thoại Việt Nam: 10 số bắt đầu bằng 0, hoặc dạng +84. */
const phone = z
  .string()
  .trim()
  .regex(
    /^(?:\+?84|0)(?:[35789]\d{8})$/,
    "Số điện thoại chưa hợp lệ (VD: 0901234567)",
  );

/** Họ tên — dùng chung cho đăng ký và cập nhật hồ sơ. */
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Vui lòng nhập họ tên")
  .max(60, "Họ tên không được vượt quá 60 ký tự");

/** Mật khẩu — dùng chung cho đăng ký và đăng nhập. */
export const passwordSchema = z.string().min(1, "Vui lòng nhập mật khẩu");

export const loginSchema = z.object({
  email,
  password: passwordSchema,
  /** Ghi nhớ đăng nhập → cookie phiên dài hạn thay vì cookie tới khi đóng trình duyệt. */
  remember: z.boolean().default(false),
});

export const registerSchema = z
  .object({
    fullName: fullNameSchema,
    email,
    phone,
    password: z
      .string()
      .min(6, "Mật khẩu tối thiểu 6 ký tự")
      .max(72, "Mật khẩu không được vượt quá 72 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Bạn cần đồng ý điều khoản để tiếp tục" }),
    }),
    remember: z.boolean().default(false),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

/** Cập nhật hồ sơ — chỉ tên + số điện thoại (không cho đổi email/role). */
export const profileSchema = z.object({
  fullName: fullNameSchema,
  phone,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * Chấm độ mạnh mật khẩu (0–4) để hiển thị thanh tiến trình.
 *
 * Nguyên tắc: càng dài + càng nhiều nhóm ký tự (hoa, thường, số, ký hiệu)
 * thì càng mạnh. Không cần phức tạp — chỉ để người dùng biết mình nên tăng độ khó.
 */
export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!password) return { score: 0, label: "Chưa nhập" };

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score += 1;

  const labels = ["Rất yếu", "Yếu", "Tạm ổn", "Khá mạnh", "Rất mạnh"];
  const index = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: index, label: labels[index] };
}
