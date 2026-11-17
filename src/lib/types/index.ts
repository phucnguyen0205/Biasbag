import type { Database } from "@/lib/types/database";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ContactMessage =
  Database["public"]["Tables"]["contact_messages"]["Row"];
export type Banner = Database["public"]["Tables"]["banners"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];

/** Trạng thái bài viết. */
export type PostStatus = "draft" | "published" | "archived";

/** Nhãn + tone hiển thị cho trạng thái bài viết (admin + trang công khai). */
export const POST_STATUS_META: Record<
  PostStatus,
  { label: string; tone: "amber" | "emerald" | "gray" }
> = {
  draft: { label: "Bản nháp", tone: "amber" },
  published: { label: "Đã đăng", tone: "emerald" },
  archived: { label: "Đã ẩn", tone: "gray" },
};

export type ProductWithCategory = Product & {
  category: Pick<Category, "id" | "name" | "slug"> | null;
};

export type CartLine = {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  salePrice: number | null;
  quantity: number;
  color?: string | null;
  material?: string | null;
  /** Tồn kho tại thời điểm thêm vào giỏ — dùng để chặn vượt quá tồn kho. */
  stock?: number | null;
};

export type SortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "popular";

/**
 * Payload tối thiểu cần cho thao tác "thêm vào giỏ".
 *
 * `ProductCard` là Server Component — mọi prop gửi sang Client Component
 * (`AddToCartButton`) đều bị serialize vào RSC payload. Truyền cả object
 * `ProductWithCategory` (kèm `description`, `features[]`, `images[]`…) là
 * lãng phí băng thông, nên chỉ giữ lại đúng các field cần dùng.
 */
export type CartProduct = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  salePrice: number | null;
  color?: string | null;
  material?: string | null;
  stock?: number | null;
  inStock: boolean;
};
