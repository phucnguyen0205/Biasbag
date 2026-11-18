import Link from "next/link";
import { Clock, Mail, MapPin, Phone, ShoppingBag } from "lucide-react";
import { CATEGORY_LINKS, SITE } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-100 bg-ink-900 text-ink-200 [content-visibility:auto] [contain-intrinsic-size:auto_400px]">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link
            href="/"
            prefetch={false}
            aria-label={`${SITE.name} — về trang chủ`}
            className="inline-block"
          >
            {/* Footer hiển thị logo ở 128px (w-32) ⇒ dùng bản 160px
                (tiết kiệm ~5KB so với bản 256px).

                ⚡ Dùng AVIF (4.3KB) thay vì WebP (6.5KB) — nhẹ hơn 34%.
                Footer nằm dưới fold nên chỉ tối ưu byte, không ảnh hưởng LCP. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SITE.logoWhiteAvifSm}
              alt={SITE.name}
              width={160}
              height={101}
              loading="lazy"
              decoding="async"
              className="h-auto w-32 transition hover:opacity-80"
            />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-300">
            {SITE.description}
          </p>
          <p className="mt-4 font-display text-sm italic text-blush-300">
            “{SITE.slogan}”
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Dòng sản phẩm</h3>
          <ul className="mt-3 space-y-2">
            {CATEGORY_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  prefetch={false}
                  className="text-sm text-ink-300 transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Hỗ trợ</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-300">
            <li>
              <Link href="/orders" prefetch={false} className="hover:text-white">
                Tra cứu đơn hàng
              </Link>
            </li>
            <li>
              <Link href="/about" prefetch={false} className="hover:text-white">
                Về chúng tôi
              </Link>
            </li>
            <li>
              <Link href="/policies" prefetch={false} className="hover:text-white">
                Chính sách đổi trả
              </Link>
            </li>
            <li>
              <Link
                href="/policies#van-chuyen"
                prefetch={false}
                className="hover:text-white"
              >
                Hướng dẫn vận chuyển
              </Link>
            </li>
            <li>
              <Link href="/contact" prefetch={false} className="hover:text-white">
                Liên hệ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Liên hệ</h3>
          <ul className="mt-3 space-y-3 text-sm text-ink-300">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blush-400" />
              <span>{SITE.address}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blush-400" />
              <a href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blush-400" />
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </li>
            <li className="flex gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blush-400" />
              <span>{SITE.workingHours}</span>
            </li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["Shopee", SITE.social.shopee],
              ["Facebook", SITE.social.facebook],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-ink-200 transition hover:border-blush-400 hover:text-white"
              >
                <ShoppingBag className="h-3 w-3" />
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Bảo lưu mọi quyền.
          </p>
          <p>Đồng hành cùng phong cách của bạn</p>
        </div>
      </div>
    </footer>
  );
}
