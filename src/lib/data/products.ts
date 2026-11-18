import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { logQueryError } from "@/lib/supabase/errors";
import type {
  Category,
  ContactMessage,
  Product,
  ProductWithCategory,
} from "@/lib/types";

const PRODUCT_COLUMNS = `
  id, name, slug, description, price, sale_price, image_url, images,
  category_id, brand, material, color, size, features,
  in_stock, stock, is_active, is_featured, rating, review_count,
  created_at, updated_at,
  categories ( id, name, slug )
`;

/**
 * Cột tối thiểu cho THẺ SẢN PHẨM (card / grid).
 *
 * `description`, `features[]`, `images[]`, `size`… là dữ liệu dài nhưng thẻ
 * sản phẩm không dùng. Bỏ chúng khỏi SELECT giúp response nhẹ hơn đáng kể
 * (mỗi sản phẩm ~1–2KB) ⇒ parse + serialize nhanh hơn ở server, payload
 * RSC nhỏ hơn khi gửi xuống client.
 *
 * `created_at` và `review_count` vẫn cần cho bộ sắp xếp ("Mới nhất" và
 * "Bán chạy") — nhưng server sắp xếp trong bộ nhớ nên không tốn băng thông
 * gửi xuống client.
 */
const CARD_PRODUCT_COLUMNS = `
  id, name, slug, price, sale_price, image_url,
  category_id, material, color, in_stock, stock,
  created_at, review_count,
  categories ( id, name, slug )
`;

/**
 * Biến thể `!inner` của embed `categories`.
 *
 * PostgREST chỉ thực sự lọc hàng ở bảng gốc khi embed dùng modifier
 * `!inner` (inner join). Nếu không, điều kiện `categories.slug=eq.x` chỉ
 * lọc dữ liệu embed mà vẫn trả về MỌI sản phẩm — sai logic.
 */
const CARD_PRODUCT_COLUMNS_INNER = CARD_PRODUCT_COLUMNS.replace(
  "categories ( id, name, slug )",
  "categories!inner ( id, name, slug )",
);

/**
 * ⚡ Cột TỐI GIẢN cho phần SHOWCASE ở trang chủ.
 *
 * Showcase chỉ hiển thị: ảnh, tên, giá, slug (để link), và cần `category`
 * để gom nhóm theo chủ đề.
 *
 * Bỏ `material`, `color`, `stock`, `in_stock`, `created_at`, `review_count`,
 * `category_id` ⇒ payload mỗi sản phẩm nhỏ hơn ~50%.
 */
const SHOWCASE_PRODUCT_COLUMNS = `
  id, name, slug, price, sale_price, image_url,
  categories ( id, name, slug )
`;

/**
 * Shape sản phẩm rút gọn cho phần showcase ở trang chủ.
 *
 * Tách riêng khỏi `ProductWithCategory` để RSC payload gửi xuống client
 * nhỏ hơn đáng kể (không kéo `material`/`color`/`stock`… không dùng).
 */
export type ShowcaseProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  category: { id: string; name: string; slug: string } | null;
};

/**
 * Chuẩn hoá hàng sản phẩm từ Supabase về `ProductWithCategory`.
 *
 * ⚠️ PostgREST trả về embed quan hệ với tên bảng GIỮ NGUYÊN (số nhiều):
 * `categories`, không phải `category`. Trước đây code đọc `product.category`
 * → luôn `undefined` ⇒ tên danh mục KHÔNG hiển thị ở thẻ sản phẩm, breadcrumb
 * hay trang chi tiết, và bộ lọc theo danh mục trong trang chủ không hoạt động.
 *
 * Hàm này gom mọi hàng về một shape duy nhất (`category` số ít) để phần còn
 * lại của ứng dụng chỉ cần đọc `product.category`.
 */
function withCategory<T extends { categories?: unknown }>(row: T) {
  const raw = row.categories as
    | { id: string; name: string; slug: string }
    | { id: string; name: string; slug: string }[]
    | null
    | undefined;

  const cat = Array.isArray(raw) ? raw[0] : raw;

  return {
    ...row,
    category: cat
      ? { id: cat.id, name: cat.name, slug: cat.slug }
      : null,
  } as Omit<T, "categories"> & {
    category: { id: string; name: string; slug: string } | null;
  };
}

