import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const PRODUCT_IMAGE_BUCKET = "product-images";

export type UploadResult = {
  success: boolean;
  url?: string;
  path?: string;
  message?: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Upload ảnh sản phẩm lên Supabase Storage.
 * Yêu cầu bucket `product-images` (đã khai báo trong supabase/schema.sql).
 */
export async function uploadProductImage(
  file: File,
  folder = "products",
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Chưa cấu hình Supabase — không thể upload ảnh.",
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc AVIF.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      message: "Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.",
    };
  }

  const supabase = await createClient();

  // Kiểm tra quyền admin trước khi upload.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Chưa đăng nhập." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role !== "admin" && role !== "staff") {
    return {
      success: false,
      message: "Bạn không có quyền upload ảnh sản phẩm.",
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${folder}/${safeName}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { success: false, message: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);

  return { success: true, url: publicUrl, path };
}

/** Xoá ảnh đã upload (chỉ trong bucket của mình). */
export async function deleteProductImage(path: string): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: "Chưa cấu hình Supabase." };
  }

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove([path]);

  if (error) return { success: false, message: error.message };
  return { success: true };
}
