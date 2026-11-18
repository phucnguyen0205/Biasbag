"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { uploadImageAction } from "@/app/admin/upload-actions";
import { compressImage, formatBytes } from "@/lib/image-compress";

/**
 * Component upload ảnh sản phẩm.
 *
 * KHÔNG dùng thẻ `<form>` bên trong vì form cha (product form) sẽ bị lồng
 * form — trình duyệt bỏ qua thẻ form con, khiến nút upload submit nhầm form
 * cha. Thay vào đó gọi server action trực tiếp qua `useTransition`.
 */
export default function ImageUploader({
  name = "imageUrl",
  defaultUrl = "",
  folder = "products",
  label = "Ảnh sản phẩm",
}: {
  name?: string;
  defaultUrl?: string;
  folder?: string;
  /** Nhãn hiển thị — đổi theo ngữ cảnh (ảnh sản phẩm / ảnh bài viết…). */
  label?: string;
}) {
  const [preview, setPreview] = useState(defaultUrl);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<string | null>(null);

  // Giải phóng object URL cũ để không rò rỉ bộ nhớ.
  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    const objectUrl = URL.createObjectURL(file);
    blobRef.current = objectUrl;
    setPreview(objectUrl);
    setMessage(null);

    // Upload ngay khi chọn ảnh.
    startTransition(async () => {
      /**
       * ⚡ NÉN ẢNH TRƯỚC KHI UPLOAD.
       *
       * Server Action của Next.js chỉ nhận body ≤ 1 MB. Ảnh sản phẩm gốc
       * (1200–1400px) thường 2–5 MB ⇒ request bị từ chối (413) ⇒ trình
       * duyệt hiện "Application error". Nén ở client ⇒ body luôn < 1 MB.
       */
      const compressed = await compressImage(file, {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.82,
      });

      const formData = new FormData();
      formData.append("file", compressed.file);
      formData.append("folder", folder);

      const result = await uploadImageAction(formData);

      if (result.status === "success" && result.url) {
        setPreview(result.url);
        if (hiddenRef.current) hiddenRef.current.value = result.url;
        setMessage({
          tone: "success",
          text: compressed.compressed
            ? `Đã upload ảnh (${formatBytes(compressed.originalSize)} → ${formatBytes(compressed.finalSize)}).`
            : (result.message ?? "Đã upload ảnh."),
        });
      } else {
        setMessage({
          tone: "error",
          text: result.message ?? "Không thể upload ảnh.",
        });
        // Trả lại ảnh cũ nếu upload lỗi.
        setPreview(defaultUrl);
      }
    });
  }

  function clearImage() {
    setPreview("");
    setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
    if (hiddenRef.current) hiddenRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="label">{label}</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Preview */}
        <div className="relative h-32 w-28 shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
          {preview ? (
            <>
              <Image
                src={preview}
                alt="Ảnh sản phẩm"
                fill
                sizes="112px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/70 text-white transition hover:bg-ink-900"
                aria-label="Xoá ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-ink-400">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px]">Chưa có ảnh</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              disabled={pending}
              className="input cursor-pointer disabled:opacity-50 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink-700 hover:file:bg-ink-200"
            />
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              {pending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải lên
                  Supabase…
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  Chọn ảnh để tự động tải lên (JPG, PNG, WEBP, AVIF · tối đa 5MB)
                </>
              )}
            </p>
          </div>

          {message && (
            <p
              className={`text-xs ${
                message.tone === "success" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-ink-400">Hoặc dán URL:</span>
            <input
              ref={hiddenRef}
              id={name}
              name={name}
              type="text"
              defaultValue={defaultUrl}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setPreview(v);
              }}
              placeholder="https://…"
              className="input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
