import type { Metadata } from "next";
import Link from "next/link";
import {
  LogOut,
  Package,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tài khoản của tôi",
};

/**
 * Trang tài khoản khách hàng.
 *
 * Đây là nơi đích sau khi đăng nhập với tài khoản `customer`.
 * Admin/staff bị middleware chuyển hướng sang `/admin`.
 */
export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  const roleLabel =
    user.role === "admin"
      ? "Quản trị viên"
      : user.role === "staff"
        ? "Nhân viên"
        : "Khách hàng";

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-blush-50 via-white to-white py-10 sm:py-14">
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-blush-200/50 blur-3xl" />

      <div className="container-page relative">
        {/* Tiêu đề */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blush-100 text-blush-600">
              <UserRound className="h-7 w-7" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
                Chào {user.name ?? "bạn"}!
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Tài khoản{" "}
                <span className="font-medium text-blush-600">{roleLabel}</span>{" "}
                · {user.email}
              </p>
            </div>
          </div>

          <form action={signOut}>
            <button type="submit" className="btn-secondary text-sm">
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </form>
        </div>

        {/* Thẻ thông tin */}
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <section className="card p-6 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
              <Sparkles className="h-4 w-4 text-blush-500" />
              Thông tin tài khoản
            </h2>

            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-400">
                  Họ và tên
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">
                  {user.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-400">
                  Email
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">
                  {user.email ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-400">
                  Số điện thoại
                </dt>
                <dd className="mt-1 text-sm font-medium text-ink-900">
                  {user.phone ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-400">
                  Loại tài khoản
                </dt>
                <dd className="mt-1">
                  <span className="badge bg-blush-100 text-blush-700">
                    {roleLabel}
                  </span>
                </dd>
              </div>
            </dl>

            <p className="mt-6 rounded-xl bg-blush-50 px-4 py-3 text-xs leading-relaxed text-ink-600">
              Muốn đổi tên hoặc số điện thoại? Liên hệ{" "}
              <Link
                href="/contact"
                className="font-semibold text-blush-600 underline"
              >
                fanpage BIAS BAG
              </Link>{" "}
              để được hỗ trợ nhanh nhất.
            </p>
          </section>

          {/* Liên kết nhanh */}
          <section className="card p-6">
            <h2 className="text-base font-semibold text-ink-900">
              Mua sắm nhanh
            </h2>
            <div className="mt-4 space-y-3">
              <Link
                href="/orders"
                className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-blush-300 hover:bg-blush-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blush-100 text-blush-600">
                  <Package className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-ink-800">
                  Đơn hàng của tôi
                </span>
              </Link>
              <Link
                href="/products"
                className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-blush-300 hover:bg-blush-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blush-100 text-blush-600">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-ink-800">
                  Khám phá túi tote mới
                </span>
              </Link>
            </div>

            <p className="mt-6 border-t border-ink-100 pt-4 text-xs text-ink-400">
              {SITE.slogan}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
