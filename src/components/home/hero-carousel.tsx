"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import HeroBackground from "@/components/home/hero-background";
import type { Banner } from "@/lib/types";

/** Thời gian mỗi lần chuyển banner (ms). */
const AUTOPLAY_INTERVAL = 7000;

/**
 * Ảnh nhỏ cho thumbnail.
 *
 * Ảnh nền trong `public/banners/` có bản `-thumb.webp` (128px, ~2KB) sinh
 * sẵn lúc build → phục vụ thẳng từ CDN, KHÔNG đi qua `/_next/image`
 * (4 request tới app server + resize cold start).
 *
 * Ảnh admin upload lên Supabase Storage không có bản này → dùng `next/image`
 * với `sizes="64px"` (optimizer tự sinh bản nhỏ).
 */
function isStaticBanner(url: string): boolean {
  return /^\/banners\/banner-\d+/.test(url);
}

/** URL bản thumbnail tĩnh (chỉ có với ảnh nội bộ). */
function thumbnailSrc(url: string): string {
  return url.replace(/\.webp$/, "-thumb.webp");
}

/**
 * Carousel ảnh nền hero.
 *
 * ── Tối ưu LCP ────────────────────────────────────────────────────────────
 * 1. Ảnh banner đầu tiên được render với `priority` + `fetchPriority="high"`
 *    ⇒ Next.js chèn `<link rel="preload" as="image">` ngay trong HTML, trình
 *    duyệt bắt đầu tải ảnh NGAY khi nhận HTML, không chờ JS hydrate.
 *    Đây là yếu tố quan trọng nhất cho LCP của trang chủ.
 * 2. `placeholder="blur"` + LQIP ⇒ có nội dung hiển thị ngay thay vì khung
 *    trống trong lúc ảnh tải (giảm perceived LCP).
 * 3. `sizes="100vw"` chính xác vì ảnh phủ kín toàn bộ viewport → trình duyệt
 *    không phải tải ảnh 1920px cho màn hình 375px.
 * 4. Chỉ render ảnh hiện tại + ảnh kế tiếp ⇒ không tải 5 ảnh 1920px cùng
 *    lúc (giảm tải băng thông, tranh đấu với ảnh LCP).
 * 5. Các ảnh không phải LCP dùng `loading="lazy"` mặc định.
 * 6. Section có `min-height` cố định ⇒ không CLS khi ảnh tải xong.
 *
 * Component nhận `children` là nội dung nằm trong luồng (chữ, CTA…).
 * Phần điều khiển (dots + thumbnail) được render ở cuối luồng, canh phải —
 * nhờ vậy không bao giờ đè lên nội dung hay section kế tiếp.
 */
