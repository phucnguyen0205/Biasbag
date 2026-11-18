"use server";

/**
 * ⚠️ FILE NÀY CÓ `"use server"` ⇒ CHỈ ĐƯỢC export **async function**.
 *
 * Next.js ném lỗi runtime nếu file "use server" export thêm bất kỳ giá trị
 * nào khác (hằng số, object, class…):
 *
 *     A "use server" file can only export async functions, found number.
 *
 * Lỗi này chỉ lộ ra khi module được load (tức là khi có request tới
 * Server Action) ⇒ admin thấy "Application error" dù mọi thứ khác ổn.
 *
 * `MAX_BANNERS` / `MIN_BANNERS` nằm ở `@/lib/data/banners` — import trực
 * tiếp từ đó, KHÔNG re-export từ file này.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MAX_BANNERS } from "@/lib/data/banners";
import {
  detectBannerColumns,
  stripMissingBannerColumns,
} from "@/lib/supabase/banner-schema";
import { PUBLIC_CACHE_TAG } from "@/lib/supabase/public";

export type BannerState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const bannerSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn ảnh banner")
    .refine(
      (v) => /^https?:\/\//i.test(v) || v.startsWith("/"),
      "URL ảnh không hợp lệ",
    ),
  altText: z.string().trim().max(160).optional(),
  /**
   * Ảnh riêng cho MOBILE.
   *
   * Rỗng = không có ảnh mobile → hero dùng chung `imageUrl` (hành vi mặc
   * định, tương thích ngược với các banner đã tạo trước đó).
   */
  imageUrlMobile: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/"),
      "URL ảnh mobile không hợp lệ",
    )
    .optional(),
});

/** Kiểm tra role admin — dùng chung pattern với actions.ts. */
async function requireAdmin() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role !== "admin" && role !== "staff") return null;

  return { supabase, user, role };
}

function revalidateBannerPaths() {
  // `revalidateTag` xoá cache DATA (response PostgREST), `revalidatePath`
  // xoá cache ROUTE (HTML). Cần cả hai để banner mới hiện ngay.
  revalidateTag(PUBLIC_CACHE_TAG);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

/** Thêm banner mới (tối đa 5 banner đang hoạt động). */
export async function addBanner(
  _prev: BannerState,
  formData: FormData,
): Promise<BannerState> {
  const parsed = bannerSchema.safeParse({
    imageUrl: formData.get("imageUrl"),
    altText: String(formData.get("altText") ?? "") || undefined,
    imageUrlMobile: String(formData.get("imageUrlMobile") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin.",
    };
  }

  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền thực hiện thao tác này.",
    };
  }

  // Không cho vượt quá số banner tối đa.
  const { count } = await auth.supabase
    .from("banners")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if ((count ?? 0) >= MAX_BANNERS) {
    return {
      status: "error",
      message: `Chỉ được bật tối đa ${MAX_BANNERS} banner. Hãy ẩn hoặc xoá bớt banner hiện có.`,
    };
  }

  // Thứ tự = cuối cùng + 1.
  const { data: last } = await auth.supabase
    .from("banners")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Chỉ ghi cột `image_url_mobile` nếu DB đã có (migration đã chạy).
  const availableColumns = await detectBannerColumns(auth.supabase);

  const { error } = await auth.supabase.from("banners").insert(
    stripMissingBannerColumns(
      {
        image_url: parsed.data.imageUrl,
        image_url_mobile: parsed.data.imageUrlMobile || null,
        alt_text: parsed.data.altText ?? null,
        sort_order: (last?.sort_order ?? -1) + 1,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      availableColumns,
    ),
  );

  if (error) return { status: "error", message: error.message };

  revalidateBannerPaths();
  return {
    status: "success",
    message: "Đã thêm banner mới.",
  };
}

/** Cập nhật banner (đổi ảnh, alt text, trạng thái hiển thị). */
export async function updateBanner(
  _prev: BannerState,
  formData: FormData,
): Promise<BannerState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Thiếu mã banner." };

  const parsed = bannerSchema.safeParse({
    imageUrl: formData.get("imageUrl"),
    altText: String(formData.get("altText") ?? "") || undefined,
    imageUrlMobile: String(formData.get("imageUrlMobile") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin.",
    };
  }

  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền thực hiện thao tác này.",
    };
  }

  const isActive = formData.get("isActive") === "on";

  // Bật banner mới khi đã đạt giới hạn tối đa → báo lỗi.
  if (isActive) {
    const { count } = await auth.supabase
      .from("banners")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .neq("id", id);

    if ((count ?? 0) >= MAX_BANNERS) {
      return {
        status: "error",
        message: `Chỉ được bật tối đa ${MAX_BANNERS} banner. Hãy ẩn bớt banner khác trước.`,
      };
    }
  }

  const availableColumns = await detectBannerColumns(auth.supabase);

  const { error } = await auth.supabase
    .from("banners")
    .update(
      stripMissingBannerColumns(
        {
          image_url: parsed.data.imageUrl,
          image_url_mobile: parsed.data.imageUrlMobile || null,
          alt_text: parsed.data.altText ?? null,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        },
        availableColumns,
      ),
    )
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidateBannerPaths();
  return { status: "success", message: "Đã cập nhật banner." };
}

/** Bật/tắt hiển thị banner. */
export async function toggleBanner(id: string): Promise<BannerState> {
  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền thực hiện thao tác này.",
    };
  }

  const { data: banner } = await auth.supabase
    .from("banners")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();

  if (!banner) return { status: "error", message: "Không tìm thấy banner." };

  const nextActive = !banner.is_active;

  if (nextActive) {
    const { count } = await auth.supabase
      .from("banners")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .neq("id", id);

    if ((count ?? 0) >= MAX_BANNERS) {
      return {
        status: "error",
        message: `Chỉ được bật tối đa ${MAX_BANNERS} banner.`,
      };
    }
  }

  const { error } = await auth.supabase
    .from("banners")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidateBannerPaths();
  return {
    status: "success",
    message: nextActive ? "Đã bật banner." : "Đã ẩn banner.",
  };
}

/** Xoá banner. */
export async function deleteBanner(id: string): Promise<BannerState> {
  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền xoá banner.",
    };
  }

  const { error } = await auth.supabase.from("banners").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidateBannerPaths();
  return { status: "success", message: "Đã xoá banner." };
}

/** Đổi chỗ hai banner (kéo thả thứ tự). */
export async function reorderBanners(
  id: string,
  direction: "up" | "down",
): Promise<BannerState> {
  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền sắp xếp banner.",
    };
  }

  const { data: all } = await auth.supabase
    .from("banners")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!all?.length) {
    return { status: "error", message: "Không có banner nào." };
  }

  const index = all.findIndex((b) => b.id === id);
  if (index < 0) {
    return { status: "error", message: "Không tìm thấy banner." };
  }

  const swapWith =
    direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= all.length) {
    return { status: "error", message: "Không thể di chuyển thêm." };
  }

  const a = all[index];
  const b = all[swapWith];

  await auth.supabase
    .from("banners")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  await auth.supabase
    .from("banners")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);

  revalidateBannerPaths();
  return { status: "success", message: "Đã đổi thứ tự banner." };
}
