"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  detectOrderColumns,
  stripMissingOrderColumns,
} from "@/lib/supabase/order-schema";
import {
  ALL_PAYMENT_METHOD_LIST,
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHOD_LIST,
} from "@/lib/constants";
import { calculateTotals } from "@/lib/pricing";
import { fallbackOrderCode } from "@/lib/order-code";
import { grantOrderAccess } from "@/lib/order-access";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  image: z.string().nullable(),
  price: z.number().nonnegative(),
  salePrice: z.number().nullable(),
  quantity: z.number().int().min(1).max(99, "Số lượng không hợp lệ"),
});

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Vui lòng nhập họ tên"),
  customerEmail: z.string().trim().email("Email không hợp lệ"),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(0|\+84)\d{8,11}$/, "Số điện thoại không hợp lệ"),
  shippingAddress: z
    .string()
    .trim()
    .min(10, "Vui lòng nhập địa chỉ đầy đủ"),
  note: z.string().trim().optional(),
  // Chấp nhận mọi phương thức hệ thống nhận diện được (kể cả request cũ đã
  // gửi `bank_transfer`/`momo`), sau đó chuẩn hoá về phương thức đang mở.
  paymentMethod: z.enum(
    ALL_PAYMENT_METHOD_LIST as unknown as [string, ...string[]],
  ) as z.ZodType<string>,
  lines: z.array(orderItemSchema).min(1, "Giỏ hàng đang trống"),
});

export type CheckoutState = {
  status: "idle" | "success" | "error";
  message?: string;
  orderId?: string;
  /** Mã đơn dễ đọc (BB-YYMMDD-000123) — khách dùng để tra cứu. */
  orderCode?: string;
  fieldErrors?: Record<string, string>;
};

