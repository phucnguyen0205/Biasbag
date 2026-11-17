"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bold,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Save,
  Undo2,
} from "lucide-react";
import { createPost, updatePost, type PostState } from "@/app/admin/post-actions";
import ImageUploader from "@/components/admin/image-uploader";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

const initialState: PostState = { status: "idle" };

/**
 * Form thêm / sửa bài viết.
 *
 * Trình soạn thảo là textarea + thanh công cụ đơn giản (không kéo thả
 * file `contenteditable`): nội dung lưu dạng HTML, render bằng `.prose-bb`.
 *
 * Cách toolbar chèn thẻ: bọc phần text được chọn bằng thẻ tương ứng.
 * Dùng `document.execCommand` (deprecated nhưng vẫn hoạt động ở mọi trình
 * duyệt, hỗ trợ tốt cho textarea-based editor đơn giản).
 */
export default function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const isEdit = Boolean(post);

  const [state, formAction, pending] = useActionState(
    isEdit ? updatePost : createPost,
    initialState,
  );

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  /** Nội dung bài viết (HTML) — nằm trong state để chế độ xem trước cập nhật. */
  const [content, setContent] = useState(post?.content ?? "");

  // Slug tự sinh từ tiêu đề khi admin chưa sửa slug thủ công.
  useEffect(() => {
    if (slugTouched) return;
    setSlug(
      title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
  }, [title, slugTouched]);

  // Thông báo thành công → làm mới danh sách bên cạnh.
  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, state.message, router]);

  /** Bọc phần text đang chọn bằng thẻ HTML. */
  function wrapSelection(before: string, after = before) {
    const ta = contentRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end, value } = ta;
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    // Cập nhật state qua React: dùng setter điều khiển.
    setContent(next);
    // Giữ con trỏ trong vùng vừa chèn.
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(
        start + before.length,
        end + before.length,
      );
    });
  }

  /**
   * Chèn một khối HTML tại vị trí con trỏ.
   *
   * Với các khối cấu trúc (tiêu đề, danh sách, trích dẫn) nội dung nằm
   * trên dòng riêng → bọc thêm `<p>`.
   */
  function insertBlock(html: string) {
    const ta = contentRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end, value } = ta;
    const block = html.startsWith("<p>") ? html : `<p>${html}</p>`;
    const next = `${value.slice(0, start)}${block}${value.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + block.length, start + block.length);
    });
  }

  const tools = [
    { label: "In đậm", icon: Bold, action: () => wrapSelection("<strong>", "</strong>") },
    { label: "In nghiêng", icon: Italic, action: () => wrapSelection("<em>", "</em>") },
    { label: "Tiêu đề", icon: Heading2, action: () => insertBlock("<h2>Tiêu đề</h2>") },
    { label: "Danh sách", icon: List, action: () => insertBlock("<ul><li>Mục 1</li></ul>") },
    { label: "Danh sách đánh số", icon: ListOrdered, action: () => insertBlock("<ol><li>Mục 1</li></ol>") },
    { label: "Trích dẫn", icon: Quote, action: () => insertBlock("<blockquote>Trích dẫn</blockquote>") },
    { label: "Liên kết", icon: Link2, action: () => wrapSelection('<a href="https://">', "</a>") },
  ];

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={post!.id} />}

      {/* Thông báo */}
      {state.status !== "idle" && state.message && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            state.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          {state.message}
          {state.status === "success" && isEdit && (
            <Link
              href={`/blog/${post!.slug}`}
              className="ml-2 font-medium underline"
              target="_blank"
              rel="noreferrer"
            >
              Xem bài ↗
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Cột chính ─────────────────────────────────────────── */}
        <div className="space-y-5 lg:col-span-2">
          <div className="card space-y-5 p-5">
            <div>
              <label htmlFor="title" className="label">
                Tiêu đề <span className="text-rose-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Cách phối màu túi tote theo dáng người"
                className="input"
                required
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="slug" className="label">
                Đường dẫn (slug)
              </label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-ink-400">
                  /blog/
                </span>
                <input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  className="input"
                  maxLength={200}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-400">
                Để trống sẽ tự sinh từ tiêu đề. Slug là URL công khai — đổi
                slug sau khi đã chia sẻ sẽ làm hỏng link cũ.
              </p>
            </div>

            <div>
              <label htmlFor="excerpt" className="label">
                Tóm tắt
              </label>
              <textarea
                id="excerpt"
                name="excerpt"
                defaultValue={post?.excerpt ?? ""}
                rows={3}
                maxLength={500}
                placeholder="Tóm tắt ngắn gọn, hiện ở thẻ bài viết và trong kết quả tìm kiếm."
                className="input"
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Nên có khoảng 120–160 ký tự để hiển thị đẹp trên Google.
              </p>
            </div>
          </div>

          {/* Trình soạn thảo nội dung */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
              <p className="label mb-0">Nội dung bài viết</p>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                  preview
                    ? "bg-blush-50 text-blush-700"
                    : "text-ink-500 hover:bg-ink-50",
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                {preview ? "Soạn thảo" : "Xem trước"}
              </button>
            </div>

            {preview ? (
              <div
                className="prose-bb min-h-[380px] p-5"
                dangerouslySetInnerHTML={{ __html: content || "<p>Chưa có nội dung.</p>" }}
              />
            ) : (
              <>
                {/* Toolbar */}
                <div className="flex flex-wrap gap-1 border-b border-ink-100 bg-ink-50/60 px-3 py-2">
                  {tools.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={t.action}
                      title={t.label}
                      aria-label={t.label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-white hover:text-ink-900"
                    >
                      <t.icon className="h-4 w-4" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setContent("")}
                    title="Xoá hết nội dung"
                    aria-label="Xoá hết nội dung"
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-white hover:text-ink-900"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                </div>

                <textarea
                  ref={contentRef}
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={18}
                  placeholder="<p>Nội dung bài viết…</p>"
                  className="w-full resize-y border-0 p-4 font-mono text-sm leading-relaxed text-ink-800 outline-none focus:ring-0"
                />
              </>
            )}

            {/* Hidden input giữ nội dung khi đang ở chế độ xem trước */}
            {preview && <input type="hidden" name="content" value={content} />}
          </div>
        </div>

        {/* ── Cột phụ ───────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Xuất bản */}
          <div className="card space-y-4 p-5">
            <p className="label mb-0">Xuất bản</p>

            <div>
              <label htmlFor="status" className="label">
                Trạng thái
              </label>
              <select
                id="status"
                name="status"
                defaultValue={post?.status ?? "draft"}
                className="input"
              >
                <option value="draft">Bản nháp — chưa công khai</option>
                <option value="published">Đã đăng — hiện công khai</option>
                <option value="archived">Đã ẩn — gỡ khỏi trang</option>
              </select>
              <p className="mt-1.5 text-xs text-ink-400">
                Chỉ bài <strong>Đã đăng</strong> mới hiện trên /blog và được
                Google lập chỉ mục.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={post?.is_featured ?? false}
                className="h-4 w-4 rounded border-ink-300 text-blush-600 focus:ring-blush-300"
              />
              Bài nổi bật
            </label>

            <button
              type="submit"
              disabled={pending}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {pending
                ? "Đang lưu…"
                : isEdit
                  ? "Cập nhật bài viết"
                  : "Tạo bài viết"}
            </button>
          </div>

          {/* Ảnh */}
          <div className="card p-5">
            <ImageUploader
              name="imageUrl"
              defaultUrl={post?.image_url ?? ""}
              folder="posts"
              label="Ảnh bài viết"
            />
            <p className="mt-2 text-xs text-ink-400">
              Ảnh nằm ngang (16:9) hiển thị tốt nhất. Kích thước khuyến nghị
              1200×675px.
            </p>
          </div>

          {/* Phân loại */}
          <div className="card space-y-4 p-5">
            <p className="label mb-0">Phân loại</p>

            <div>
              <label htmlFor="category" className="label">
                Chủ đề
              </label>
              <input
                id="category"
                name="category"
                defaultValue={post?.category ?? ""}
                placeholder="Hướng dẫn, Phong cách…"
                maxLength={80}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="tags" className="label">
                Tags
              </label>
              <input
                id="tags"
                name="tags"
                defaultValue={post?.tags?.join(", ") ?? ""}
                placeholder="phối đồ, bảo quản, canvas"
                maxLength={300}
                className="input"
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Ngăn cách bằng dấu phẩy. Tags tạo liên kết nội bộ giúp SEO.
              </p>
            </div>
          </div>

          {/* SEO */}
          <div className="card space-y-4 p-5">
            <div>
              <p className="label mb-0">Tối ưu SEO</p>
              <p className="mt-1 text-xs text-ink-400">
                Để trống sẽ dùng tiêu đề &amp; tóm tắt của bài.
              </p>
            </div>

            <div>
              <label htmlFor="metaTitle" className="label">
                Meta title
              </label>
              <input
                id="metaTitle"
                name="metaTitle"
                defaultValue={post?.meta_title ?? ""}
                maxLength={200}
                placeholder="Tiêu đề hiển thị trên Google"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="metaDescription" className="label">
                Meta description
              </label>
              <textarea
                id="metaDescription"
                name="metaDescription"
                defaultValue={post?.meta_description ?? ""}
                rows={3}
                maxLength={320}
                placeholder="Mô tả ngắn hiển thị dưới tiêu đề trên Google (120–160 ký tự)."
                className="input"
              />
            </div>

            <div>
              <label htmlFor="metaKeywords" className="label">
                Meta keywords
              </label>
              <input
                id="metaKeywords"
                name="metaKeywords"
                defaultValue={post?.meta_keywords?.join(", ") ?? ""}
                maxLength={400}
                placeholder="túi tote, mẹo phối đồ, giới trẻ"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="ogImage" className="label">
                Ảnh OG (ảnh chia sẻ Facebook/Zalo)
              </label>
              <input
                id="ogImage"
                name="ogImage"
                defaultValue={post?.og_image ?? ""}
                placeholder="Để trống sẽ dùng ảnh đại diện"
                className="input"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
