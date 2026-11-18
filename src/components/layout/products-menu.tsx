"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuLink = { href: string; label: string };
type MenuGroup = {
  href: string;
  label: string;
  children: readonly MenuLink[];
};

/**
 * Menu "Sản phẩm" ở header.
 *
 * Cấu trúc: chữ "Sản phẩm" là LINK vào thẳng trang `/products`; phần chevron
 * bên cạnh (hoặc hover chuột trên desktop) mở dropdown liệt kê các dòng
 * sản phẩm.
 *
 * Hành vi:
 *   - Click chữ "Sản phẩm" → điều hướng thẳng tới `/products`.
 *   - Click chevron (hoặc hover chuột) → mở/đóng dropdown danh mục.
 *   - Đóng khi click ra ngoài, khi bấm `Escape`, hoặc khi chuyển trang.
 *   - Có `aria-expanded` / `aria-haspopup` để hỗ trợ trình đọc màn hình.
 *   - Hover chỉ bật khi thiết bị thật sự có con trỏ (`hover:hover`) — tránh
 *     menu tự mở khi người dùng chạm vào màn hình cảm ứng.
 */
export default function ProductsMenu({
  link,
    transparent,
}: {
  link: MenuGroup;
  transparent: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /**
   * Danh mục đang chọn.
   *
   * Đọc bằng `useSearchParams` BÊN TRONG một Suspense boundary (xem
   * `ProductsMenuWithParams` bên dưới). Header nằm ở root layout nên
   * nếu gọi `useSearchParams()` trực tiếp ở đây, mọi route sẽ bị buộc
   * render động (CSR bailout) → build prerender `/products` thất bại.
   */
  const activeCategory = useActiveCategory();

  // Đang ở trang sản phẩm (kể cả khi lọc theo danh mục) → highlight tab cha.
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

  // Click ra ngoài → đóng menu.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Chuyển trang → đóng menu.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const tabClass = cn(
    "rounded-full px-3 py-2 text-sm font-medium transition-colors",
    active
      ? cn(
          transparent
            ? "bg-white/20 text-white"
            : "bg-blush-50 text-blush-700",
        )
      : cn(
          transparent
            ? "text-white/85 hover:bg-white/15 hover:text-white"
            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
        ),
  );

  return (
    <div
      ref={ref}
      className="group relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center">
        {/* Chữ "Sản phẩm" → vào thẳng trang sản phẩm */}
        <Link href={link.href} prefetch={false} className={tabClass}>
          {link.label}
        </Link>

        {/* Chevron → mở/đóng dropdown danh mục */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`Xem các dòng ${link.label.toLowerCase()}`}
          className={cn(
            "flex items-center rounded-full p-2 transition-colors",
            active
              ? cn(
                  transparent
                    ? "bg-white/20 text-white"
                    : "bg-blush-50 text-blush-700",
                )
              : cn(
                  transparent
                    ? "text-white/85 hover:bg-white/15 hover:text-white"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                ),
          )}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Bảng dropdown */}
      <div
        className={cn(
          "absolute left-0 top-full z-50 w-64 origin-top-left pt-2 transition-all duration-200",
          "invisible translate-y-1 opacity-0",
          "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
          open && "visible translate-y-0 opacity-100",
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white p-2 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)]">
          {/* Danh sách các dòng sản phẩm */}
          <ul className="space-y-0.5">
            {link.children.map((child) => {
              const childCategory = child.href.split("category=")[1];
              const isCurrent = activeCategory === childCategory;
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    prefetch={false}
                    className={cn(
                      "block rounded-lg px-3.5 py-2.5 text-sm transition-colors",
                      isCurrent
                        ? "bg-blush-50 font-medium text-blush-700"
                        : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
                    )}
                  >
                    {child.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Đọc `?category=` hiện tại.
 *
 * Tách riêng thành component con bọc trong `<Suspense>` để `useSearchParams`
 * không lan sang toàn bộ cây component của header. Nhờ vậy các route tĩnh
 * (trang chủ, about, blog…) vẫn prerender được bình thường.
 */
function useActiveCategory(): string | null {
  const searchParams = useSearchParams();
  return searchParams.get("category");
}

/** Bọc Suspense cho phần dùng `useSearchParams`. */
export function ProductsMenuWithSuspense(props: {
  link: MenuGroup;
  transparent: boolean;
}) {
  return (
    <Suspense fallback={<ProductsMenuFallback label={props.link.label} />}>
      <ProductsMenu {...props} />
    </Suspense>
  );
}

/** Bản tạm khi đang chờ đọc search params (tránh nhấp nháy layout). */
function ProductsMenuFallback({ label }: { label: string }) {
  return (
    <span className="rounded-full px-3 py-2 text-sm font-medium text-ink-600">
      {label}
    </span>
  );
}