"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createAdminClient,
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  REMEMBER_COOKIE,
  REMEMBER_OFF,
  REMEMBER_ON,
  rememberCookieOptions,
} from "@/lib/supabase/session";
import { loginSchema, profileSchema, registerSchema } from "@/lib/validation/auth";
import { hasPhoneColumn, stripPhone } from "@/lib/supabase/profiles";
import type { Role } from "@/lib/auth";
import type { AuthState } from "./state";

/** Trang dành cho admin/staff sau khi đăng nhập. */
const ADMIN_HOME = "/admin";
/** Trang dành cho khách hàng sau khi đăng nhập. */
const CUSTOMER_HOME = "/account";

/**
 * Chỉ chấp nhận đường dẫn nội bộ — chống open redirect.
 *
 * `//evil.com` là URL protocol-relative (bị hiểu là domain khác) nên phải chặn.
 */
function safeNext(next: string | undefined | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.startsWith("/login")) return null;
  return next;
}

/** Chuyển lỗi Supabase sang thông báo tiếng Việt thân thiện. */
function mapAuthError(message: string, fallback: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không đúng. Vui lòng thử lại.";
  }
  if (m.includes("email not confirmed")) {
    return "Tài khoản chưa được xác nhận. Hãy đăng ký lại để nhận email xác nhận.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.";
  }
  if (m.includes("password should be")) {
    return "Mật khẩu quá yếu — cần tối thiểu 6 ký tự.";
  }
  if (m.includes("email rate limit")) {
    return "Hệ thống đang bận. Vui lòng thử lại sau ít phút.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 1–2 phút rồi thử lại.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  }
  return fallback;
}

/**
 * Đọc role của user từ bảng `profiles`.
 *
 * ⚠️ Vì sao KHÔNG dùng service role làm nguồn chính:
 * `createAdminClient()` cần biến `SUPABASE_SERVICE_ROLE_KEY`. Trên môi
 * trường deploy (Vercel) biến này có thể chưa được set (hoặc đặt sai tên),
 * khiến `createAdminClient()` ném lỗi → `signIn` nuốt lỗi và mặc định role
 * là `customer` ⇒ admin bị đẩy về `/account` và không vào được `/admin`.
 *
 * Cách sửa: đọc role bằng CHÍNH session của user (RLS policy
 * `profiles_select_own` cho phép `id = auth.uid()`), chỉ fallback sang
 * service role khi client theo session không đọc được.
 */
async function fetchRole(userId: string): Promise<Role> {
  // 1) Ưu tiên client theo session — luôn có sẵn, không cần service role.
  try {
    const session = await createClient();
    const { data, error } = await session
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.role) return data.role as Role;
  } catch {
    // Bỏ qua, thử cách 2.
  }

  // 2) Fallback: service role (bỏ qua RLS).
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const role = data?.role as Role | undefined;
    return role ?? "customer";
  } catch {
    return "customer";
  }
}

/**
 * Đăng nhập — dùng chung cho cả khách hàng và admin.
 *
 * Form này là MỘT form duy nhất; khác biệt chỉ nằm ở tài khoản:
 * - Khách đăng ký qua form → role `customer` (tự động, không tự chọn được).
 * - Admin là tài khoản riêng biệt, được tạo sẵn trong Supabase Auth và nâng
 *   role `admin` — không ai tự đăng ký được role admin từ form này.
 *
 * Sau khi đăng nhập, hướng điểm đến được chọn theo role:
 * - admin/staff → `/admin`
 * - customer    → `/account`
 * - `?next=` (đường dẫn nội bộ) được ưu tiên nếu có.
 */
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Chưa cấu hình Supabase. Hãy điền .env.local (xem .env.example) rồi chạy lại dev server.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin đăng nhập.",
      fieldErrors,
    };
  }

  const { email, password: rawPassword, remember } = parsed.data;
  const next = safeNext(formData.get("next") as string | null);

  // Cắt khoảng trắng thừa ở hai đầu mật khẩu — nguyên nhân rất hay gặp khi
  // copy/paste từ Notepad, email hoặc password manager (dán cả dấu cách vào
  // cuối) → Supabase báo "Invalid login credentials" dù mật khẩu đúng.
  const password = rawPassword.trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Tài khoản tạo bằng service role mà chưa xác nhận email sẽ bị Supabase từ
  // chối ("Email not confirmed"). Với tài khoản admin được tạo qua script
  // `npm run auth:admin` điều này có thể xảy ra nếu admin đổi email mà chưa
  // xác nhận. Ta tự xác nhận rồi thử lại thay vì bắt user chờ email.
  if (error && !data.user && error.message.toLowerCase().includes("not confirmed")) {
    const confirmed = await confirmEmail(email);
    if (confirmed) {
      const retry = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!retry.error && retry.data.user) {
        return completeSignIn(retry.data.user.id, next, remember);
      }
    }
  }

  if (error || !data.user) {
    return {
      status: "error",
      message: mapAuthError(
        error?.message ?? "",
        "Không thể đăng nhập. Vui lòng thử lại.",
      ),
    };
  }

  return completeSignIn(data.user.id, next, remember);
}

/**
 * Xác nhận email của một tài khoản (dùng service role).
 *
 * Trả về `true` nếu xác nhận thành công. Nuốt lỗi để không làm hỏng luồng
 * đăng nhập — nếu thiếu service role key thì đơn giản là không xác nhận được.
 */
