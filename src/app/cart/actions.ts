"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const lineSchema = z.object({
  productId: z.string().min(1),
  slug: z.string().min(1),
  quantity: z.number().int().min(1),
});

export type CartCheckResult = {
  /** ID trong giỏ KHÔNG còn tồn tại trong DB → client nên xoá khỏi giỏ. */
  removedIds: string[];
  /** Sản phẩm còn tồn tại nhưng đã ngừng bán → client nên báo cho khách. */
  inactiveNames: string[];
  /** Sản phẩm hết hàng → client nên báo cho khách. */
  outOfStockNames: string[];
  /** ID thật (UUID) của từng sản phẩm, để client đồng bộ lại giỏ. */
  idBySlug: Record<string, string>;
  /** Tồn kho mới nhất, để client chặn vượt quá tồn kho. */
  stockBySlug: Record<string, number>;
};

/**
 * Kiểm tra giỏ hàng với database.
 *
 * VÌ SAO CẦN:
 * Giỏ hàng nằm trong `localStorage` nên có thể mang ID cũ (sản phẩm đã xoá,
 * hoặc ID kiểu fallback `p-1` từ chế độ demo). Nếu không đồng bộ, mọi đơn
 * đều bị chặn với thông báo chung chung "sản phẩm không còn tồn tại" dù giỏ
 * hoàn toàn hợp lệ.
 *
 * Action này trả về danh sách ID cần xoá + thông tin tồn kho mới để client
 * tự dọn giỏ — khách không phải tự bỏ từng sản phẩm.
 */
export async function checkCartLines(
  rawLines: unknown,
): Promise<CartCheckResult> {
  const empty: CartCheckResult = {
    removedIds: [],
    inactiveNames: [],
    outOfStockNames: [],
    idBySlug: {},
    stockBySlug: {},
  };

  if (!isSupabaseConfigured()) return empty;

  const parsed = z.array(lineSchema).safeParse(rawLines);
  if (!parsed.success || !parsed.data.length) return empty;

  let admin;
  try {
    admin = await createAdminClient();
  } catch {
    return empty;
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const ids = parsed.data.map((l) => l.productId).filter((id) => UUID_RE.test(id));
  const slugs = parsed.data.map((l) => l.slug);

  const rows: {
    id: string;
    name: string;
    slug: string;
    stock: number;
    in_stock: boolean;
    is_active: boolean;
  }[] = [];

  if (ids.length) {
    const { data } = await admin
      .from("products")
      .select("id, name, slug, stock, in_stock, is_active")
      .in("id", ids);
    rows.push(...((data ?? []) as typeof rows));
  }

  const { data: bySlug } = await admin
    .from("products")
    .select("id, name, slug, stock, in_stock, is_active")
    .in("slug", slugs);
  rows.push(...((bySlug ?? []) as typeof rows));

  // Bỏ trùng theo id.
  const unique = new Map(rows.map((r) => [r.id, r]));
  const all = [...unique.values()];

  const byId = new Map(all.map((r) => [r.id, r]));
  const bySlugMap = new Map(all.map((r) => [r.slug, r]));

  const removedIds: string[] = [];
  const inactiveNames: string[] = [];
  const outOfStockNames: string[] = [];
  const idBySlug: Record<string, string> = {};
  const stockBySlug: Record<string, number> = {};

  for (const line of parsed.data) {
    const product = byId.get(line.productId) ?? bySlugMap.get(line.slug);

    if (!product) {
      removedIds.push(line.productId);
      continue;
    }

    idBySlug[line.slug] = product.id;
    stockBySlug[line.slug] = Number(product.stock);

    if (!product.is_active) inactiveNames.push(product.name);
    else if (!product.in_stock || Number(product.stock) <= 0) {
      outOfStockNames.push(product.name);
    }
  }

  return {
    removedIds,
    inactiveNames,
    outOfStockNames,
    idBySlug,
    stockBySlug,
  };
}