export type ProductFilters = {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
};

export type ProductListResult = {
  products: ProductWithCategory[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/* ------------------------------------------------------------------ */
/*  Fallback — dùng khi chưa cấu hình Supabase, để app chạy được ngay  */
/* ------------------------------------------------------------------ */

const U = (id: string, w = 800) => `https://images.unsplash.com/${id}?w=${w}`;

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: "c-kpop",
    name: "Túi Tote K-Pop",
    slug: "tui-tote-kpop",
    description: "In hình idol, nhóm nhạc, concert — BTS, BLACKPINK, Jungkook",
    image_url: U("photo-1523293182086-7651a899d37f", 600),
    created_at: new Date().toISOString(),
  },
  {
    id: "c-logo",
    name: "Túi Tote Logo",
    slug: "tui-tote-logo",
    description: "Thương hiệu, câu slogan, logo nổi tiếng",
    image_url: U("photo-1590874103328-eac38a683ce7", 600),
    created_at: new Date().toISOString(),
  },
  {
    id: "c-dia-diem",
    name: "Túi Tote Địa Điểm",
    slug: "tui-tote-dia-diem",
    description: "Đà Nẵng, Hội An, phố cổ — Việt Nam trong từng hình thêu",
    image_url: U("photo-1553062407-98eeb64c6a62", 600),
    created_at: new Date().toISOString(),
  },
  {
    id: "c-toi-gian",
    name: "Túi Tote Tối Giản",
    slug: "tui-tote-toi-gian",
    description: "Trắng, đen, in đơn sắc — mẫu mã an toàn cho mọi outfit",
    image_url: U("photo-1594223274512-ad4803739b7c", 600),
    created_at: new Date().toISOString(),
  },
  {
    id: "c-y2k",
    name: "Túi Tote Y2K",
    slug: "tui-tote-y2k",
    description: "Họa tiết trendy, màu sắc Y2K đầy cá tính",
    image_url: U("photo-1548036328-c9fa89d128fa", 600),
    created_at: new Date().toISOString(),
  },
];

