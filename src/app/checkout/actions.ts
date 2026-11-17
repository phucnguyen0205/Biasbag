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
  /**
   * Slug sản phẩm.
   *
   * Dùng làm "khoá dự phòng" khi `productId` trong giỏ hàng không còn hợp lệ
   * (ID cũ đã bị xoá, hoặc ID kiểu fallback `p-1` từ chế độ demo). Khi đó
   * server tra cứu sản phẩm theo slug để vẫn tạo được đơn hàng.
   */
  slug: z.string().min(1),
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

/** Dòng sản phẩm đọc từ DB (chỉ các cột cần dùng cho đơn hàng). */
type CheckoutProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  stock: number;
  in_stock: boolean;
  is_active: boolean;
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
    // Mặc định COD khi form không gửi phương thức (form cũ đã cache, request
    // cũ, hoặc JS chưa hydrate) — đơn vẫn phải đặt được.
    paymentMethod:
      String(formData.get("paymentMethod") ?? "") ||
      DEFAULT_PAYMENT_METHOD,
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

  // Client ghi DB.
  //
  // Ưu tiên service role (bypass RLS). Nếu thiếu `SUPABASE_SERVICE_ROLE_KEY`
  // (cấu hình sai trên hosting) → fallback sang client theo session. Khi đó
  // chỉ khách ĐÃ ĐĂNG NHẬP mới ghi được `order_items` (policy
  // `order_items_insert_own`); guest sẽ nhận thông báo lỗi rõ ràng thay vì
  // lỗi 500.
  let admin: Awaited<ReturnType<typeof createAdminClient>>;
  let usingServiceRole = true;
  try {
    admin = await createAdminClient();
  } catch {
    admin = (await createClient()) as unknown as Awaited<
      ReturnType<typeof createAdminClient>
    >;
    usingServiceRole = false;
  }

  // ── Đọc sản phẩm từ database ────────────────────────────────────────────
  //
  // VÌ SAO DÙNG SERVICE ROLE Ở ĐÂY:
  // Client theo session bị RLS lọc `is_active = true` → sản phẩm admin vừa
  // ẩn đi sẽ biến mất khỏi kết quả và tạo ra thông báo sai báo "sản phẩm
  // không còn tồn tại". Đọc bằng service role thấy đủ mọi sản phẩm → mình
  // tự kiểm tra `is_active` và báo đúng nguyên nhân ("đã ngừng bán").
  //
  // VÌ SAO PHẢI LỌC ID KHÔNG PHẢI UUID:
  // Cột `id` là `uuid`. Nếu giỏ hàng còn sót ID kiểu fallback (`p-1`) hoặc ID
  // của sản phẩm đã bị xoá, PostgREST trả lỗi `invalid input syntax for type
  // uuid` cho CẢ câu query → `dbProducts` = null → mọi đơn đều báo "sản phẩm
  // không còn tồn tại", kể cả khi giỏ hoàn toàn hợp lệ.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const productIds = lines.map((l) => l.productId);
  const validIds = productIds.filter((id) => UUID_RE.test(id));

  // ID không hợp lệ → thử tra cứu theo slug (giỏ hàng luôn lưu slug).
  const slugsOfInvalid = lines
    .filter((l) => !UUID_RE.test(l.productId))
    .map((l) => l.slug)
    .filter(Boolean);

  let dbProducts: CheckoutProductRow[] = [];

  if (validIds.length) {
    const { data, error } = await admin
      .from("products")
      .select("id, name, slug, price, sale_price, stock, in_stock, is_active")
      .in("id", validIds);

    if (error) {
      return {
        status: "error",
        message: `Không tải được thông tin sản phẩm. Vui lòng thử lại (${error.message}).`,
      };
    }
    dbProducts = (data ?? []) as CheckoutProductRow[];
  }

  // Bù lại các dòng có ID không hợp lệ bằng cách tra theo slug.
  if (slugsOfInvalid.length) {
    const { data: bySlug } = await admin
      .from("products")
      .select("id, name, slug, price, sale_price, stock, in_stock, is_active")
      .in("slug", slugsOfInvalid);

    dbProducts = dbProducts.concat((bySlug ?? []) as CheckoutProductRow[]);
  }

  // Bỏ trùng (một sản phẩm có thể được tìm thấy cả theo id lẫn theo slug).
  const uniqueProducts = new Map<string, CheckoutProductRow>();
  for (const p of dbProducts) uniqueProducts.set(p.id, p);
  dbProducts = [...uniqueProducts.values()];

  // Ánh xạ từng dòng trong giỏ → sản phẩm thật trong DB.
  //
  // Ưu tiên khớp theo `id`; nếu id trong giỏ không phải UUID / đã cũ thì
  // khớp theo `slug` (giỏ hàng luôn lưu slug nên vẫn cứu được đơn hàng).
  const byId = new Map(dbProducts.map((p) => [p.id, p]));
  const bySlug = new Map(dbProducts.map((p) => [p.slug, p]));

  const resolved = lines.map((l) => ({
    line: l,
    product: byId.get(l.productId) ?? bySlug.get(l.slug) ?? null,
  }));

  // Sản phẩm thực sự không còn trong DB (đã bị xoá) → báo rõ tên sản phẩm.
  const missing = resolved.filter((r) => !r.product);
  if (missing.length) {
    return {
      status: "error",
      message: `Sản phẩm "${missing[0].line.name}" không còn trong hệ thống. Vui lòng bỏ sản phẩm này khỏi giỏ hàng rồi đặt lại.`,
    };
  }

  const priceMap = new Map(
    dbProducts.map((p) => [
      p.id,
      {
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        salePrice: p.sale_price != null ? Number(p.sale_price) : null,
        stock: Number(p.stock),
        inStock: p.in_stock,
        isActive: p.is_active,
      },
    ]),
  );

  for (const { line: l, product } of resolved) {
    if (!product) continue;
    const info = priceMap.get(product.id)!;

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
  const pricedLines = resolved.map(({ line: l, product }) => {
    const info = product ? priceMap.get(product.id) : undefined;
    return {
      price: info?.price ?? l.price,
      salePrice: info?.salePrice ?? l.salePrice,
      quantity: l.quantity,
    };
  });
  const { subtotal, shipping, total } = calculateTotals(pricedLines);

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
    // `user_id` bị RLS chặn khi dùng client thường mà khách chưa đăng nhập →
    // báo rõ thay vì lỗi kỹ thuật.
    if (!usingServiceRole && !user) {
      return {
        status: "error",
        message:
          "Máy chủ đang thiếu cấu hình đặt hàng (SUPABASE_SERVICE_ROLE_KEY). " +
          "Vui lòng đăng nhập để đặt hàng, hoặc liên hệ shop.",
      };
    }

    return {
      status: "error",
      message: error?.message ?? "Không thể tạo đơn hàng. Vui lòng thử lại.",
    };
  }

  const { error: itemsError } = await admin.from("order_items").insert(
    resolved.map(({ line: l, product }) => {
      const info = product ? priceMap.get(product.id) : undefined;
      const unit =
        info && info.salePrice != null && info.salePrice < info.price
          ? info.salePrice
          : info?.price ?? l.price;
      return {
        order_id: order.id,
        // `product_id` phải là UUID thật trong DB (không phải id cũ trong
        // giỏ hàng) — dùng id đã resolve từ `resolved`.
        product_id: product?.id ?? l.productId,
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

    // Không có service role ⇒ guest không ghi được `order_items` (RLS chỉ
    // cho user đã đăng nhập ghi vào đơn của chính mình). Báo rõ để khách
    // biết cần đăng nhập thay vì thấy lỗi kỹ thuật.
    if (!usingServiceRole) {
      return {
        status: "error",
        message:
          "Máy chủ đang thiếu cấu hình đặt hàng (SUPABASE_SERVICE_ROLE_KEY). " +
          "Vui lòng đăng nhập để đặt hàng, hoặc liên hệ shop.",
      };
    }

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
  // Hàm RPC chỉ được GRANT cho `service_role` → chỉ dùng được khi đang dùng
  // service role client. Nếu không có service role → fallback sang cách
  // `update` trực tiếp (kém an toàn hơn nhưng vẫn trừ đúng kho).
  const hasStockRpc = usingServiceRole;
  const stockResults: boolean[] = [];

  for (const { line: l, product } of resolved) {
    const productId = product?.id ?? l.productId;
    const knownStock = product ? priceMap.get(product.id)?.stock : undefined;

    if (hasStockRpc) {
      const { data: ok } = await admin.rpc("decrement_product_stock", {
        p_product_id: productId,
        p_quantity: l.quantity,
      });
      stockResults.push(ok === true);
    } else {
      const { data: ok } = await admin
        .from("products")
        .update({
          stock: Math.max(0, (knownStock ?? l.quantity) - l.quantity),
        })
        .eq("id", productId)
        .eq("stock", knownStock ?? l.quantity)
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
      const done = resolved[i];
      if (hasStockRpc && done.product) {
        await admin.rpc("restore_product_stock", {
          p_product_id: done.product.id,
          p_quantity: done.line.quantity,
        });
      }
    }
    await admin.from("order_items").delete().eq("order_id", order.id);
    await admin.from("orders").delete().eq("id", order.id);

    const failed = resolved[failedIndex];
    const failedInfo = failed.product
      ? priceMap.get(failed.product.id)
      : undefined;
    return {
      status: "error",
      message: `"${failedInfo?.name ?? failed.line.name}" vừa hết hàng do có người khác đặt trước. Vui lòng cập nhật lại giỏ hàng.`,
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
