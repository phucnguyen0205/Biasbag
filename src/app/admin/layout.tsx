import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SITE } from "@/lib/constants";

export const metadata = {
  title: "Quản trị",
  // Toàn bộ khu vực quản trị không được lập chỉ mục (kể cả khi Google đã
  // lỡ vào index trước đó).
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/posts", label: "Bài viết", icon: FileText },
  { href: "/admin/banners", label: "Banner", icon: ImageIcon },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingBag },
  { href: "/admin/messages", label: "Tin nhắn", icon: Inbox },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/profile", label: "Hồ sơ", icon: UserCog },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  async function signOut() {
    "use server";
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      await supabase.auth.signOut();
    }
  }

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label={`${SITE.name} — về trang chủ`}
            className="inline-block"
          >
            <Image
              src={SITE.logo}
              alt={SITE.name}
              width={60}
              height={38}
              className="h-auto w-15 object-contain transition hover:opacity-80"
              priority
              unoptimized
            />
          </Link>
          <div>
            <h1 className="section-title">Trang quản trị</h1>
            <p className="mt-1 text-sm text-ink-600">
              Quản lý sản phẩm và đơn hàng.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="btn-secondary text-sm"
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </nav>

          {user && (
            <>
              <Link
                href="/admin/profile"
                className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pl-3 pr-3 transition hover:border-blush-300 hover:bg-blush-50"
                title="Cài đặt hồ sơ quản trị"
              >
                <User className="h-3.5 w-3.5 text-ink-400" />
                <span className="max-w-[160px] truncate text-xs text-ink-600">
                  {user.email}
                </span>
                <span className="badge bg-blush-100 text-blush-700">
                  {user.role}
                </span>
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="btn-ghost h-8 w-8 px-0"
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
