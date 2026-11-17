import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type Role = "customer" | "staff" | "admin";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  role: Role;
} | null;

/**
 * Lấy user hiện tại kèm role từ bảng `profiles`.
 * Trả về null nếu chưa đăng nhập hoặc chưa cấu hình Supabase.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    name: profile?.full_name ?? null,
    // Số điện thoại lưu trong `user_metadata` lúc đăng ký.
    phone: (user.user_metadata?.phone as string | undefined) ?? null,
    role: (profile?.role as Role) ?? "customer",
  };
}

/** User có quyền quản trị (admin hoặc staff) không? */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin" || user?.role === "staff";
}

/** User có đúng role admin không (không tính staff)? */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}