const FALLBACK_PRODUCTS: ProductWithCategory[] = [
  {
    id: "p-1",
    name: "Túi Tote Canvas Hàn Quốc — Dây Khoang Dài",
    slug: "tui-tote-canvas-han-quoc-day-khoang-dai",
    description:
      "Túi tote canvas dệt thô với dây khoang dài, đựng vừa một cuốn sổ A4 và vài món đồ. Chất liệu dày dặn, đường may chắc, phù hợp đi học, đi làm và làm phụ kiện thời trang. Bề mặt vải tự nhiên nên mỗi sản phẩm có sắc thái riêng.",
    price: 320_000,
    sale_price: 249_000,
    image_url: U("photo-1590874103328-eac38a683ce7"),
    images: [
      U("photo-1590874103328-eac38a683ce7", 1200),
      U("photo-1594223274512-ad4803739b7c", 1200),
    ],
    category_id: "c-kpop",
    brand: "BIAS BAG",
    material: "Canvas dệt thô",
    color: "Be",
    size: "38 x 42 x 12 cm",
    features: [
      "Chất liệu canvas dày, chịu lực tốt",
      "Dây khoang dài đeo vai hoặc đeo chéo",
      "Ngăn trong lớp lót vải",
      "Logo thêu dập nổi mặt trước",
    ],
    in_stock: true,
    stock: 42,
    is_active: true,
    is_featured: true,
    rating: 4.8,
    review_count: 186,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "c-kpop", name: "Túi Tote K-Pop", slug: "tui-tote-kpop" },
  },
  {
    id: "p-2",
    name: "Túi Xách Mini Da Trơn Màu Nâu",
    slug: "tui-xach-mini-da-tron-mau-nau",
    description:
      "Túi xách mini bằng da tổng hợp mặt trơn, đường viền sạch và khóa kim loại màu vàng champagne. Kích thước nhỏ gọn vừa điện thoại, ví, son và chìa khóa — dễ dàng kết hợp với váy liền hoặc blazer.",
    price: 450_000,
    sale_price: null,
    image_url: U("photo-1548036328-c9fa89d128fa"),
    images: [
      U("photo-1548036328-c9fa89d128fa", 1200),
      U("photo-1584917865442-de89df76afd3", 1200),
    ],
    category_id: "c-logo",
    brand: "BIAS BAG",
    material: "Da tổng hợp cao cấp",
    color: "Nâu",
    size: "22 x 15 x 8 cm",
    features: [
      "Mặt da trơn không in hoa văn",
      "Khóa kim loại champagne",
      "Kèm dây xích đeo vai tháo rời",
      "Lót trong vải satin",
    ],
    in_stock: true,
    stock: 28,
    is_active: true,
    is_featured: true,
    rating: 4.7,
    review_count: 143,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "c-logo", name: "Túi Tote Logo", slug: "tui-tote-logo" },
  },
  {
    id: "p-3",
    name: "Túi Đeo Vai Nữ Soft Shell Olive",
    slug: "tui-deo-vai-nu-soft-shell-olive",
    description:
      "Túi đeo vai chất liệu soft shell mềm mại, form dáng ôm vai giúp tạo cảm giác gọn gàng. Dây quai rộng giảm tải trọng lượng khi đeo lâu. Màu olive dễ phối cùng trang phục màu trung tính.",
    price: 390_000,
    sale_price: 329_000,
    image_url: U("photo-1566150905458-1bf1fc113f0d"),
    images: [
      U("photo-1566150905458-1bf1fc113f0d", 1200),
      U("photo-1523293182086-7651a899d37f", 1200),
    ],
    category_id: "c-dia-diem",
    brand: "BIAS BAG",
    material: "Soft shell",
    color: "Olive",
    size: "30 x 24 x 13 cm",
    features: [
      "Chất liệu mềm không bị xé",
      "Quai vai rộng, giảm tải trọng lượng",
      "Ngăn chính có đường khóa kéo",
      "Phù hợp đi học, đi làm, đi dạo phố",
    ],
    in_stock: true,
    stock: 35,
    is_active: true,
    is_featured: true,
    rating: 4.6,
    review_count: 97,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: {
      id: "c-dia-diem",
      name: "Túi Tote Địa Điểm",
      slug: "tui-tote-dia-diem",
    },
  },
  {
    id: "p-4",
    name: "Balo Laptop 15.6 inch Water Resistant",
    slug: "balo-laptop-156-inch-water-resistant",
    description:
      "Balô công nghệ chống nước với ngăn riêng cho laptop 15.6 inch, ngăn chống sốc phía trước và cổng USB sạc nhanh. Thiết kế gọn gàng nhưng sức chứa lớn, chuyên dụng cho học sinh, sinh viên và người đi làm.",
    price: 590_000,
    sale_price: 469_000,
    image_url: U("photo-1553062407-98eeb64c6a62"),
    images: [
      U("photo-1553062407-98eeb64c6a62", 1200),
      U("photo-1622560480605-d83c853bc5c3", 1200),
    ],
    category_id: "c-toi-gian",
    brand: "BIAS BAG",
    material: "Polyester chống nước",
    color: "Đen",
    size: "30 x 45 x 15 cm",
    features: [
      "Ngăn riêng laptop 15.6 inch",
      "Vải chống nước và chống xước",
      "Cổng USB sạc nhanh",
      "Lưng êm, dây đệm thoáng khí",
    ],
    in_stock: true,
    stock: 51,
    is_active: true,
    is_featured: true,
    rating: 4.9,
    review_count: 264,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: {
      id: "c-toi-gian",
      name: "Túi Tote Tối Giản",
      slug: "tui-tote-toi-gian",
    },
  },
  {
    id: "p-5",
    name: "Túi Xách Tròn Dáng Tròn Canvas Trắng",
    slug: "tui-xach-tron-dang-tron-canvas-trang",
    description:
      "Túi xách dáng tròn đặc trưng, dễ phối và tạo điểm nhấn cho bộ đồ tối giản. Chất liệu canvas trắng dễ vệ sinh, khóa kéo dài cho dễ mở. Mẫu túi được giới trẻ yêu thích nhờ kiểu dáng trẻ trung.",
    price: 290_000,
    sale_price: null,
    image_url: U("photo-1594223274512-ad4803739b7c"),
    images: [U("photo-1594223274512-ad4803739b7c", 1200)],
    category_id: "c-logo",
    brand: "BIAS BAG",
    material: "Canvas",
    color: "Trắng",
    size: "26 x 26 x 8 cm",
    features: [
      "Dáng tròn cá tính",
      "Khóa kéo dài dễ mở",
      "Canvas dễ vệ sinh",
      "Dây đeo da tháo rời",
    ],
    in_stock: true,
    stock: 19,
    is_active: true,
    is_featured: false,
    rating: 4.5,
    review_count: 78,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "c-logo", name: "Túi Tote Logo", slug: "tui-tote-logo" },
  },
  {
    id: "p-6",
    name: "Túi Tote Vải Nỉ Nữ Dây Xách Nâng",
    slug: "tui-tote-vai-ni-nu-day-xach-nang",
    description:
      "Túi tote vải nỉ dày dặn với dây xách nâng gọn gàng, nữ tính và thanh lịch. Vải nỉ giữ form đẹp, không nhăn, phù hợp đi làm và các buổi gặp gỡ nhẹ nhàng.",
    price: 360_000,
    sale_price: 289_000,
    image_url: U("photo-1523293182086-7651a899d37f"),
    images: [U("photo-1523293182086-7651a899d37f", 1200)],
    category_id: "c-kpop",
    brand: "BIAS BAG",
    material: "Vải nỉ",
    color: "Xám",
    size: "36 x 30 x 12 cm",
    features: [
      "Vải nỉ giữ form, không nhăn",
      "Dây xách nâng gọn gàng",
      "Lót trong canvas",
      "Nhẹ, dễ mang",
    ],
    in_stock: false,
    stock: 0,
    is_active: true,
    is_featured: false,
    rating: 4.4,
    review_count: 52,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "c-kpop", name: "Túi Tote K-Pop", slug: "tui-tote-kpop" },
  },
  {
    id: "p-7",
    name: "Túi Đeo Vai Nữ Da Nâu Cognac",
    slug: "tui-deo-vai-nu-da-nau-cognac",
    description:
      "Túi đeo vai bằng da cognac tông nâu ấm, phom dáng mềm và bo tròn. Quai da điệu giả, khóa bấm chắc chắn — thiết kế tối giản nhưng vẫn có điểm nhấn riêng.",
    price: 520_000,
    sale_price: null,
    image_url: U("photo-1584917865442-de89df76afd3"),
    images: [U("photo-1584917865442-de89df76afd3", 1200)],
    category_id: "c-dia-diem",
    brand: "BIAS BAG",
    material: "Da cognac",
    color: "Cognac",
    size: "25 x 18 x 9 cm",
    features: [
      "Da cognac tự nhiên",
      "Quai da điệu giả",
      "Khóa bấm chắc chắn",
      "Form mềm bo tròn",
    ],
    in_stock: true,
    stock: 16,
    is_active: true,
    is_featured: false,
    rating: 4.7,
    review_count: 61,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: {
      id: "c-dia-diem",
      name: "Túi Tote Địa Điểm",
      slug: "tui-tote-dia-diem",
    },
  },
  {
    id: "p-8",
    name: "Cặp Tote Laptop 14 inch Da Grainy",
    slug: "cap-tote-laptop-14-inch-da-grainy",
    description:
      "Cặp tote da grainy với ngăn laptop 14 inch, thiết kế thanh lịch cho môi trường văn phòng. Tay cầm da cầm chắc tay, đáy tăng cường giúp chứa nhiều mà vẫn giữ dáng đẹp.",
    price: 780_000,
    sale_price: 649_000,
    image_url: U("photo-1622560480605-d83c853bc5c3"),
    images: [U("photo-1622560480605-d83c853bc5c3", 1200)],
    category_id: "c-toi-gian",
    brand: "BIAS BAG",
    material: "Da grainy",
    color: "Nâu đậm",
    size: "38 x 30 x 12 cm",
    features: [
      "Ngăn laptop 14 inch",
      "Đáy tăng cường giữ dáng",
      "Tay cầm da êm tay",
      "Khoá da bấm chắc chắn",
    ],
    in_stock: true,
    stock: 9,
    is_active: true,
    is_featured: false,
    rating: 4.8,
    review_count: 34,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: {
      id: "c-toi-gian",
      name: "Túi Tote Tối Giản",
      slug: "tui-tote-toi-gian",
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lọc + sắp xếp danh sách sản phẩm mẫu (fallback).
 *
 * Dùng khi chưa cấu hình Supabase, hoặc khi truy vấn database lỗi (ví dụ
 * schema chưa được tạo) — để trang chủ vẫn hiển thị sản phẩm thay vì
 * trống trơn.
 */
function filterFallbackProducts(
  filters: ProductFilters,
  sort: string,
  page: number,
  perPage: number,
): ProductListResult {
  const { category, q, minPrice, maxPrice, inStock } = filters;

  let list = [...FALLBACK_PRODUCTS];
  if (category) list = list.filter((p) => p.category?.slug === category);
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.description?.toLowerCase().includes(needle) ||
        p.material?.toLowerCase().includes(needle),
    );
  }
  if (minPrice != null) list = list.filter((p) => p.price >= minPrice);
  if (maxPrice != null) list = list.filter((p) => p.price <= maxPrice);
  if (inStock) list = list.filter((p) => p.in_stock);

  list = sortProducts(list, sort);
  const total = list.length;
  const start = (page - 1) * perPage;

  return {
    products: list.slice(start, start + perPage),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return FALLBACK_CATEGORIES;
  // Client public (không cookie) → route chỉ cần dữ liệu public vẫn
  // có thể render tĩnh (ISR) thay vì động.
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) {
    logQueryError("getCategories", error.message);
    return FALLBACK_CATEGORIES;
  }
  return data?.length ? data : FALLBACK_CATEGORIES;
}

