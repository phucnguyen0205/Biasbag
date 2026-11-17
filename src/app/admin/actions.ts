"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  detectOrderColumns,
  stripMissingOrderColumns,
} from "@/lib/supabase/order-schema";
import { slugify } from "@/lib/utils";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { PUBLIC_CACHE_TAG } from "@/lib/supabase/public";

const ORDER_STATUS_KEYS = Object.keys(ORDER_STATUS) as string[];
const PAYMENT_STATUS_KEYS = Object.keys(PAYMENT_STATUS) as string[];

/**
 * Xoá cache dữ liệu public sau khi admin thay đổi.
 *
 * `revalidatePath("/")` xoá cache của ROUTE (HTML), còn `revalidateTag` xoá
 * cache của DATA (response PostgREST trong Next.js Data Cache). Cần cả hai:
 *   - không có `revalidateTag` → query Supabase vẫn trả dữ liệu cũ,
 *   - không có `revalidatePath` → HTML cũ vẫn được phục vụ.
 */
function invalidatePublicData() {
  revalidateTag(PUBLIC_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/products");
  // Trang "Về chúng tôi" cũng hiển thị sản phẩm thật từ DB ⇒ cần xoá cache
  // cache route này luôn để ảnh/tên sản phẩm mới xuất hiện ngay.
  revalidatePath("/about");
}

export type AdminState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/**
 * Bảo vệ server action: chỉ admin/staff đã đăng nhập mới chạy được.
 *
 * Middleware chỉ chặn ở tầng route — server action có thể bị gọi trực tiếp
 * qua request POST nên cần kiểm tra lại ở đây.
 *
 * Trả về `null` nếu không được phép.
 */
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

const productSchema = z.object({
  name: z.string().min(2, "Tên sản phẩm quá ngắn"),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative("Giá không hợp lệ"),
  salePrice: z.coerce.number().nonnegative().optional(),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/"),
      "URL ảnh không hợp lệ",
    )
    .optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  material: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  features: z.string().optional(),
  stock: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

function parseForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    price: formData.get("price"),
    salePrice: formData.get("salePrice") || undefined,
    imageUrl: String(formData.get("imageUrl") ?? "") || undefined,
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    brand: String(formData.get("brand") ?? "") || undefined,
    material: String(formData.get("material") ?? "") || undefined,
    color: String(formData.get("color") ?? "") || undefined,
    size: String(formData.get("size") ?? "") || undefined,
    features: String(formData.get("features") ?? "") || undefined,
    stock: formData.get("stock") ?? 0,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  };
}

export async function saveProduct(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Chưa cấu hình Supabase. Hãy điền .env.local rồi chạy lại (xem supabase/schema.sql).",
    };
  }

  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền thực hiện thao tác này.",
    };
  }

  const d = parsed.data;
  const features = d.features
    ? d.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  // Khi sửa sản phẩm, giữ nguyên slug cũ để các link đã chia sẻ không bị hỏng.
  // Chỉ tạo slug mới khi thêm sản phẩm.
  let slug = slugify(d.name);
  if (id) {
    const { data: existing } = await auth.supabase
      .from("products")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (existing?.slug) slug = existing.slug;
  }

  const payload = {
    name: d.name,
    slug,
    description: d.description ?? null,
    price: d.price,
    sale_price:
      d.salePrice != null && d.salePrice > 0 && d.salePrice < d.price
        ? d.salePrice
        : null,
    image_url: d.imageUrl || null,
    category_id: d.categoryId || null,
    brand: d.brand || null,
    material: d.material || null,
    color: d.color || null,
    size: d.size || null,
    features,
    stock: d.stock,
    in_stock: d.stock > 0,
    is_active: d.isActive,
    is_featured: d.isFeatured,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await auth.supabase.from("products").update(payload).eq("id", id)
    : await auth.supabase.from("products").insert(payload);

  if (error) return { status: "error", message: error.message };

  invalidatePublicData();
  revalidatePath("/admin/products");
  return {
    status: "success",
    message: id ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm mới.",
  };
}

