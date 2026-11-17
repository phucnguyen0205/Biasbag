"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { lookupOrderByCode } from "@/lib/data/orders";
import { normalizeOrderCode } from "@/lib/order-code";
import { grantOrderAccess } from "@/lib/order-access";

const lookupSchema = z.object({
  orderCode: z.string().trim().min(4, "Vui lòng nhập mã đơn hàng"),
  contact: z
    .string()
    .trim()
    .min(5, "Vui lòng nhập email hoặc số điện thoại đã dùng để đặt"),
});

export type LookupState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Tra cứu đơn hàng cho khách CHƯA đăng nhập.
 *
 * Bắt buộc khớp cả mã đơn LẪN email/số điện thoại — chỉ dựa vào mã đơn là
 * không đủ (mã có thể bị đoán). Việc xác thực nằm ở tầng dữ liệu
 * (`lookupOrderByCode`), không phụ thuộc RLS.
 */
export async function lookupOrder(
  _prev: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const parsed = lookupSchema.safeParse({
    orderCode: formData.get("orderCode"),
    contact: formData.get("contact"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
    return {
      status: "error",
      message: "Vui lòng nhập đầy đủ thông tin tra cứu.",
      fieldErrors,
    };
  }

  const { orderCode, contact } = parsed.data;

  const order = await lookupOrderByCode(normalizeOrderCode(orderCode), contact);

  if (!order) {
    return {
      status: "error",
      message:
        "Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn và email/số điện thoại đã dùng khi đặt.",
    };
  }

  // Cấp quyền xem chi tiết đơn hàng cho khách (cookie httpOnly, HMAC ký).
  await grantOrderAccess(order.id);

  // Chuyển tới trang chi tiết đơn (dùng id nội bộ, không lộ qua URL).
  redirect(`/orders/${order.id}`);
}