export async function getProducts(
  filters: ProductFilters = {},
): Promise<ProductListResult> {
  const {
    category,
    q,
    minPrice,
    maxPrice,
    inStock,
    sort = "newest",
    page = 1,
    perPage = 12,
  } = filters;

  if (!isSupabaseConfigured()) {
    return filterFallbackProducts(filters, sort, page, perPage);
  }

  // Client public (không cookie) → `/products` không bị Next.js buộc render
  // động chỉ vì đọc cookie. Route vẫn dynamic do `searchParams`, nhưng đã
  // bỏ được chi phí `cookies()` + đọc session.
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select(
      category
        ? CARD_PRODUCT_COLUMNS_INNER
        : CARD_PRODUCT_COLUMNS,
      { count: "exact" },
    )
    .eq("is_active", true);

  if (category) {
    // Lọc theo slug danh mục TRONG CÙNG một request bằng embedded filter
    // (`categories!inner` + `eq(categories.slug, …)`) thay vì query danh
    // mục trước rồi mới query sản phẩm.
    //
    // Cách cũ tạo waterfall 2 round-trip: đợi lấy `category_id` rồi mới
    // gửi query sản phẩm. Cách mới chỉ 1 round-trip → TTFB giảm rõ.
    //
    // `!inner` là BẮT BUỘC: PostgREST chỉ lọc hàng ở bảng gốc khi embed
    // là inner join. Thiếu `!inner` → điều kiện bị áp sai và trả về mọi
    // sản phẩm.
    query = query.eq("categories.slug", category);
  }
  if (q) query = query.ilike("name", `%${q}%`);
  if (minPrice != null) query = query.gte("price", minPrice);
  if (maxPrice != null) query = query.lte("price", maxPrice);
  if (inStock) query = query.eq("in_stock", true);

  const { data, count, error } = await query;
  if (error) {
    logQueryError("getProducts", error.message);
    // Schema chưa được tạo (chưa chạy supabase/schema.sql) → dùng dữ liệu mẫu
    // để trang chủ vẫn hiển thị thay vì trống trơn.
    return filterFallbackProducts(
      { category, q, minPrice, maxPrice, inStock },
      sort,
      page,
      perPage,
    );
  }

  const rows = (data ?? []).map((r) =>
    withCategory(r as unknown as { categories?: unknown }),
  ) as unknown as ProductWithCategory[];
  const sorted = sortProducts(rows, sort);
  const total = count ?? sorted.length;
  const start = (page - 1) * perPage;

  return {
    products: sorted.slice(start, start + perPage),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

function sortProducts(list: ProductWithCategory[], sort: string) {
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    case "popular":
      // `review_count` có thể không có trong payload rút gọn → dùng `?? 0`
      // để không sinh NaN khiến sort hỏng.
      return copy.sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0));
    default:
      return copy.sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      );
  }
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductWithCategory | null> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
  // Dữ liệu public → client không cookie ⇒ route chi tiết sản phẩm có thể
  // render tĩnh (ISR) thay vì dynamic.
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) {
    logQueryError("getProductBySlug", error.message);
    return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
  if (!data) return null;
  return withCategory(data as unknown as { categories?: unknown }) as unknown as ProductWithCategory;
}

