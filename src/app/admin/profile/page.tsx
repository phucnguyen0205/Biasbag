import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getSupabaseEnvReport } from "@/lib/supabase/env-check";
import { EmailForm, PasswordForm } from "@/components/admin/profile-forms";

export const metadata: Metadata = {
  title: "Hồ sơ quản trị",
  robots: { index: false, follow: false },
};

export default async function AdminProfilePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="card p-6">
        <h1 className="text-lg font-semibold text-ink-900">Hồ sơ quản trị</h1>
        <p className="mt-2 text-sm text-ink-600">
          Chưa cấu hình Supabase — hãy điền biến môi trường rồi chạy lại.
        </p>
      </div>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/profile");
  }

  if (user.role !== "admin" && user.role !== "staff") {
    redirect("/?error=forbidden");
  }

  const env = getSupabaseEnvReport();
  const missingServiceKey = env.missingOptional.includes(
    "SUPABASE_SERVICE_ROLE_KEY",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title">Hồ sơ quản trị</h1>
        <p className="mt-1 text-sm text-ink-600">
          Cập nhật email và mật khẩu của tài khoản quản trị.
        </p>
      </div>

      {/* Thông tin tài khoản */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <User className="h-4 w-4 text-blush-600" />
          Thông tin tài khoản
        </h2>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-ink-50 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-ink-500">
              Email hiện tại
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <Mail className="h-3.5 w-3.5 text-ink-400" />
              {user.email ?? "—"}
            </dd>
          </div>
          <div className="rounded-lg bg-ink-50 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-ink-500">
              Vai trò
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <ShieldCheck className="h-3.5 w-3.5 text-ink-400" />
              {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
            </dd>
          </div>
        </dl>

        {missingServiceKey && (
          <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Máy chủ chưa có biến môi trường{" "}
            <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
            nên chưa thể đổi email/mật khẩu. Hãy thêm biến này trong cấu
            hình hosting (Vercel → Settings → Environment Variables) rồi
            deploy lại.
          </p>
        )}
      </section>

      {/* Đổi email */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <Mail className="h-4 w-4 text-blush-600" />
          Đổi email
        </h2>
        <EmailForm currentEmail={user.email ?? ""} />
      </section>

      {/* Đổi mật khẩu */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink-900">
          <ShieldCheck className="h-4 w-4 text-blush-600" />
          Đổi mật khẩu
        </h2>
        <PasswordForm />
      </section>
    </div>
  );
}
