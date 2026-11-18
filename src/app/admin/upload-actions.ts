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
 *
 * ⚠️ BỌC try/catch — bắt lỗi 413 của Next.js:
 *
 * Next.js giới hạn body của Server Action (mặc định 1MB, đã nâng lên 6MB
 * trong `next.config.ts`). Nếu file vẫn vượt giới hạn ⇒ Next ném lỗi
 * `Body exceeded … limit` ⇒ **toàn bộ request** fail ⇒ trình duyệt hiện
 * "Application error: a server-side exception has occurred" thay vì thông
 * báo lỗi thân thiện.
 *
 * Bọc try/catch giúp biến lỗi hệ thống thành message tiếng Việt rõ ràng:
 * admin biết chính xác cần làm gì (chọn ảnh nhỏ hơn) thay vì thấy lỗi
 * chung chung.
 */
export async function uploadImageAction(
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "products");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Chưa chọn ảnh nào." };
  }

  try {
    const result = await uploadProductImage(file, folder);

    if (!result.success || !result.url) {
      return {
        status: "error",
        message: result.message ?? "Không thể upload ảnh.",
      };
    }

    return { status: "success", url: result.url, message: "Đã upload ảnh." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Lỗi quá dung lượng body (413) — lỗi hay gặp nhất khi admin chọn ảnh
    // banner gốc chưa nén (1920px, 3–5MB).
    if (/exceeded\s+\d+\s*MB|body.*limit|413/i.test(message)) {
      return {
        status: "error",
        message:
          "Ảnh vượt quá dung lượng cho phép (6MB). Vui lòng chọn ảnh nhỏ hơn " +
          "hoặc nén ảnh trước khi tải lên.",
      };
    }

    console.error("[upload] lỗi khi tải ảnh lên:", error);

    return {
      status: "error",
      message: "Không thể tải ảnh lên. Vui lòng thử lại với ảnh khác.",
    };
  }
}
