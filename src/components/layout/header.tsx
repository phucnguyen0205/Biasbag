"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Menu, Search, ShoppingBag, ChevronDown, X } from "lucide-react";
import { NAV_LINKS, SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCartCount } from "@/hooks/use-cart-count";
import { ForbiddenBanner } from "@/components/layout/forbidden-banner";
import UserMenu from "@/components/layout/user-menu";
import { ProductsMenuWithSuspense } from "@/components/layout/products-menu";

/** Cuộn quá ngưỡng này (px) thì header chuyển từ trong suốt sang trắng đục. */
const SCROLL_THRESHOLD = 40;

/** Menu cha có danh sách con (dùng cho dropdown "Sản phẩm"). */
type MobileMenuGroup = {
  href: string;
  label: string;
  children: readonly { href: string; label: string }[];
};

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cartCount = useCartCount();

  // Kiểm tra trang chủ an toàn (kể cả khi pathname rỗng lúc mới mount hoặc có locale)
  const isHome = !pathname || pathname === "/" || pathname === "/vi";
  const transparent = isHome && !scrolled;

  /**
   * ⚡ Biến thể logo đang hiển thị.
   *
   * ── VÌ SAO CHỈ CẦN 1 FILE ẢNH ────────────────────────────────────────────
   *
   * Bản "logo trắng" trước đây là bản ĐẶT BIỆT (mọi pixel RGB → trắng).
   * Nhưng điều đó tương đương với việc áp bộ lọc CSS:
   *
   *     filter: brightness(0) invert(1)
   *
   * (nhân 0 → đen, đảo ngược → trắng; alpha giữ nguyên ⇒ kết quả y hệt bản
   * trắng gốc).
   *
   * ⇒ Chỉ cần TẢI 1 file logo. Trước đây phải tải 2 (7.4KB + 11.2KB) và
   * còn phải tiệm nạn bản còn lại ⇒ mất 11KB băng thông + 1 request.
   *
   * Bonus: đổi màu logo TỨC THÌ (CSS) — không nháy, không cần round-trip.
   */
  const logoVariant = transparent ? "white" : "dark";