async function confirmEmail(email: string): Promise<boolean> {
  try {
    const admin = await createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const user = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!user) return false;
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true },
    );
    return !updateError;
  } catch {
    return false;
  }
}

/**
 * Hoàn tất đăng nhập: ghi cookie "ghi nhớ", đọc role và trả về đường đi.
 */
async function completeSignIn(
  userId: string,
  next: string | null,
  remember: boolean,
): Promise<AuthState> {
  // Lưu lựa chọn "ghi nhớ đăng nhập" để middleware giữ đúng thời hạn cookie.
  const cookieStore = await cookies();
  cookieStore.set(
    REMEMBER_COOKIE,
    remember ? REMEMBER_ON : REMEMBER_OFF,
    rememberCookieOptions(remember),
  );

  const role = await fetchRole(userId);
  const redirectTo =
    next ?? (role === "admin" || role === "staff" ? ADMIN_HOME : CUSTOMER_HOME);

  revalidatePath("/", "layout");
  return { status: "idle", redirectTo };
}

/**
 * Đăng ký tài khoản khách hàng mới.
 *
 * Luồng: tạo user trong Supabase Auth (tự xác nhận email → không cần chờ
 * email xác nhận, giảm ma sát khi mua hàng) → ghi hồ sơ vào `profiles` →
 * đăng nhập luôn để khách vào được tài khoản ngay.
 *
 * Không bao giờ nhận `role` từ client — mọi tài khoản tự đăng ký đều là
 * `customer`. Admin phải được tạo riêng (script `npm run auth:admin`).
 */
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Chưa cấu hình Supabase. Hãy điền .env.local (xem .env.example) rồi chạy lại dev server.",
    };
  }

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms") === "on",
    remember: formData.get("remember") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin đăng ký.",
      fieldErrors,
    };
  }

  const { fullName, email, phone, password, remember } = parsed.data;
  const next = safeNext(formData.get("next") as string | null);

  const admin = await createAdminClient();

  // 1. Tạo user trong Supabase Auth.
  //    `email_confirm: true` → không cần chờ email xác nhận.
  const { data: created, error: createError } = await admin.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    },
  );

  if (createError || !created.user) {
    return {
      status: "error",
      message: mapAuthError(
        createError?.message ?? "",
        "Không thể tạo tài khoản. Vui lòng thử lại.",
      ),
    };
  }

  // 2. Ghi hồ sơ vào `profiles` (role luôn là `customer`).
  //    Trigger `handle_new_user` đã tạo sẵn dòng với role mặc định, nên ở đây
  //    ta upsert để chắc chắn đủ thông tin (email + tên + số điện thoại).
  //
  //    `stripPhone` bỏ cột `phone` nếu DB chưa chạy migration thêm cột đó —
  //    nếu không, upsert sẽ fail và người dùng không đăng ký được.
  const hasPhone = await hasPhoneColumn(admin);
  const { error: profileError } = await admin.from("profiles").upsert(
    stripPhone(
      {
        id: created.user.id,
        email,
        full_name: fullName,
        phone,
        role: "customer",
        updated_at: new Date().toISOString(),
      },
      hasPhone,
    ),
    { onConflict: "id" },
  );

  if (profileError) {
    // Không xoá user đã tạo — nếu không thì tài khoản "mất" mà user không
    // biết vì sao. Chỉ báo lỗi để họ thử lại đăng nhập.
    return {
      status: "error",
      message:
        "Tạo tài khoản thành công nhưng chưa lưu được hồ sơ. Vui lòng thử đăng nhập.",
    };
  }

  // 3. Đăng nhập luôn để khách không phải nhập lại mật khẩu.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      status: "error",
      message:
        "Tài khoản đã được tạo. Vui lòng đăng nhập bằng mật khẩu vừa đặt.",
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    REMEMBER_COOKIE,
    remember ? REMEMBER_ON : REMEMBER_OFF,
    rememberCookieOptions(remember),
  );

  revalidatePath("/", "layout");
  return { status: "idle", redirectTo: next ?? CUSTOMER_HOME };
}

/** Đăng xuất — xoá session Supabase trên server. */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(REMEMBER_COOKIE);

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Cập nhật hồ sơ cá nhân (tên + số điện thoại).
 *
 * Dùng service role vì RLS của `public.profiles` cố tình KHÔNG cho user sửa
 * hồ sơ của chính mình: policy `using (id = auth.uid())` sẽ cho phép sửa luôn
 * cột `role` → tự nâng quyền lên admin. Ở đây ta tự kiểm tra `user_id` trước
 * khi ghi nên không mở lỗ hổng, và chỉ ghi đúng 2 cột an toàn.
 */
export async function updateProfile(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Chưa cấu hình Supabase." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Phiên đăng nhập đã hết hạn." };
  }

  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin.",
      fieldErrors,
    };
  }

  const admin = await createAdminClient();
  const hasPhone = await hasPhoneColumn(admin);
  const { error } = await admin
    .from("profiles")
    .update(
      stripPhone(
        {
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          updated_at: new Date().toISOString(),
        },
        hasPhone,
      ),
    )
    .eq("id", user.id); // ← chỉ sửa hồ sơ của chính mình

  if (error) {
    return {
      status: "error",
      message: "Không lưu được hồ sơ. Vui lòng thử lại.",
    };
  }

  // Đồng bộ tên trong Supabase Auth để hiển thị đúng ở header.
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/account");
  return { status: "idle" };
}
