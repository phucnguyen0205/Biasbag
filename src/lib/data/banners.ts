import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Banner } from "@/lib/types";

/**
 * Số banner tối thiểu / tối đa được phép hiển thị cùng lúc ở trang chủ.
 * - Tối đa 5: giữ hero gọn, tránh tải quá nhiều ảnh nền.
 * - Tối thiểu 2: nếu chỉ có 1 banner thì carousel không cần thiết, hiển thị
 *   dạng tĩnh.
 */
export const MIN_BANNERS = 2;
export const MAX_BANNERS = 5;

/**
 * Banner mặc định dùng khi chưa cấu hình Supabase hoặc admin chưa thiết lập.
 * Đã tối ưu sẵn (WebP) trong `public/banners/`.
 */
export const FALLBACK_BANNERS: Banner[] = [
  {
    id: "fb-banner-1",
    image_url: "/banners/banner-1.webp",
    image_url_mobile: null,
    alt_text: "Túi xách BIAS BAG — phụ kiện nhỏ, phong cách riêng",
    sort_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fb-banner-2",
    image_url: "/banners/banner-2.webp",
    image_url_mobile: null,
    alt_text: "Bộ sưu tập túi xách thời trang BIAS BAG",
    sort_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fb-banner-3",
    image_url: "/banners/banner-3.webp",
    image_url_mobile: null,
    alt_text: "Túi tote canvas cho học sinh, sinh viên",
    sort_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "fb-banner-4",
    image_url: "/banners/banner-4.webp",
    image_url_mobile: null,
    alt_text: "Túi đeo vai và balo BIAS BAG cho giới trẻ",
    sort_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Banner hiển thị ở trang chủ (chỉ banner đang bật, đúng thứ tự).
 * RLS chặn banner không active nên admin cũng chỉ đọc được banner công khai.
 */
export async function getBanners(): Promise<Banner[]> {
  if (!isSupabaseConfigured()) return FALLBACK_BANNERS;

  // Client public (không cookie) → banner là dữ liệu công khai, không cần
  // session ⇒ trang chủ vẫn render tĩnh (ISR) được.
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(MAX_BANNERS);

  // Chỉ fallback khi có lỗi (chưa cấu hình / chưa chạy schema.sql).
  // Nếu DB trả về danh sách rỗng nghĩa là admin đã ẩn hết — tôn trọng lựa chọn đó.
  if (error) return FALLBACK_BANNERS;
  return (data as Banner[]) ?? [];
}

/** Toàn bộ banner (kể cả đang ẩn) — chỉ dùng trong trang quản trị. */
export async function getAdminBanners(): Promise<Banner[]> {
  if (!isSupabaseConfigured()) return FALLBACK_BANNERS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return FALLBACK_BANNERS;
  return (data as Banner[]) ?? [];
}