useEffect(() => {
    // Ép về false ngay khi vào đầu trang chủ
    if (isHome && window.scrollY <= SCROLL_THRESHOLD) {
      setScrolled(false);
    }

    function onScroll() {
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setScrolled(scrollTop > SCROLL_THRESHOLD);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, isHome]);
  // Điều hướng sang trang khác → tính lại ngay trạng thái cuộn.
  useEffect(() => {
    setScrolled(window.scrollY > SCROLL_THRESHOLD);
  }, [pathname]);

  // Thu gọn menu mobile khi chuyển trang.
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        transparent
          ? "border-b border-transparent bg-transparent text-white"
          : "border-b border-ink-100 bg-white/95 text-ink-900 shadow-sm backdrop-blur",
      )}
    >
      <Suspense fallback={null}>
        <ForbiddenBanner />
      </Suspense>
      <div className="container-page">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Logo — bản trắng khi header trong suốt, bản tối khi nền trắng.

              CHỈ preload bản đang hiển thị: hai bản được render cùng lúc
              (bản kia opacity-0) nhưng preload cả hai sẽ tải thừa ~38KB và
              tranh đấu băng thông với ảnh hero — ảnh hero MỚI là phần tử LCP
              của trang chủ.

              `transparent` được tính ở server theo pathname + scroll nên
              giá trị lúc SSR khớp với trạng thái hiển thị ban đầu.

              ⚡ Dùng `<picture>` + `srcSet` (thay vì `next/image`):
              `next/image` không cho đặt `srcSet` tuỳ biện và với `unoptimized`
              nó KHÔNG sinh `srcset` ⇒ luôn tải bản 256px (20KB).
              Với `<picture>` + `srcSet` trình duyệt tự chọn bản 160px
              (6.3KB AVIF) cho màn hình DPR 1–1.5 ⇒ tiết kiệm ~13KB. */}
          <Link
            href="/"
            aria-label={`${SITE.name} — về trang chủ`}
            className="relative block h-16 w-26 shrink-0"
          >
            <picture>
              {/* AVIF — nhẹ hơn WebP ~47% (10.6KB vs 19.9KB ở bản 256px). */}
              <source
                type="image/avif"
                srcSet={`${SITE.logoAvifSm} 160w, ${SITE.logoAvifMd} 208w, ${SITE.logoAvif} 256w`}
                sizes="104px"
              />
              {/* WebP — fallback cho trình duyệt không hỗ trợ AVIF. */}
              <source
                type="image/webp"
                srcSet={`${SITE.logoSm} 160w, ${SITE.logoMd} 208w, ${SITE.logo} 256w`}
                sizes="104px"
              />
              {/* Fallback cuối cùng cho trình duyệt rất cũ. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={SITE.logo}
                alt={SITE.name}
                width={104}
                height={65}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className={cn(
                  "absolute inset-0 h-full w-full object-contain",
                  /**
                   * ⚡ Bản TRẮNG bằng CSS filter, không cần file riêng:
                   *   brightness(0) → mọi pixel thành đen
                   *   invert(1)     → đen thành trắng
                   * Alpha giữ nguyên ⇒ kết quả y hệt bản logo trắng gốc.
                   *
                   * Nhờ vậy trang chỉ tải MỘT file logo (tiết kiệm 11KB +
                   * 1 request) và đổi màu tức thì khi cuộn (không nháy).
                   */
                  logoVariant === "white" && "brightness-0 invert",
                )}
              />
            </picture>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden items-center gap-0.5 xl:flex">
            {NAV_LINKS.map((link) =>
              "children" in link && link.children ? (
                <ProductsMenuWithSuspense key={link.href} link={link} transparent={transparent} />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  /**
                   * ⚡ Tắt prefetch cho link menu.
                   *
                   * Next.js mặc định prefetch RSC payload của mọi link khi
                   * link vào viewport ⇒ header có 5 link ⇒ 5 request `_rsc`
                   * ngay khi trang vừa tải (tốn ~12KB, cạnh tranh băng thông
                   * với ảnh LCP).
                   *
                   * Người dùng hiếm khi bấm menu ngay lúc mở trang; khi bấm
                   * thì Next.js vẫn điều hướng nhanh (chỉ mất thêm một
                   * round-trip RSC nhỏ).
                   */
                  prefetch={false}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    pathname === link.href
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
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className={cn(
                "btn-ghost h-11 w-11 px-0",
                transparent
                  ? "text-white hover:bg-white/15 hover:text-white"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
              aria-label="Tìm kiếm"
            >
              <Search className="h-[22px] w-[22px]" />
            </button>

            <Link
              href="/cart"
              prefetch={false}
              className={cn(
                "btn-ghost relative h-11 w-11 px-0",
                transparent
                  ? "text-white hover:bg-white/15 hover:text-white"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
              aria-label={`Giỏ hàng (${cartCount})`}
            >
              <ShoppingBag className="h-[22px] w-[22px]" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blush-600 px-1 text-[11px] font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            <UserMenu transparent={transparent} />

            <button
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "btn-ghost h-11 w-11 px-0 xl:hidden",
                transparent
                  ? "text-white hover:bg-white/15 hover:text-white"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
              aria-label="Menu"
            >
              {open ? (
                <X className="h-[22px] w-[22px]" />
              ) : (
                <Menu className="h-[22px] w-[22px]" />
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <form action="/products" className="pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                name="q"
                autoFocus
                placeholder="Tìm túi tote K-Pop, in hình idol, logo…"
                className="input pl-10"
              />
            </div>
          </form>
        )}
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="border-t border-ink-100 bg-white xl:hidden">
          <nav className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) =>
              "children" in link && link.children ? (
                <MobileProductsMenu key={link.href} link={link} />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  {link.label}
                </Link>
              ),
            )}
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Tài khoản
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * Phiên bản accordion của menu "Sản phẩm" cho mobile.
 *
 * Trên màn hình nhỏ không có con trỏ để hover ⇒ dùng bấm để mở/đóng,
 * hiển thị dạng danh sách lồng nhau.
 *
 * Chữ "Sản phẩm" là LINK vào thẳng `/products`; chevron bên cạnh mở/đóng
 * danh sách các dòng sản phẩm.
 */
function MobileProductsMenu({ link }: { link: MobileMenuGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={link.href}
          onClick={() => setExpanded(false)}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
        >
          {link.label}
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`Xem các dòng ${link.label.toLowerCase()}`}
          className="rounded-lg p-2 text-ink-600 hover:bg-ink-50"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink-400 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {expanded && (
        <ul className="mb-1 ml-3 space-y-0.5 border-l border-ink-100 pl-3">
          {link.children.map((child) => (
            <li key={child.href}>
              <Link
                href={child.href}
                className="block rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
