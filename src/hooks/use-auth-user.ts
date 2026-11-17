"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Role } from "@/lib/auth";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
};

type AuthState = {
  /** User hiện tại, `null` nếu chưa đăng nhập. */
  user: AuthUser | null;
  /** Đang tải trạng thái đăng nhập — chưa kết luận được thì `true`. */
  loading: boolean;
};

/**
 * Theo dõi trạng thái đăng nhập ở phía client.
 *
 * Dùng `auth.getSession()` (đọc cookie phiên do `@supabase/ssr` ghi) thay vì
 * `getUser()` (gọi mạng) → trả kết quả tức thì, không chặn render.
 *
 * Hook dùng chung cho các component cần biết "khách đã đăng nhập chưa":
 * nút thêm vào giỏ, trang giỏ hàng, trang thanh toán…
 */
export function useAuthUser(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Role lấy từ bảng `profiles` (RLS cho user đọc hồ sơ của chính mình).
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
        name: profile?.full_name ?? null,
        role: (profile?.role as Role | undefined) ?? "customer",
      });
      setLoading(false);
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
