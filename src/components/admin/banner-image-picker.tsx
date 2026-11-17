"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { uploadImageAction } from "@/app/admin/upload-actions";
import { cn } from "@/lib/utils";

/**
 * Chọn + upload ảnh banner lên Supabase Storage.
 * Không dùng thẻ `<form>` con để tránh lồng form với form cha.
 */
export default function BannerImagePicker({
  name = "imageUrl",
  defaultUrl = "",
  value,
  onChange,
}: {
  name?: string;
  defaultUrl?: string;
  /** Giá trị điều khiển từ bên ngoài (dùng khi chọn từ thư viện ảnh). */
  value?: string;
  onChange?: (url: string) => void;
}) {
  const [preview, setPreview] = useState(defaultUrl);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<string | null>(null);

  // Đồng bộ khi giá trị bên ngoài thay đổi (ví dụ admin chọn ảnh trong thư viện).
  useEffect(() => {
    if (value != null && value !== "") {
      setPreview(value);
      if (hiddenRef.current) hiddenRef.current.value = value;
    }
  }, [value]);

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

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "banners");

    startTransition(async () => {
      const result = await uploadImageAction(formData);
      if (result.status === "success" && result.url) {
        setPreview(result.url);
        if (hiddenRef.current) hiddenRef.current.value = result.url;
        setMessage({ tone: "success", text: "Đã tải ảnh lên." });
      } else {
        setMessage({
          tone: "error",
          text: result.message ?? "Không thể tải ảnh lên.",
        });
        setPreview(defaultUrl);
      }
    });
  }

  function clear() {
    setPreview("");
    setMessage(null);
    if (fileRef.current) fileRef.current.value = "";
    if (hiddenRef.current) hiddenRef.current.value = "";
    onChange?.("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-ink-50 sm:w-48">
          {preview ? (
            <>
              <Image
                src={preview}
                alt="Xem trước banner"
                fill
                sizes="192px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={clear}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/70 text-white transition hover:bg-ink-900"
                aria-label="Xoá ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-ink-400">
              Chưa có ảnh
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleFileChange}
            disabled={pending}
            className="input w-full cursor-pointer disabled:opacity-50 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-xs file:font-medium file:text-ink-700 hover:file:bg-ink-200"
          />
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              pending ? "text-ink-500" : "text-ink-400",
            )}
          >
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải lên…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Nên dùng ảnh nền ngang, rõ nét, kích thước tối thiểu 1920px
              </>
            )}
          </p>

          {message && (
            <p
              className={`text-xs ${
                message.tone === "success"
                  ? "text-emerald-600"
                  : "text-rose-600"
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
                onChange?.(v);
              }}
              placeholder="/banners/banner-1.webp hoặc https://…"
              className="input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