export default function HeroCarousel({
  banners,
  children,
}: {
  banners: Banner[];
  children?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /**
   * Ảnh kế tiếp đã sẵn sàng để tải chưa.
   *
   * Ban đầu `false` → chỉ render ảnh LCP (banner đầu). Sau khi ảnh LCP
   * `onLoad` (hoặc sau khi trang đã ổn định) mới render ảnh kế tiếp.
   *
   * Lý do: ảnh kế tiếp nằm trong viewport (overlay `absolute inset-0`) nên
   * `loading="lazy"` KHÔNG ngăn trình duyệt tải nó ngay — nó sẽ tranh giành
   * băng thông với ảnh LCP và làm LCP chậm hơn.
   */
  const [nextReady, setNextReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = banners.length;
  // Chỉ 1 banner thì không cần carousel.
  const isCarousel = count > 1;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  /**
   * Chỉ render ảnh hiện tại + ảnh kế tiếp.
   *
   * Nếu render tất cả, trình duyệt sẽ tải đồng thời N ảnh nền 1920px dù
   * người dùng chỉ nhìn thấy 1 — lãng phí băng thông. Giữ ảnh kế tiếp sẵn sàng
   * giúp hiệu ứng chuyển tiếp không bị nhấp nháy (không phải tải lúc chuyển).
   *
   * ⚠️ Ảnh kế tiếp dùng `loading="lazy"` — nhưng vì nó nằm trong viewport
   * (overlay `absolute inset-0`), trình duyệt vẫn tải ngay và tranh giành
   * băng thông với ảnh LCP. Vì vậy ta CHỈ render ảnh kế tiếp sau khi ảnh
   * LCP đã tải xong (xem `nextReady` bên dưới) — đảm bảo ảnh LCP về trước.
   */
  const visibleIndexes = isCarousel
    ? Array.from(new Set([index, nextReady ? (index + 1) % count : index]))
    : [index];

  /**
   * Bật sẵn ảnh kế tiếp NGAY SAU khi ảnh LCP đã tải xong.
   *
   * - `onLoad` của ảnh LCP → ảnh đã hiển thị ⇒ có thể tải ảnh kế tiếp mà
   *   không ảnh hưởng LCP nữa.
   * - Fallback: sau 2.5s vẫn bật (phòng trường hợp ảnh LCP lỗi/không báo
   *   `onLoad`) để carousel vẫn chuyển ảnh được.
   */
  useEffect(() => {
    if (!isCarousel) return;

    const timer = window.setTimeout(() => setNextReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, [isCarousel]);

  // Tự động chuyển.
  useEffect(() => {
    if (!isCarousel || paused) return;

    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_INTERVAL);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, isCarousel, paused, count]);

  // Tạm dừng khi tab bị ẩn (tránh chạy nền vô ích).
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) setPaused(true);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Không có banner nào → vẫn giữ nền tối + nội dung, chỉ bỏ phần carousel.
  if (!count) {
    return (
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="container-page relative flex min-h-[560px] flex-col justify-center pb-12 pt-28 sm:min-h-[620px] sm:pb-14 sm:pt-32">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden bg-ink-900 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Banner trang chủ"
    >
      {/* Lớp ảnh nền — chuyển mềm bằng opacity.
          Section bắt đầu ngay từ đỉnh trang (header fixed nổi đè lên),
          nên ảnh phủ kín vùng header trong suốt.

          Mỗi banner có thể có 2 ảnh:
          - `image_url`        → ảnh ngang, dùng từ `md` trở lên.
          - `image_url_mobile` → ảnh dọc, chỉ dùng trên màn hình hẹp (<`md`).
          Nếu không có ảnh mobile thì dùng chung ảnh desktop (fallback). */}
      <div className="absolute inset-0">
        {banners.map((b, i) =>
          visibleIndexes.includes(i) ? (
            <div
              key={b.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-in-out",
                i === index ? "opacity-100" : "opacity-0",
              )}
              aria-hidden={i !== index}
            >
              {/* Ảnh dọc cho mobile — chỉ hiện dưới `md`. */}
              {b.image_url_mobile ? (
                <HeroBackground
                  banner={b}
                  priority={i === 0}
                  mobile
                  onLoad={i === 0 ? () => setNextReady(true) : undefined}
                />
              ) : null}

              {/* Ảnh ngang — ẩn dưới `md` nếu đã có ảnh mobile riêng. */}
              <HeroBackground
                banner={b}
                priority={i === 0}
                onLoad={i === 0 ? () => setNextReady(true) : undefined}
              />
            </div>
          ) : null,
        )}
      </div>

      {/* Lớp làm mờ — 2 lớp:
          1) Gradient tối từ trái sang để chữ trắng của lớp overlay (logo,
             mô tả, CTA) luôn đọc được trên mọi ảnh banner.
             Bên phải ảnh gần như không bị phủ → banner hiển thị rõ nét.
          2) Scrim tối ở đỉnh để header trong suốt (chữ/logo trắng) nổi rõ
             trên vùng đầu ảnh vốn rất sáng. */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/45 to-ink-900/10" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink-900/75 to-transparent" />

      {/* Nút điều hướng */}
      {isCarousel && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Banner trước"
            className="absolute left-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white backdrop-blur transition hover:bg-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:left-6 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Banner tiếp theo"
            className="absolute right-4 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white backdrop-blur transition hover:bg-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:right-6 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Nội dung — canh giữa theo chiều dọc để banner gọn, không kéo dài trang.
          Padding trên chừa đủ chiều cao header (80px).
          `min-height` cố định ⇒ không CLS khi ảnh nền tải xong. */}
      <div className="container-page relative flex min-h-[700px] flex-col justify-end pb-10 pt-28 sm:min-h-[620px] sm:pb-12 sm:pt-32">
        {children}

        {/* Hàng điều khiển: dấu chấm bên trái, thumbnail bên phải */}
        {isCarousel && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            {/* Dấu chấm trạng thái */}
            <div className="flex items-center gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Xem banner ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === index
                      ? "w-6 bg-white shadow-sm"
                      : "w-2 bg-white/50 hover:bg-white/80",
                  )}
                />
              ))}
            </div>

            {/* Thumbnail — góc dưới bên phải */}
            <div className="flex items-end gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Xem banner ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "relative h-10 w-14 overflow-hidden rounded-lg border-2 transition-all duration-300 sm:h-12 sm:w-16",
                    i === index
                      ? "border-white opacity-100 shadow-lg"
                      : "border-white/50 opacity-70 hover:opacity-100",
                  )}
                >
                  {/*
                    ⚡ Ảnh nội bộ → dùng bản THUMBNAIL TĨNH 128px (~2KB),
                    phục vụ thẳng từ CDN. Không đi qua `/_next/image` ⇒
                    không 4 request tới app server, không resize cold start.

                    Ảnh admin upload (Supabase Storage) → `next/image` với
                    `sizes="64px"` để optimizer sinh đúng kích thước nhỏ.

                    `fetchPriority="low"` ⇒ thumbnail nằm cuối hero, KHÔNG
                    phải LCP ⇒ không được tranh băng thông với ảnh hero.
                  */}
                  {isStaticBanner(b.image_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailSrc(b.image_url)}
                      alt=""
                      width={64}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={b.image_url}
                      alt=""
                      fill
                      sizes="64px"
                      quality={55}
                      className="object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export { AUTOPLAY_INTERVAL };