export async function submitOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let rawLines: unknown = [];
  try {
    rawLines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return {
      status: "error",
      message: "Dữ liệu giỏ hàng không hợp lệ. Vui lòng tải lại trang.",
    };
  }

  const raw = {
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone"),
    shippingAddress: formData.get("shippingAddress"),
    note: formData.get("note") || undefined,
    paymentMethod: formData.get("paymentMethod"),
    lines: rawLines,
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((issue) => {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    });
    return {
      status: "error",
      message: "Vui lòng kiểm tra lại thông tin.",
      fieldErrors,
    };
  }

  const { lines, ...customer } = parsed.data;

  // Chuẩn hoá phương thức thanh toán: shop hiện chỉ mở COD. Nếu client gửi
  // phương thức khác (form cũ đã cache, request cũ) → ép về COD để đơn vẫn
  // đặt được thay vì báo lỗi.
  const paymentMethod = PAYMENT_METHOD_LIST.includes(
    customer.paymentMethod as (typeof PAYMENT_METHOD_LIST)[number],
  )
    ? customer.paymentMethod
    : DEFAULT_PAYMENT_METHOD;

  if (!isSupabaseConfigured()) {
    // Chế độ demo: trả về mã đơn giả, không ghi DB.
    return {
      status: "success",
      orderId: `BB${Date.now().toString().slice(-8)}`,
      orderCode: fallbackOrderCode(),
      message: "Đặt hàng thành công (chế độ demo — chưa kết nối Supabase).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Kiểm tra tồn kho và giá thực tế từ database — không tin giá do client gửi lên.
  const productIds = lines.map((l) => l.productId);
  const { data: dbProducts } = await supabase
    .from("products")
    .select("id, name, price, sale_price, stock, in_stock, is_active")
    .in("id", productIds);

  if (!dbProducts || dbProducts.length !== productIds.length) {
    return {
      status: "error",
      message:
        "Một số sản phẩm không còn tồn tại. Vui lòng cập nhật lại giỏ hàng.",
    };
  }

  const priceMap = new Map(
    dbProducts.map((p) => [
      p.id,
      {
        name: p.name,
        price: Number(p.price),
        salePrice: p.sale_price != null ? Number(p.sale_price) : null,
        stock: Number(p.stock),
        inStock: p.in_stock,
        isActive: p.is_active,
      },
    ]),
  );

  for (const l of lines) {
    const info = priceMap.get(l.productId);
    if (!info) continue;

    if (!info.isActive) {
      return {
        status: "error",
        message: `"${info.name}" hiện không còn bán. Vui lòng bỏ khỏi giỏ hàng.`,
      };
    }

    if (!info.inStock || info.stock <= 0) {
      return {
        status: "error",
        message: `"${info.name}" đã hết hàng. Vui lòng bỏ khỏi giỏ hàng.`,
      };
    }

    if (l.quantity > info.stock) {
      return {
        status: "error",
        message: `"${info.name}" chỉ còn ${info.stock} chiếc trong kho. Vui lòng giảm số lượng.`,
      };
    }
  }

  // Tính tổng từ giá trong DATABASE (không phải giá client gửi lên) và
  // dùng CHUNG một hàm `calculateTotals` với UI → tổng hiển thị và tổng lưu
  // DB luôn khớp (kể cả phí vận chuyển).
  const pricedLines = lines.map((l) => {
    const info = priceMap.get(l.productId);
    return {
      price: info?.price ?? l.price,
      salePrice: info?.salePrice ?? l.salePrice,
      quantity: l.quantity,
    };
  });
  const { subtotal, shipping, total } = calculateTotals(pricedLines);

  // Ghi đơn hàng bằng service role.
  //
  // Server action đã kiểm tra kỹ: giá và tồn kho lấy từ database, không tin
  // dữ liệu client gửi lên. Nếu dùng client thường (bị RLS giới hạn), guest
  // không thể ghi được `order_items` vào đơn của chính mình — RLS không phân
  // biệt được "đơn vừa tạo" với "đơn của người khác".
  const admin = await createAdminClient();

  // Dò cột mới của bảng `orders` (cache 1 lần cho toàn tiến trình).
  // Nếu migration chưa chạy → bỏ các cột đó khỏi payload để luồng thanh toán
  // vẫn hoạt động thay vì sập với lỗi "column does not exist".
  const availableColumns = await detectOrderColumns(admin);

  // Sinh mã đơn. Ưu tiên sequence của Postgres (`next_order_code()`) để
  // đảm bảo duy nhất kể cả khi nhiều đơn được tạo đồng thời. Nếu DB chưa
  // có hàm (chưa chạy migration) → dùng mã dự phòng.
  const { data: codeData, error: codeError } = await admin.rpc(
    "next_order_code",
  );
  const orderCode =
    codeError || !codeData ? fallbackOrderCode() : String(codeData);

  const { data: order, error } = await admin
    .from("orders")
    .insert(
      stripMissingOrderColumns(
        {
          user_id: user?.id ?? null,
          order_code: orderCode,
          customer_name: customer.customerName,
          customer_email: customer.customerEmail,
          customer_phone: customer.customerPhone,
          shipping_address: customer.shippingAddress,
          note: customer.note ?? null,
          payment_method: paymentMethod,
          // COD: khách trả tiền khi nhận hàng → admin xác nhận đã thu tiền
          // sau khi giao. Đơn mới tạo luôn là `unpaid`.
          payment_status: "unpaid",
          status: "pending",
          subtotal,
          shipping_fee: shipping,
          total,
        },
        availableColumns,
      ),
    )
    .select("id")
    .single();

  if (error || !order) {
    return {
      status: "error",
      message: error?.message ?? "Không thể tạo đơn hàng. Vui lòng thử lại.",
    };
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    lines.map((l) => {
      const info = priceMap.get(l.productId);
      const unit =
        info && info.salePrice != null && info.salePrice < info.price
          ? info.salePrice
          : info?.price ?? l.price;
      return {
        order_id: order.id,
        product_id: l.productId,
        // Tên và giá lấy từ database, không lấy từ dữ liệu client gửi lên.
        product_name: info?.name ?? l.name,
        product_image: l.image,
        unit_price: unit,
        quantity: l.quantity,
      };
    }),
  );

  if (itemsError) {
    // Đơn đã tạo nhưng không ghi được dòng hàng → xoá đơn để không lọt đơn rỗng.
    await admin.from("orders").delete().eq("id", order.id);
    return {
      status: "error",
      message: itemsError.message,
    };
  }

  // Trừ tồn kho NGUYÊN TỬ.
  //
  // PHẢI dùng hàm RPC `decrement_product_stock` (service role), không dùng
  // `update` thẳng:
  //   - policy `products_update_admin` chỉ cho admin/staff sửa `products`;
  //     nếu dùng client thường thì RLS chặn → PostgREST trả 204 nhưng KHÔNG
  //     update dòng nào → tồn kho không bao giờ bị trừ.
  //   - hàm RPC kiểm tra `stock >= qty` TRONG cùng câu UPDATE → 2 đơn cùng
  //     lúc không thể bán vượt tồn kho (oversell).
  //
  // Nếu DB chưa chạy migration (chưa có hàm RPC) → fallback sang cách
  // `update` trực tiếp (kém an toàn hơn nhưng vẫn trừ đúng kho).
  const hasStockRpc = availableColumns.has("subtotal");
  const stockResults: boolean[] = [];

  for (const l of lines) {
    if (hasStockRpc) {
      const { data: ok } = await admin.rpc("decrement_product_stock", {
        p_product_id: l.productId,
        p_quantity: l.quantity,
      });
      stockResults.push(ok === true);
    } else {
      const { data: ok } = await admin
        .from("products")
        .update({
          stock: Math.max(
            0,
            (priceMap.get(l.productId)?.stock ?? l.quantity) - l.quantity,
          ),
        })
        .eq("id", l.productId)
        .eq("stock", priceMap.get(l.productId)?.stock ?? l.quantity)
        .select("id")
        .maybeSingle();
      stockResults.push(!!ok);
    }
  }

  const failedIndex = stockResults.findIndex((ok) => !ok);
  if (failedIndex !== -1) {
    // Không đủ hàng (đơn khác vừa bán trước) → huỷ đơn này và hoàn lại
    // những dòng đã trừ thành công trước đó.
    for (let i = 0; i < failedIndex; i++) {
      const done = lines[i];
      if (hasStockRpc) {
        await admin.rpc("restore_product_stock", {
          p_product_id: done.productId,
          p_quantity: done.quantity,
        });
      }
    }
    await admin.from("order_items").delete().eq("order_id", order.id);
    await admin.from("orders").delete().eq("id", order.id);

    const info = priceMap.get(lines[failedIndex].productId);
    return {
      status: "error",
      message: `"${info?.name ?? "Sản phẩm"}" vừa hết hàng do có người khác đặt trước. Vui lòng cập nhật lại giỏ hàng.`,
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  revalidatePath("/products");

  // Cấp quyền xem đơn hàng cho khách (cookie httpOnly, HMAC ký).
  // Đơn chưa đăng nhập vẫn xem được chi tiết đơn vừa đặt.
  await grantOrderAccess(order.id);

  return {
    status: "success",
    orderId: order.id,
    orderCode,
    message: "Đặt hàng thành công!",
  };
}
