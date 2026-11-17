"use client";

import Image from "next/image";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Thư viện banner gốc đã tối ưu sẵn trong `public/banners/`.
 *
 * Giúp admin chọn nhanh banner mặc định thay vì phải tự tìm ảnh. Ảnh đã
 * được resize + nén WebP nên rất nhẹ (~40–60KB mỗi ảnh).
 */
const LIBRARY = [
  { src: "/banners/banner-1.webp", label: "Banner 1" },
  { src: "/banners/banner-2.webp", label: "Banner 2" },
  { src: "/banners/banner-3.webp", label: "Banner 3" },
  { src: "/banners/banner-4.webp", label: "Banner 4" },
];

export default function BannerLibrary({
  onSelect,
  current,
}: {
  /** Khi admin bấm 1 ảnh, callback nhận URL của ảnh đó. */
  onSelect?: (url: string) => void;
  /** URL đang được chọn — dùng để đánh dấu. */
  current?: string;
}) {
  const [selected, setSelected] = useState(current ?? "");

  function handleClick(src: string) {
    setSelected(src);
    onSelect?.(src);
  }

  return (
    <div>
      <p className="label">Thư viện banner có sẵn</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LIBRARY.map((item) => {
          const isSelected = selected === item.src;
          return (
            <button
              key={item.src}
              type="button"
              onClick={() => handleClick(item.src)}
              aria-pressed={isSelected}
              className={cn(
                "group relative aspect-[16/9] overflow-hidden rounded-lg border-2 transition",
                isSelected
                  ? "border-blush-500 ring-2 ring-blush-200"
                  : "border-ink-200 hover:border-blush-300",
              )}
            >
              <Image
                src={item.src}
                alt={item.label}
                fill
                sizes="(max-width: 640px) 45vw, 200px"
                className="object-cover"
                unoptimized
              />
              {isSelected && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blush-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-ink-900/60 py-1 text-center text-[10px] font-medium text-white">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-400">
        Bấm vào ảnh để dùng làm banner. Ảnh đã được tối ưu sẵn nên tải rất nhanh.
      </p>
    </div>
  );
}