export async function getFeaturedProducts(
  limit = 4,
): Promise<ProductWithCategory[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PRODUCTS.filter((p) => p.is_featured).slice(0, limit);
  }
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(CARD_PRODUCT_COLUMNS)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    logQueryError("getFeaturedProducts", error.message);
    return FALLBACK_PRODUCTS.filter((p) => p.is_featured).slice(0, limit);
  }
  return (
    (data ?? []).map((r) =>
      withCategory(r as unknown as { categories?: unknown }),
    ) as unknown as ProductWithCategory[]
  );
}

/**
 * Lấy sản phẩm THẬT theo từng danh mục/chủ đề — dùng cho section
 * "Năm chủ đề in, một thương hiệu" ở trang chủ.
 *
 * Mục đích: thay vì dùng ảnh mockup cố định (`categories.image_url` là ảnh
 * Unsplash không liên quan tới sản phẩm), mỗi ô chủ đề hiển thị ảnh + tên +
 * giá của sản phẩm thực sự đang bán trong danh mục đó.
 *
 * Trả về map theo slug danh mục → danh sách sản phẩm (đã sort sẵn), để
 * server render 1 lần cho cả 5 ô thay vì 5 lần query tuần tự.
 *
 * ⚠️ Ưu tiên dùng `getHomeShowcase()` (bản rút gọn payload) cho trang chủ
 * và `/about`. Hàm này giữ lại để tương thích nếu cần shape đầy đủ.
 */
