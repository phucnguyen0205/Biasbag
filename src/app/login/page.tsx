import type { Metadata } from "next";
import AuthForm from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Đăng nhập / Đăng ký",
  description:
    "Đăng nhập hoặc tạo tài khoản BIAS BAG để theo dõi đơn hàng và lưu thông tin giao hàng.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.next) ? sp.next[0] : sp.next;

  // Chỉ chuyển hướng tới đường dẫn nội bộ (chống open redirect).
  const next =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-blush-50 via-white to-white py-10 sm:py-16">
      {/* Nền trang trí mềm — tông hồng/trắng cho cảm giác nhẹ nhàng, trẻ trung */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blush-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-blush-200/50 blur-3xl" />

      <div className="container-page relative flex justify-center">
        <AuthForm next={next} />
      </div>
    </div>
  );
}
