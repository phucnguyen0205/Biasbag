import type { Metadata } from "next";
import { getAdminBanners, MAX_BANNERS, MIN_BANNERS } from "@/lib/data/banners";
import BannerManager from "@/components/admin/banner-manager";

export const metadata: Metadata = {
  title: "Quản lý banner",
};

export default async function AdminBannersPage() {
  const banners = await getAdminBanners();
  const activeCount = banners.filter((b) => b.is_active).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blush-200 bg-blush-50 p-4 text-sm text-ink-700">
        <p className="font-medium text-ink-900">Cách hoạt động</p>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
          <li>
            Banner hiển thị luân phiên ở trang chủ, tự chuyển mỗi 3 giây, có
            thumbnail ở góc dưới bên phải.
          </li>
          <li>
            Đang bật tối đa <strong>{MAX_BANNERS} banner</strong> (khuyến nghị{" "}
            {MIN_BANNERS}–{MAX_BANNERS}). Dùng mũi tên ↑ ↓ để đổi thứ tự.
          </li>
          <li>
            Ảnh nền ngang, kích thước tối thiểu 1920px rộng. Ảnh sẽ bị phủ
            gradient tối ở bên trái nên chữ vẫn dễ đọc.
          </li>
        </ul>
        <p className="mt-2 text-xs">
          Hiện đang bật: <strong>{activeCount}/{MAX_BANNERS}</strong>
        </p>
      </div>

      <BannerManager banners={banners} />
    </div>
  );
}
