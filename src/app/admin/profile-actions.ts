"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getSupabaseEnvReport } from "@/lib/supabase/env-check";

export type ProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Thông báo riêng cho form đổi mật khẩu (không reset form email). */
  passwordMessage?: string;
  fieldErrors?: Record<string, string>;
};

/* ------------------------------------------------------------------ */
/*  Validation                                                          */
/* ------------------------------------------------------------------ */

const emailSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập email.")
  .email("Email không hợp lệ.")
  .max(255, "Email quá dài.");

const passwordSchema = z
  .string()
  .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
  .max(72, "Mật khẩu quá dài.")
  .regex(/[a-zA-Z]/, "Mật khẩu phải có ít nhất 1 chữ cái.")
  .regex(/[0-9]/, "Mật khẩu phải có ít nhất 1 chữ số.");

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Lấy user đang đăng nhập + kiểm tra có quyền quản trị.
 *
 * Dùng service role để đọc role (RLS `profiles_select_own` chỉ cho đọc
 * chính mình — đủ dùng ở đây, nhưng fallback admin client giúp trường hợp
 * deploy thiếu cấu hình).
 */
async function requireAdmin() {
  if (!isSupabaseConfigured()) return null;

  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;

  let role: string | null = null;
  try {
    const { data } = await session
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = data?.role ?? null;
  } catch {
    // Bỏ qua, thử admin client.
  }

  if (role !== "admin" && role !== "staff") {
    try {
      const admin = await createAdminClient();
      const { data } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = data?.role ?? null;
    } catch {
      return null;
    }
  }

  if (role !== "admin" && role !== "staff") return null;

  return { user, role };
}

/** Thông báo lỗi khi thiếu service role key trên production. */
function missingServiceKeyMessage(): string {
  const report = getSupabaseEnvReport();
  if (report.missingOptional.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return (
      "Máy chủ thiếu biến môi trường SUPABASE_SERVICE_ROLE_KEY nên chưa thể " +
      "đổi email/mật khẩu. Vui lòng thêm biến này trong cấu hình hosting và deploy lại."
    );
  }
  return "Không thể thực hiện lúc này. Vui lòng thử lại.";
}

/* ------------------------------------------------------------------ */
/*  Đổi email                                                            */
/* ------------------------------------------------------------------ */

/**
 * Đổi email (gmail) của tài khoản admin.
 *
 * Email mới được `email_confirm: true` ngay để không phải chờ email xác nhận
 * (nếu không, admin sẽ bị khoá đăng nhập cho tới khi bấm link).
 */
export async function updateAdminEmail(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Chưa cấu hình Supabase." };
  }

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại email.",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "" },
    };
  }

  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền.",
    };
  }

  const newEmail = parsed.data.toLowerCase();
  const currentEmail = auth.user.email?.toLowerCase() ?? null;

  if (newEmail === currentEmail) {
    return { status: "error", message: "Email mới trùng với email hiện tại." };
  }

  let admin;
  try {
    admin = await createAdminClient();
  } catch {
    return { status: "error", message: missingServiceKeyMessage() };
  }

  // 1. Đổi email trong Supabase Auth.
  const { error: authError } = await admin.auth.admin.updateUserById(auth.user.id, {
    email: newEmail,
    email_confirm: true,
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        status: "error",
        message: "Email này đã được dùng cho tài khoản khác.",
      };
    }
    return { status: "error", message: authError.message };
  }

  // 2. Đồng bộ bảng `profiles` (RLS chặn user tự sửa → dùng service role).
  const { error: profileError } = await admin
    .from("profiles")
    .update({ email: newEmail, updated_at: new Date().toISOString() })
    .eq("id", auth.user.id);

  if (profileError) {
    return {
      status: "error",
      message: `Đã đổi email trong hệ thống đăng nhập nhưng chưa cập nhật được hồ sơ: ${profileError.message}`,
    };
  }

  revalidatePath("/admin/profile");
  revalidatePath("/admin", "layout");

  return {
    status: "success",
    message: `Đã đổi email thành ${newEmail}. Hãy đăng nhập lại bằng email mới.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Đổi mật khẩu                                                         */
/* ------------------------------------------------------------------ */

/**
 * Đổi mật khẩu của tài khoản admin.
 *
 * Bắt buộc nhập mật khẩu hiện tại để tránh ai đó mượn phiên đăng nhập cũng
 * đổi được mật khẩu.
 */
export async function updateAdminPassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Chưa cấu hình Supabase." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: Record<string, string> = {};

  if (!currentPassword) {
    fieldErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
  }

  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    fieldErrors.newPassword = parsed.error.issues[0]?.message ?? "Mật khẩu chưa hợp lệ.";
  }

  if (newPassword !== confirmPassword) {
    fieldErrors.confirmPassword = "Xác nhận mật khẩu không khớp.";
  }

  if (Object.keys(fieldErrors).length) {
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin mật khẩu.",
      fieldErrors,
    };
  }

  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền.",
    };
  }

  // 1. Xác thực mật khẩu hiện tại.
  const session = await createClient();
  const { error: verifyError } = await session.auth.signInWithPassword({
    email: auth.user.email ?? "",
    password: currentPassword,
  });

  if (verifyError) {
    return {
      status: "error",
      message: "Mật khẩu hiện tại không đúng.",
      passwordMessage: "Mật khẩu hiện tại không đúng.",
      fieldErrors: { currentPassword: "Mật khẩu hiện tại không đúng." },
    };
  }

  // 2. Đặt mật khẩu mới.
  let admin;
  try {
    admin = await createAdminClient();
  } catch {
    return {
      status: "error",
      passwordMessage: missingServiceKeyMessage(),
    };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    auth.user.id,
    { password: newPassword },
  );

  if (updateError) {
    return {
      status: "error",
      passwordMessage: updateError.message,
    };
  }

  revalidatePath("/admin/profile");

  return {
    status: "success",
    passwordMessage: "Đã đổi mật khẩu thành công.",
  };
}