export async function deleteProduct(id: string): Promise<AdminState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Chưa cấu hình Supabase." };
  }
  const auth = await requireAdmin();
  if (!auth) {
    return { status: "error", message: "Bạn không có quyền xóa sản phẩm." };
  }
  const { error } = await auth.supabase
    .from("products")
    .delete()
    .eq("id", id);
  if (error) return { status: "error", message: error.message };
  invalidatePublicData();
  revalidatePath("/admin/products");
  return { status: "success", message: "Đã xóa sản phẩm." };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<AdminState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Chưa cấu hình Supabase." };
  }
  if (!ORDER_STATUS_KEYS.includes(status)) {
    return { status: "error", message: "Trạng thái đơn hàng không hợp lệ." };
  }
  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền cập nhật đơn hàng.",
    };
  }

  // Khi chuyển sang "cancelled" → hoàn lại tồn kho cho các dòng hàng.
  //
  // Nếu không hoàn kho, sản phẩm bị giữ chỗ vô thời hạn → hết hàng "ảo" và
  // khách khác không mua được. Dùng hàm RPC `restore_product_stock` để cộng
  // tồn kho an toàn (không bao giờ âm).
  const { data: current } = await auth.supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();

  const wasCancelled = current?.status === "cancelled";
  const isCancelling = status === "cancelled" && !wasCancelled;

  if (isCancelling) {
    await restoreStockForOrder(orderId);
  }

  const { error } = await auth.supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) return { status: "error", message: error.message };
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  revalidatePath("/products");
  return { status: "success", message: "Đã cập nhật trạng thái đơn." };
}

/**
 * Hoàn lại tồn kho cho tất cả dòng hàng của một đơn.
 *
 * Dùng service role vì RLS của `products` chỉ cho admin sửa qua client có
 * session — và hàm RPC `restore_product_stock` chỉ cấp quyền cho
 * `service_role`.
 *
 * Nếu DB chưa chạy migration (chưa có hàm RPC) → fallback sang `update`
 * trực tiếp (vẫn hoàn kho đúng, chỉ kém atomic hơn).
 */
async function restoreStockForOrder(orderId: string): Promise<void> {
  const admin = await createAdminClient();

  const { data: items } = await admin
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (!items?.length) return;

  // Hàm RPC chỉ tồn tại sau khi chạy migration.
  //
  // Dò bằng cách gọi với `p_quantity = 0` (hàm luôn trả `false` cho qty ≤ 0
  // nhưng KHÔNG lỗi nếu tồn tại). PostgREST báo lỗi `PGRST202` ("could not
  // find the function") khi hàm chưa được tạo → fallback sang `update` trực
  // tiếp.
  const { error: probeError } = await admin.rpc("restore_product_stock", {
    p_product_id: items[0].product_id ?? "00000000-0000-0000-0000-000000000000",
    p_quantity: 0,
  });
  const hasRestoreRpc = !probeError || probeError.code !== "PGRST202";

  for (const item of items) {
    if (!item.product_id) continue;

    if (hasRestoreRpc) {
      const { error } = await admin.rpc("restore_product_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      if (!error) continue;
    }

    // Fallback: cộng tồn kho trực tiếp.
    const { data: product } = await admin
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .maybeSingle();

    if (!product) continue;

    await admin
      .from("products")
      .update({
        stock: Number(product.stock) + item.quantity,
        in_stock: true,
      })
      .eq("id", item.product_id);
  }
}

/**
 * Cập nhật trạng thái thanh toán (đã thu tiền / chưa thu / đã hoàn tiền).
 *
 * Tách khỏi `updateOrderStatus` vì đây là hai chiều độc lập:
 *   - `status`         → đơn đang ở bước xử lý nào
 *   - `payment_status` → đã thu được tiền chưa
 *
 * Khi đánh dấu "đã thanh toán" → ghi `paid_at` để lưu mốc thời gian thu tiền.
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: string,
): Promise<AdminState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Chưa cấu hình Supabase." };
  }
  if (!PAYMENT_STATUS_KEYS.includes(paymentStatus)) {
    return {
      status: "error",
      message: "Trạng thái thanh toán không hợp lệ.",
    };
  }
  const auth = await requireAdmin();
  if (!auth) {
    return {
      status: "error",
      message: "Bạn không có quyền cập nhật thanh toán.",
    };
  }

  const { error } = await auth.supabase
    .from("orders")
    .update(
      stripMissingOrderColumns(
        {
          payment_status: paymentStatus,
          paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
        },
        await detectOrderColumns(auth.supabase),
      ),
    )
    .eq("id", orderId);

  if (error) return { status: "error", message: error.message };
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  return { status: "success", message: "Đã cập nhật trạng thái thanh toán." };
}

/**
 * Đổi role của một user. Chỉ admin mới được phép.
 */
export async function updateUserRole(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || !["customer", "staff", "admin"].includes(role)) return;

  if (!isSupabaseConfigured()) return;

  const auth = await requireAdmin();
  if (!auth) return;

  // Chỉ admin mới đổi được role (staff không nâng quyền).
  if (auth.role !== "admin") return;

  await auth.supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  revalidatePath("/admin/users");
}

/** Đánh dấu tin nhắn liên hệ đã đọc. */
export async function markMessageRead(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id || !isSupabaseConfigured()) return;

  const auth = await requireAdmin();
  if (!auth) return;

  await auth.supabase
    .from("contact_messages")
    .update({ status: "read" })
    .eq("id", id);

  revalidatePath("/admin/messages");
}
