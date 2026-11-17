"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PUBLIC_CACHE_TAG } from "@/lib/supabase/public";
import { slugify } from "@/lib/utils";

export type PostState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Slug sau khi tạo — dùng để chuyển hướng sang trang sửa. */
  slug?: string;
};

/**
 * Validate dữ liệu bài viết.
 *
 * `content` lưu dạng HTML do admin nhập qua trình soạn thảo rich-text
 * (không phải input thô của người dùng) — server không tự ý lọc HTML.
 */
const postSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề cần ít nhất 3 ký tự").max(200),
  slug: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? slugify(v) : "")),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().max(200_000).optional(),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//i.test(v) || v.startsWith("/"),
      "URL ảnh không hợp lệ",
    ),
  ogImage: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//i.test(v) || v.startsWith("/"),
      "URL ảnh OG không hợp lệ",
    ),
  category: z.string().trim().max(80).optional(),
  tags: z.string().trim().max(300).optional(),
  metaTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(320).optional(),
  metaKeywords: z.string().trim().max(400).optional(),
  status: z.enum(["draft", "published", "archived"]),
  isFeatured: z.boolean(),
});

/** Kiểm tra role admin — dùng chung pattern với `banner-actions.ts`. */
async function requireAdmin() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role !== "admin" && role !== "staff") return null;

  return { supabase, user, role };
}

/**
 * Xoá cache các route liên quan tới bài viết.
 *
 * `revalidateTag` xoá cache DATA (response PostgREST), `revalidatePath` xoá
 * cache ROUTE (HTML). Cần cả hai để bài mới hiện ngay.
 */
function revalidatePostPaths(slug?: string) {
  revalidateTag(PUBLIC_CACHE_TAG);
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/blog/${slug}`);
}

/** Tách chuỗi "a, b , c" thành mảng tag đã trim, bỏ rỗng, loại trùng. */
function parseTags(input: string | undefined): string[] {
  if (!input) return [];
  const seen = new Set<string>();
  for (const raw of input.split(",")) {
    const t = raw.trim();
    if (t) seen.add(t);
  }
  return [...seen];
}

/** Đọc form → object đã validate. */
function parseForm(formData: FormData) {
  return postSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    excerpt: String(formData.get("excerpt") ?? "") || undefined,
    content: String(formData.get("content") ?? "") || undefined,
    imageUrl: String(formData.get("imageUrl") ?? "") || undefined,
    ogImage: String(formData.get("ogImage") ?? "") || undefined,
    category: String(formData.get("category") ?? "") || undefined,
    tags: String(formData.get("tags") ?? "") || undefined,
    metaTitle: String(formData.get("metaTitle") ?? "") || undefined,
    metaDescription: String(formData.get("metaDescription") ?? "") || undefined,
    metaKeywords: String(formData.get("metaKeywords") ?? "") || undefined,
    status: formData.get("status") ?? "draft",
    isFeatured: formData.get("isFeatured") === "on",
  });
}

/**
 * Sinh slug duy nhất.
 *
 * `slug` là URL công khai nên phải unique — nếu trùng, thêm hậu tố `-2`,
 * `-3`… cho tới khi không còn trùng.
 */
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeId?: string,
): Promise<string> {
  const root = base || "bai-viet";
  let candidate = root;

  for (let i = 2; i < 50; i++) {
    const { data } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!data || (excludeId && data.id === excludeId)) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

/** Tạo bài viết mới. */
export async function createPost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin.",
    };
  }

  const auth = await requireAdmin();
  if (!auth) {
    return { status: "error", message: "Bạn không có quyền thực hiện thao tác này." };
  }

  const d = parsed.data;
  const slug = await uniqueSlug(auth.supabase, d.slug || slugify(d.title));

  const { error } = await auth.supabase.from("posts").insert({
    title: d.title,
    slug,
    excerpt: d.excerpt ?? null,
    content: d.content ?? "",
    image_url: d.imageUrl ?? null,
    og_image: d.ogImage ?? null,
    category: d.category ?? null,
    tags: parseTags(d.tags),
    meta_title: d.metaTitle ?? null,
    meta_description: d.metaDescription ?? null,
    meta_keywords: parseTags(d.metaKeywords),
    status: d.status,
    is_featured: d.isFeatured,
  });

  if (error) return { status: "error", message: error.message };

  revalidatePostPaths(slug);
  return { status: "success", message: "Đã tạo bài viết.", slug };
}

/** Cập nhật bài viết. */
export async function updatePost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "Thiếu mã bài viết." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin.",
    };
  }

  const auth = await requireAdmin();
  if (!auth) {
    return { status: "error", message: "Bạn không có quyền thực hiện thao tác này." };
  }

  const d = parsed.data;
  const slug = await uniqueSlug(
    auth.supabase,
    d.slug || slugify(d.title),
    id,
  );

  const { error } = await auth.supabase
    .from("posts")
    .update({
      title: d.title,
      slug,
      excerpt: d.excerpt ?? null,
      content: d.content ?? "",
      image_url: d.imageUrl ?? null,
      og_image: d.ogImage ?? null,
      category: d.category ?? null,
      tags: parseTags(d.tags),
      meta_title: d.metaTitle ?? null,
      meta_description: d.metaDescription ?? null,
      meta_keywords: parseTags(d.metaKeywords),
      status: d.status,
      is_featured: d.isFeatured,
    })
    .eq("id", id);

  if (error) return { status: "error", message: error.message };

  revalidatePostPaths(slug);
  return { status: "success", message: "Đã cập nhật bài viết.", slug };
}

/** Đổi trạng thái nhanh (đăng / lưu nháp / ẩn). */
export async function setPostStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<PostState> {
  const auth = await requireAdmin();
  if (!auth) {
    return { status: "error", message: "Bạn không có quyền thực hiện thao tác này." };
  }

  const { data: post } = await auth.supabase
    .from("posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (!post) return { status: "error", message: "Không tìm thấy bài viết." };

  const { error } = await auth.supabase
    .from("posts")
    .update({ status })
    .eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidatePostPaths(post.slug);
  return { status: "success", message: "Đã cập nhật trạng thái bài viết." };
}

/** Bật/tắt bài nổi bật. */
export async function togglePostFeatured(id: string): Promise<PostState> {
  const auth = await requireAdmin();
  if (!auth) {
    return { status: "error", message: "Bạn không có quyền thực hiện thao tác này." };
  }

  const { data: post } = await auth.supabase
    .from("posts")
    .select("slug, is_featured")
    .eq("id", id)
    .maybeSingle();
  if (!post) return { status: "error", message: "Không tìm thấy bài viết." };

  const { error } = await auth.supabase
    .from("posts")
    .update({ is_featured: !post.is_featured })
    .eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidatePostPaths(post.slug);
  return { status: "success", message: "Đã cập nhật bài nổi bật." };
}

/** Xoá bài viết. */
export async function deletePost(id: string): Promise<PostState> {
  const auth = await requireAdmin();
  if (!auth) {
    return { status: "error", message: "Bạn không có quyền xoá bài viết." };
  }

  const { data: post } = await auth.supabase
    .from("posts")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await auth.supabase.from("posts").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidatePostPaths(post?.slug);
  return { status: "success", message: "Đã xoá bài viết." };
}
