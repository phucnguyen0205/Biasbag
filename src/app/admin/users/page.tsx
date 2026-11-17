import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { updateUserRole } from "@/app/admin/actions";

export const metadata = {
  title: "Người dùng",
};

const ROLES = ["customer", "staff", "admin"] as const;

export default async function AdminUsersPage() {
  const current = await getCurrentUser();

  const { data: profiles } = isSupabaseConfigured()
    ? await (await createClient())
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: false })
    : { data: null };

  const canManage = current?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">
            Người dùng &amp; phân quyền
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            {profiles?.length ?? 0} tài khoản · role <code>admin</code> /{" "}
            <code>staff</code> được vào trang quản trị
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Về tổng quan
        </Link>
      </div>

      {!canManage && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Chỉ tài khoản có role <strong>admin</strong> mới thay đổi được phân
          quyền. Bạn đang đăng nhập với role{" "}
          <strong>{current?.role ?? "customer"}</strong>.
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-ink-50">
              <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {profiles?.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">
                      {p.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-ink-400">{p.id.slice(0, 8)}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <form action={updateUserRole} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={p.id} />
                        <select
                          name="role"
                          defaultValue={p.role}
                          className="input w-auto py-1.5 text-xs"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Lưu
                        </button>
                      </form>
                    ) : (
                      <span
                        className={`badge ${
                          p.role === "customer"
                            ? "bg-ink-100 text-ink-700"
                            : "bg-blush-100 text-blush-700"
                        }`}
                      >
                        {p.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    {new Date(p.created_at).toLocaleDateString("vi-VN")}
                  </td>
                </tr>
              ))}
              {!profiles?.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    {isSupabaseConfigured()
                      ? "Chưa có tài khoản nào trong bảng profiles."
                      : "Chưa cấu hình Supabase."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
