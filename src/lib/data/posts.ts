import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { logQueryError } from "@/lib/supabase/errors";
import type { Post, PostStatus } from "@/lib/types";

/**
 * Data layer cho bài viết (blog).
 *
 * Bài viết do admin nhập trong `/admin/posts` — lưu trong Supabase.
 *
 * Quy tắc đọc:
 *   - Trang công khai (`/blog`, `/blog/[slug]`) dùng **public client** (không
 *     cookie) ⇒ route vẫn render tĩnh (ISR) được, không bị Next.js buộc
 *     render động chỉ vì đọc session.
 *   - Trang quản trị dùng client có session để thấy cả bản nháp.
 */

/**
 * Cột tối thiểu cho THẺ BÀI VIẾT.
 *
 * `content` (HTML đầy đủ) rất nặng — thẻ card không dùng. Bỏ khỏi SELECT
 * giúp payload nhẹ ⇒ parse/serialize nhanh hơn ở server, RSC payload nhỏ
 * hơn khi gửi xuống client.
 */
const CARD_POST_COLUMNS = `
  id, title, slug, excerpt, image_url, og_image, tags, category,
  meta_title, meta_description, meta_keywords, is_featured, status,
  view_count, published_at, created_at, updated_at
`;

/** Cột đầy đủ (dùng cho trang chi tiết). */
const FULL_POST_COLUMNS = `
  ${CARD_POST_COLUMNS}, content
`;

