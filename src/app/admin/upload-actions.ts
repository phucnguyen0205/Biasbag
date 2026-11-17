"use server";

import { uploadProductImage } from "@/lib/storage";

export type UploadState = {
  status: "idle" | "success" | "error";
  url?: string;
  message?: string;
};

/**
 * Server Action nhận file ảnh và upload lên Supabase Storage.
 * Trả về URL công khai để gán vào trường `imageUrl` của sản phẩm.
 *
 * Gọi trực tiếp với FormData (không dùng `useActionState`) để tránh lồng
 * thẻ `<form>` bên trong form sản phẩm.
 */
export async function uploadImageAction(
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "products");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Chưa chọn ảnh nào." };
  }

  const result = await uploadProductImage(file, folder);

  if (!result.success || !result.url) {
    return {
      status: "error",
      message: result.message ?? "Không thể upload ảnh.",
    };
  }

  return { status: "success", url: result.url, message: "Đã upload ảnh." };
}
