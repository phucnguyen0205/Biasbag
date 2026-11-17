"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Package, UserRound } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth";

type Profile = {
  name: string | null;
  email: string | null;
  role: Role;
} | null;

/**
 * Nút tài khoản ở header.
 *
 * - Chưa đăng nhập → icon User dẫn tới `/login`.
 * - Đã đăng nhập → menu dropdown với tên/email, tài khoản, đơn hàng, đăng xuất.
 *
 * Đọc session từ cookie (client-side) nên header không cần thêm round-trip
 * tới server cho mỗi lần render.
 */
export default function UserMenu({ transparent }: { transparent: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<Profile>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        return;
      }

      // Role lấy từ bảng `profiles` (RLS cho user đọc hồ sơ của chính mình).
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authUser.id)
        .maybeSingle();

      setUser({
        name: profile?.full_name ?? null,
        email: authUser.email ?? null,
        role: (profile?.role as Role | undefined) ?? "customer",
      });
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Đóng menu khi bấm ra ngoài.
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const iconBtn = cn(
    "btn-ghost h-11 w-11 px-0",
    transparent
      ? "text-white hover:bg-white/15 hover:text-white"
      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
  );

  if (!user) {
    return (
      <Link href="/login" className={iconBtn} aria-label="Đăng nhập">
        <UserRound className="h-[22px] w-[22px]" />
      </Link>
    );
  }

  const isStaff = user.role === "admin" || user.role === "staff";
  const initial = (user.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 items-center gap-2 rounded-full px-2 transition",
          transparent ? "hover:bg-white/15" : "hover:bg-ink-50",
        )}
        aria-label="Tài khoản"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blush-500 text-xs font-bold text-white">
          {initial}
        </span>
        <span
          className={cn(
            "hidden max-w-[120px] truncate text-sm font-medium lg:inline",
            transparent ? "text-white" : "text-ink-800",
          )}
        >
          {user.name ?? user.email}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-blush-100 bg-white shadow-xl shadow-blush-100/60"
        >
          <div className="border-b border-ink-100 bg-blush-50 px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">
              {user.name ?? "Tài khoản"}
            </p>
            <p className="truncate text-xs text-ink-500">{user.email}</p>
            <span className="badge mt-2 bg-blush-100 text-blush-700">
              {user.role === "admin"
                ? "Quản trị viên"
                : user.role === "staff"
                  ? "Nhân viên"
                  : "Khách hàng"}
            </span>
          </div>

          <div className="p-1.5">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-blush-50 hover:text-blush-700"
            >
              <UserRound className="h-4 w-4" />
              Tài khoản của tôi
            </Link>
            <Link
              href="/orders"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-blush-50 hover:text-blush-700"
            >
              <Package className="h-4 w-4" />
              Đơn hàng của tôi
            </Link>
            {isStaff && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-blush-50 hover:text-blush-700"
              >
                <LayoutDashboard className="h-4 w-4" />
                Trang quản trị
              </Link>
            )}
          </div>

          <div className="border-t border-ink-100 p-1.5">
            <form
              action={async () => {
                await signOut();
                setOpen(false);
                router.refresh();
              }}
            >
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