export async function getCategoryShowcase(
  perCategory = 3,
): Promise<Record<string, ProductWithCategory[]>> {
  if (!isSupabaseConfigured()) {
    // Fallback: gom sản phẩm mẫu theo slug danh mục.
    const map: Record<string, ProductWithCategory[]> = {};
    for (const p of FALLBACK_PRODUCTS) {
      const slug = p.category?.slug;
      if (!slug) continue;
      (map[slug] ??= []).push(p);
    }
    for (const k of Object.keys(map)) map[k] = map[k].slice(0, perCategory);
    return map;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(CARD_PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    logQueryError("getCategoryShowcase", error.message);
    return {};
  }

  const map: Record<string, ProductWithCategory[]> = {};
  for (const raw of (data ?? []).map((r) =>
    withCategory(r as unknown as { categories?: unknown }),
  ) as unknown as ProductWithCategory[]) {
    const slug = raw.category?.slug;
    if (!slug) continue;
    const bucket = (map[slug] ??= []);
    // Chỉ giữ `perCategory` sản phẩm đầu mỗi danh mục.
    if (bucket.length < perCategory) bucket.push(raw);
  }
  return map;
}

/**
 * ⚡ Dữ liệu trang chủ — GỘP nhiều truy vấn thành 1.
 *
 * ── Vấn đề trước đây ──────────────────────────────────────────────────────
 * Trang chủ cần 3 nguồn dữ liệu sản phẩm/danh mục:
 *
 *   1. `getCategories()`        → 1 query
 *   2. `getFeaturedProducts(8)` → 1 query
 *   3. `getCategoryShowcase(3)` → 1 query **quét TOÀN BỘ bảng products**
 *
 * Query #3 kéo về MỌI sản phẩm active (kể cả những sản phẩm không hiển thị
 * ở trang chủ) rồi mới cắt còn 3 sản phẩm/danh mục ở phía server.
 *
 * Với catalog lớn (hàng trăm sản phẩm) ⇒ payload DB nặng, parse JSON chậm,
 * và mỗi lần ISR revalidate đều phải làm lại ⇒ TTFB tăng.
 *
 * ── Cách tối ưu ───────────────────────────────────────────────────────────
 * Gộp thành **2 query song song**:
 *
 *   1. Query A: `products` có `is_featured = true`, limit 8
 *   2. Query B: `products` active, CÓ cột `category_id` + `is_featured`
 *                → chỉ cần `category_id`, `name`, `price`, `slug`,
 *                  `sale_price`, `image_url` cho phần showcase
 *
 * Rồi bên server dựng map theo `category_id` ⇒ không tải dữ liệu thừa.
 *
 * ⚠️ Phần showcase dùng cột TỐI GIẢN (không kéo `categories` embed, không
 * kéo `material`/`color`/`stock`) ⇒ payload giảm ~50% so với query cũ.
 */
export async function getHomeShowcase(
  perCategory = 3,
): Promise<Record<string, ShowcaseProduct[]>> {
  if (!isSupabaseConfigured()) {
    const map: Record<string, ShowcaseProduct[]> = {};
    for (const p of FALLBACK_PRODUCTS) {
      const slug = p.category?.slug;
      if (!slug) continue;
      (map[slug] ??= []).push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        sale_price: p.sale_price,
        image_url: p.image_url,
        category: p.category,
      });
    }
    for (const k of Object.keys(map)) map[k] = map[k].slice(0, perCategory);
    return map;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(SHOWCASE_PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    logQueryError("getHomeShowcase", error.message);
    return {};
  }

  const rows = (data ?? []).map((r) =>
    withCategory(r as unknown as { categories?: unknown }),
  ) as unknown as ShowcaseProduct[];

  const map: Record<string, ShowcaseProduct[]> = {};
  for (const raw of rows) {
    const slug = raw.category?.slug;
    if (!slug) continue;
    const bucket = (map[slug] ??= []);
    if (bucket.length < perCategory) bucket.push(raw);
  }
  return map;
}

export async function getRelatedProducts(
  product: Product,
  limit = 4,
): Promise<ProductWithCategory[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_PRODUCTS.filter(
      (p) => p.id !== product.id && p.category_id === product.category_id,
    ).slice(0, limit);
  }
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select(CARD_PRODUCT_COLUMNS)
    .eq("is_active", true);

  if (product.category_id) {
    query = query.eq("category_id", product.category_id);
  }

  const { data } = await query.neq("id", product.id).limit(limit);
  return (
    (data ?? []).map((r) =>
      withCategory(r as unknown as { categories?: unknown }),
    ) as unknown as ProductWithCategory[]
  );
}

export async function getAdminProducts(): Promise<ProductWithCategory[]> {
  if (!isSupabaseConfigured()) return FALLBACK_PRODUCTS;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });
  return (
    (data ?? []).map((r) =>
      withCategory(r as unknown as { categories?: unknown }),
    ) as unknown as ProductWithCategory[]
  );
}

/** Tin nhắn từ form liên hệ (chỉ admin đọc được — RLS chặn). */
export async function getContactMessages(): Promise<ContactMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as unknown as ContactMessage[]) ?? [];
}