export type PostListResult = {
  posts: Post[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type PostQuery = {
  /**
   * Lọc theo trạng thái.
   *   - `published` (mặc định) — công khai.
   *   - `all` — mọi trạng thái (chỉ dùng trong trang quản trị).
   */
  status?: PostStatus | "all";
  /** Tìm theo tiêu đề / tóm tắt / nội dung. */
  q?: string;
  /** Lọc theo tag. */
  tag?: string;
  /** Chỉ lấy bài nổi bật. */
  featured?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
};

/* ------------------------------------------------------------------ */
/*  Fallback — dùng khi chưa cấu hình Supabase / lỗi mạng              */
/* ------------------------------------------------------------------ */

const FALLBACK_POSTS: Post[] = [
  {
    id: "fb-post-1",
    title: "Cách phối màu túi tote theo dáng người",
    slug: "cach-phan-mau-tui-tote-theo-dang-nguoi",
    excerpt:
      "Túi tote không chỉ là phụ kiện đi theo — màu sắc của chiếc túi còn giúp tôn lên tổng thể outfit của bạn.",
    content: `<p>Túi tote không chỉ là phụ kiện đi theo — màu sắc của chiếc túi còn giúp tôn lên tổng thể outfit của bạn.</p>
<h2>Bắt đầu từ tông áo</h2>
<p>Quy tắc đơn giản nhất: chọn túi đối lập hoặc tương phản với tông áo đang mặc. Áo trắng, quần denim đậm thì túi be hoặc nâu là lựa chọn an toàn và tôn dáng.</p>
<ul>
<li>Outfit tối giản (đen, trắng, xám) → túi màu nổi bật làm điểm nhấn.</li>
<li>Outfit nhiều màu → túi trung tính để không gây rối mắt.</li>
<li>Outfit đơn sắc → túi cùng tông tạo cảm giác đồng bộ, cao cấp.</li>
</ul>
<h2>Chú ý kích thước túi so với vai</h2>
<p>Túi nhỏ hơn vai một chút, treo vừa ngang hông là tỉ lệ đẹp nhất. Túi quá lớn sẽ khiến dáng người bị "bị nuốt", còn túi quá nhỏ lại khó đựng đồ.</p>
<blockquote>Chiếc túi tốt không lấn át bạn, mà khiến bạn nổi bật hơn.</blockquote>`,
    image_url: null,
    og_image: null,
    tags: ["phối đồ", "túi tote"],
    category: "Phong cách",
    meta_title: null,
    meta_description:
      "Hướng dẫn phối màu túi tote theo tông áo, kích thước túi so với vai và cách chọn màu an toàn cho giới trẻ.",
    meta_keywords: null,
    is_featured: true,
    status: "published",
    view_count: 0,
    published_at: "2026-01-15T08:00:00.000Z",
    created_at: "2026-01-15T08:00:00.000Z",
    updated_at: "2026-01-15T08:00:00.000Z",
  },
  {
    id: "fb-post-2",
    title: "Bảo quản túi canvas đúng cách để dùng lâu hơn",
    slug: "bao-quan-tui-canvas-theo-dung-cach",
    excerpt:
      "Canvas dệt thô bền, nhưng cách giặt và bảo quản sai có thể khiến vải nhanh xù, mất form.",
    content: `<p>Canvas dệt thô bền, nhưng cách giặt và bảo quản sai có thể khiến vải nhanh xù, mất form dáng sau vài lần sử dụng.</p>
<h2>Giặt đúng cách</h2>
<ul>
<li>Lội ngược mặt in, tắt chế độ vắt — vắt mạnh làm nét thêu và hình in bị nhăn.</li>
<li>Dùng nước lạnh và xà phòng nhẹ, không dùng thuốc tẩy mạnh.</li>
<li>Phơi nơi thoáng gió, tránh nắng trực tiếp để màu không bạc.</li>
</ul>
<h2>Vệ sinh vết bẩn thường gặp</h2>
<p>Giặt tay bằng xà phòng pha loãng và dùng bàn chải mềm chà nhẹ. Với vết mực, xử lý từ mép vết vào trong để không lan ra nền vải.</p>
<h2>Làm phẳng lại form túi</h2>
<p>Vuốt tay dọc theo sợi vải khi túi còn ẩm, hoặc treo túi ở nơi có gió để vải tự căng. Không dùng bàn ủi nóng trực tiếp lên bề mặt in.</p>`,
    image_url: null,
    og_image: null,
    tags: ["bảo quản", "canvas"],
    category: "Hướng dẫn",
    meta_title: null,
    meta_description:
      "Cách giặt, vệ sinh vết bẩn và phơi khô túi canvas để giữ form dáng và màu sắc lâu dài.",
    meta_keywords: null,
    is_featured: true,
    status: "published",
    view_count: 0,
    published_at: "2026-01-08T08:00:00.000Z",
    created_at: "2026-01-08T08:00:00.000Z",
    updated_at: "2026-01-08T08:00:00.000Z",
  },
  {
    id: "fb-post-3",
    title: "Một chiếc túi tote đi học, đi làm và đi chơi",
    slug: "tui-tote-mua-hoc-kien-va-lam-viec",
    excerpt:
      "Túi tote size vừa phải, chất liệu dày, có ngăn riêng cho laptop và sổ vở là người bạn đồng hành đáng tin.",
    content: `<p>Túi tote size vừa phải, chất liệu dày, có ngăn riêng cho laptop và sổ vở là người bạn đồng hành đáng tin mỗi ngày.</p>
<h2>Kích thước nào vừa?</h2>
<p>Chiếc túi 38 x 42 cm đựng vừa một cuốn sổ A4, một chiếc laptop 14 inch và vài món đồ cá nhân. Đây là kích thước dùng được nhiều nhất cho học sinh, sinh viên và người làm văn phòng.</p>
<h2>Đừng quên dây khoang</h2>
<p>Dây khoang dài cho phép đeo vai hoặc đeo chéo. Với dây dài, túi nằm gọn trên hông, tay bạn hoàn toàn tự do — rất tiện khi đang cầm cà phê hoặc cầm điện thoại.</p>
<blockquote>Chiếc túi tốt là chiếc túi bạn không phải nghĩ nhiều mỗi khi ra khỏi nhà.</blockquote>`,
    image_url: null,
    og_image: null,
    tags: ["mẹo chọn túi", "túi tote"],
    category: "Hướng dẫn",
    meta_title: null,
    meta_description:
      "Chọn kích thước, chất liệu và dây khoang cho túi tote đa dụng dùng hàng ngày.",
    meta_keywords: null,
    is_featured: false,
    status: "published",
    view_count: 0,
    published_at: "2025-12-20T08:00:00.000Z",
    created_at: "2025-12-20T08:00:00.000Z",
    updated_at: "2025-12-20T08:00:00.000Z",
  },
];

/** Lọc + sắp xếp danh sách bài mẫu (fallback). */
function filterFallbackPosts(query: PostQuery): PostListResult {
  const { status = "published", q, tag, featured, sort = "newest", page = 1, perPage = 9 } = query;

  let list = [...FALLBACK_POSTS];

  if (status !== "all") list = list.filter((p) => p.status === status);
  if (featured) list = list.filter((p) => p.is_featured);
  if (tag) list = list.filter((p) => p.tags?.includes(tag));
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.excerpt?.toLowerCase().includes(needle) ||
        p.content.toLowerCase().includes(needle),
    );
  }

  list = sortPosts(list, sort);

  const total = list.length;
  const start = (page - 1) * perPage;

  return {
    posts: list.slice(start, start + perPage),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

function sortPosts(list: Post[], sort: string): Post[] {
  const copy = [...list];
  switch (sort) {
    case "oldest":
      return copy.sort(
        (a, b) =>
          +new Date(a.published_at ?? a.created_at) -
          +new Date(b.published_at ?? b.created_at),
      );
    case "popular":
      return copy.sort((a, b) => b.view_count - a.view_count);
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    default:
      return copy.sort(
        (a, b) =>
          +new Date(b.published_at ?? b.created_at) -
          +new Date(a.published_at ?? a.created_at),
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/**
 * Lấy danh sách bài viết.
 *
 * Dùng `createPublicClient()` khi chỉ đọc bài đã đăng ⇒ không đụng cookie
 * ⇒ route công khai vẫn render tĩnh (ISR) được.
 */
export async function getPosts(query: PostQuery = {}): Promise<PostListResult> {
  const {
    status = "published",
    q,
    tag,
    featured,
    sort = "newest",
    page = 1,
    perPage = 9,
  } = query;

  if (!isSupabaseConfigured()) return filterFallbackPosts(query);

  // Admin cần xem cả bản nháp → dùng client có session.
  // Khách chỉ xem bài đã đăng → public client (không cookie).
  const isAdminView = status !== "published";
  const supabase = isAdminView ? await createClient() : createPublicClient();

  let req = supabase
    .from("posts")
    .select(CARD_POST_COLUMNS, { count: "exact" });

  if (status !== "all") req = req.eq("status", status);
  if (featured) req = req.eq("is_featured", true);
  if (tag) req = req.contains("tags", [tag]);
  if (q) {
    // Tìm theo tiêu đề HOẶC tóm tắt. `or()` của PostgREST dùng cú pháp
    // `col1.eq.value,col2.ilike.*value*`.
    req = req.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  }

  // Sắp xếp: theo ngày đăng (mặc định), cũ nhất, lượt xem, hoặc A→Z.
  switch (sort) {
    case "oldest":
      req = req.order("published_at", { ascending: true, nullsFirst: false });
      break;
    case "popular":
      req = req.order("view_count", { ascending: false });
      break;
    case "title":
      req = req.order("title", { ascending: true });
      break;
    default:
      req = req.order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data, count, error } = await req;
  if (error) {
    logQueryError("getPosts", error.message);
    return filterFallbackPosts(query);
  }

  const rows = (data ?? []) as unknown as Post[];
  const total = count ?? rows.length;
  const start = (page - 1) * perPage;

  return {
    posts: rows.slice(start, start + perPage),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Lấy 1 bài viết theo slug (chỉ bài đã đăng — dùng cho trang công khai). */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_POSTS.find((p) => p.slug === slug) ?? null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(FULL_POST_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    logQueryError("getPostBySlug", error.message);
    return FALLBACK_POSTS.find((p) => p.slug === slug) ?? null;
  }
  return (data as unknown as Post) ?? null;
}

/** Lấy 1 bài viết theo slug — kể cả bản nháp (dùng trong trang quản trị). */
export async function getAdminPostBySlug(slug: string): Promise<Post | null> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_POSTS.find((p) => p.slug === slug) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(FULL_POST_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    logQueryError("getAdminPostBySlug", error.message);
    return null;
  }
  return (data as unknown as Post) ?? null;
}

/** Bài viết nổi bật — dùng cho trang chủ. */
export async function getFeaturedPosts(limit = 3): Promise<Post[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_POSTS.filter((p) => p.is_featured).slice(0, limit);
  }
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(CARD_POST_COLUMNS)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) {
    logQueryError("getFeaturedPosts", error.message);
    return FALLBACK_POSTS.filter((p) => p.is_featured).slice(0, limit);
  }
  return (data as unknown as Post[]) ?? [];
}

/**
 * Bài viết liên quan.
 *
 * Ưu tiên bài có chung tag; nếu không có thì lấy bài mới nhất.
 */
export async function getRelatedPosts(
  post: Post,
  limit = 3,
): Promise<Post[]> {
  if (!isSupabaseConfigured()) {
    return FALLBACK_POSTS.filter((p) => p.slug !== post.slug).slice(0, limit);
  }

  const supabase = createPublicClient();

  // Ưu tiên bài có chung tag.
  const sharedTag = post.tags?.[0];
  if (sharedTag) {
    const { data, error } = await supabase
      .from("posts")
      .select(CARD_POST_COLUMNS)
      .eq("status", "published")
      .neq("slug", post.slug)
      .contains("tags", [sharedTag])
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (!error && data && data.length) {
      return (data as unknown as Post[]).slice(0, limit);
    }
  }

  // Không có bài chung tag → lấy bài mới nhất.
  const { data } = await supabase
    .from("posts")
    .select(CARD_POST_COLUMNS)
    .eq("status", "published")
    .neq("slug", post.slug)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  return (data as unknown as Post[]) ?? [];
}

/** Toàn bộ tag đang dùng (kèm số bài) — dùng cho bộ lọc ở trang blog. */
export async function getPostTags(): Promise<{ tag: string; count: number }[]> {
  if (!isSupabaseConfigured()) {
    const map = new Map<string, number>();
    for (const p of FALLBACK_POSTS) {
      for (const t of p.tags ?? []) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select("tags")
    .eq("status", "published");
  if (error) {
    logQueryError("getPostTags", error.message);
    return [];
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as { tags: string[] | null }[]) {
    for (const t of row.tags ?? []) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
