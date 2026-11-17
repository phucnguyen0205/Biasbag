import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  MessageCircle,
  Package,
  ShoppingBag,
  Target,
} from "lucide-react";
import { CORE_VALUES, SITE, STYLE_LINES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Về BIAS BAG",
  description:
    "BIAS BAG — thương hiệu túi xách thời trang cho giới trẻ Việt Nam. Tầm nhìn, sứ mệnh và giá trị cốt lõi.",
};

/**
 * Ảnh minh hoạ cho từng khối nội dung.
 *
 * Mỗi ảnh đều có `sizes` khai báo đúng tỉ lệ hiển thị ⇒ trình duyệt tải
 * đúng bản cần thiết, không tải ảnh 1920px cho ô 400px (giữ nhẹ trang).
 */
const GALLERY = [
  {
    img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=700",
    label: "Túi Tote K-Pop",
  },
  {
    img: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=700",
    label: "Túi Tote Logo",
  },
  {
    img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=700",
    label: "Túi Tote Địa Điểm",
  },
  {
    img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700",
    label: "Túi Tote Tối Giản",
  },
] as const;

const CHANNELS = [
  {
    name: "Shopee",
    desc: "Kênh bán lẻ chính với cập nhật mẫu mã hằng tuần.",
    href: SITE.social.shopee,
  },
  {
    name: "Facebook",
    desc: "Kênh tư vấn nhanh qua Messenger và livestream.",
    href: SITE.social.facebook,
  },
  {
    name: "Website chính thức",
    desc: "Cửa hàng trực tuyến với đầy đủ thông tin và chính sách.",
    href: "/",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────────
          Lặp lại đúng cấu trúc chữ của banner trang chủ:
          badge → wordmark viết tay → tagline in hoa → mô tả → CTA.
          Nhờ vậy người dùng chuyển từ `/` sang `/about` gặp cùng một
          "giọng" thương hiệu, không bị đột ngột về kiểu trang tĩnh. */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="absolute inset-0 opacity-30">
          {/* Ảnh nền trang trí nằm dưới overlay tối 30% → không bao giờ là LCP.
              Không đặt `priority` để không tranh băng thông với logo & heading. */}
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600"
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/85 to-ink-900/40" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink-900/75 to-transparent" />

        <div className="container-page relative py-20 sm:py-28">
          {/* Wordmark viết tay — cùng font với logo & banner */}
          <h1 className="anim-rise font-script text-5xl font-normal leading-none tracking-wide text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.75)] sm:text-7xl">
            Bias Bag
          </h1>

          {/* Tagline in hoa — đúng màu & cỡ chữ như banner */}
          <p className="anim-rise anim-rise-2 mt-4 font-sans text-[11px] font-semibold uppercase leading-snug tracking-[0.22em] text-blush-400 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-sm">
            Phụ kiện nhỏ, phong cách riêng
          </p>

          <p className="anim-rise anim-rise-3 mt-5 max-w-2xl text-base leading-relaxed text-ink-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] sm:text-lg">
            BIAS BAG hoạt động trong lĩnh vực kinh doanh và phân phối túi xách
            thời trang, chuyên cung cấp các sản phẩm túi xách với mẫu mã đa
            dạng, thiết kế hiện đại và phù hợp với xu hướng thời trang của giới
            trẻ.
          </p>

          <div className="anim-rise anim-rise-4 mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="btn bg-white px-6 py-3 text-ink-900 hover:bg-blush-50"
            >
              Khám phá sản phẩm
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="btn border border-white/30 px-6 py-3 text-white hover:bg-white/10"
            >
              Liên hệ
            </Link>
          </div>

          <div className="anim-rise anim-rise-5 mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink-200">
            <span>Bán lẻ trực tuyến</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:inline-block" />
            <span>Đổi mẫu hằng tuần</span>
            <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:inline-block" />
            <span>Giao toàn quốc</span>
          </div>
        </div>
      </section>

      {/* ── Lĩnh vực hoạt động ───────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="reveal">
            <p className="eyebrow">Lĩnh vực hoạt động</p>
            <h2 className="section-title mt-3">
              Một chiếc túi, nhiều cách thể hiện cá tính
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-600">
              <p>
                Các sản phẩm được lựa chọn chú trọng đến kiểu dáng, chất liệu, màu
                sắc và tính tiện dụng — nhằm mang đến cho khách hàng những chiếc
                túi không chỉ đáp ứng nhu cầu sử dụng hằng ngày mà còn là phụ kiện
                giúp thể hiện phong cách và cá tính riêng.
              </p>
              <p>
                Doanh nghiệp tập trung phát triển các dòng túi xách theo nhiều
                phong cách khác nhau như tối giản, thanh lịch, trẻ trung và năng
                động, phù hợp với nhiều đối tượng khách hàng, đặc biệt là học
                sinh, sinh viên và người trẻ.
              </p>
              <p>
                BIAS BAG hướng đến việc cung cấp những sản phẩm có tính thẩm mỹ
                cao, dễ phối hợp với nhiều trang phục và có mức giá phù hợp với
                khả năng chi tiêu của khách hàng.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-accent px-6 py-3">
                Xem dòng sản phẩm <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="btn-secondary px-6 py-3">
                Tư vấn nhanh
              </Link>
            </div>
          </div>

          {/* Lưới ảnh — mỗi ảnh xuất hiện riêng khi cuộn tới */}
          <div className="grid grid-cols-2 gap-4">
            {GALLERY.map((c, i) => (
              <div
                key={c.label}
                className="reveal-scale group relative aspect-square overflow-hidden rounded-2xl bg-blush-50"
                style={{ animationRange: `entry 0% entry ${35 + i * 8}%` }}
              >
                <Image
                  src={c.img}
                  alt={c.label}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <span className="absolute bottom-3 left-3 badge bg-white/90 text-ink-900 backdrop-blur">
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dòng sản phẩm ───────────────────────────────────────────────── */}
      <section className="border-y border-ink-100 bg-blush-50/60 py-20 sm:py-24">
        <div className="container-page">
          <div className="reveal mb-10 max-w-2xl">
            <p className="eyebrow">Dòng sản phẩm</p>
            <h2 className="section-title mt-3">Năm chủ đề in</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              BIAS BAG phát triển các dòng túi tote canvas in hình theo nhiều chủ
              đề khác nhau, phù hợp với nhiều đối tượng khách hàng — đặc biệt là
              học sinh, sinh viên và người trẻ.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {STYLE_LINES.map((line, i) => (
              <Link
                key={line.slug}
                href={`/products?category=${line.slug}`}
                className="reveal group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]"
                style={{ animationRange: `entry 0% entry ${30 + i * 6}%` }}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-blush-50">
                  <Image
                    src={GALLERY[i % GALLERY.length].img}
                    alt={line.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 badge bg-white/90 text-ink-800 backdrop-blur">
                    0{i + 1}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-semibold text-ink-900">
                    {line.name}
                  </h3>
                  <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-blush-600">
                    {line.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">
                    {line.desc}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-ink-900">
                    Xem sản phẩm
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tầm nhìn & Sứ mệnh ───────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-24">
        <div className="reveal mb-10 max-w-2xl">
          <p className="eyebrow">Định hướng</p>
          <h2 className="section-title mt-3">Tầm nhìn & Sứ mệnh</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className="reveal group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-8"
            style={{ animationRange: "entry 0% entry 35%" }}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blush-100/60 blur-2xl transition-transform duration-700 group-hover:scale-125" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-blush-100 text-blush-600">
              <Eye className="h-5 w-5" />
            </span>
            <h2 className="relative mt-5 font-display text-2xl font-semibold text-ink-900">
              Tầm nhìn
            </h2>
            <p className="relative mt-4 text-sm leading-relaxed text-ink-600">
              Trở thành thương hiệu túi xách thời trang được yêu thích và tin
              tưởng bởi giới trẻ Việt Nam, mang đến những sản phẩm có thiết kế
              hiện đại, đa dạng và phù hợp với xu hướng thời trang. BIAS BAG hướng
              tới việc xây dựng hình ảnh thương hiệu chuyên nghiệp trên các nền
              tảng thương mại điện tử, từng bước mở rộng quy mô kinh doanh và
              khẳng định dấu ấn riêng trong lĩnh vực phụ kiện thời trang.
            </p>
          </div>

          <div
            className="reveal group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-8"
            style={{ animationRange: "entry 0% entry 35%" }}
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blush-100/60 blur-2xl transition-transform duration-700 group-hover:scale-125" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-blush-100 text-blush-600">
              <Target className="h-5 w-5" />
            </span>
            <h2 className="relative mt-5 font-display text-2xl font-semibold text-ink-900">
              Sứ mệnh
            </h2>
            <p className="relative mt-4 text-sm leading-relaxed text-ink-600">
              Sứ mệnh của BIAS BAG là mang đến những sản phẩm túi xách thời
              trang kết hợp giữa tính thẩm mỹ, sự tiện dụng và mức giá hợp lý.
              Chúng tôi không chỉ cung cấp một phụ kiện phục vụ nhu cầu sử dụng
              hằng ngày mà còn mong muốn giúp mỗi khách hàng thể hiện phong cách,
              cá tính và sự tự tin thông qua từng lựa chọn sản phẩm.
            </p>
          </div>
        </div>
      </section>

      {/* ── Giá trị cốt lõi ──────────────────────────────────────────────── */}
      <section className="border-t border-ink-100 bg-blush-50/60 py-20 sm:py-24">
        <div className="container-page">
          <div className="reveal mb-10 max-w-2xl">
            <p className="eyebrow">Giá trị cốt lõi</p>
            <h2 className="section-title mt-3">
              Năm nguyên tắc chúng tôi theo đuổi
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CORE_VALUES.map((v, i) => (
              <div
                key={v.title}
                className="reveal group rounded-2xl border border-ink-100 bg-white p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]"
                style={{ animationRange: `entry 0% entry ${30 + i * 5}%` }}
              >
                <span className="font-display text-2xl font-bold text-blush-400">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink-900">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hình thức kinh doanh ─────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="reveal">
            <p className="eyebrow">Hình thức kinh doanh</p>
            <h2 className="section-title mt-3">Bán lẻ trực tuyến</h2>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-600">
              <p>
                BIAS BAG là thương hiệu chuyên kinh doanh các sản phẩm túi xách
                thời trang theo hình thức bán lẻ trực tuyến. Doanh nghiệp tập
                trung phân phối sản phẩm thông qua các nền tảng thương mại điện
                tử và mạng xã hội như Shopee, Facebook và website chính thức.
              </p>
              <p>
                Bên cạnh các mẫu túi có sẵn, BIAS BAG hướng đến việc thường xuyên
                cập nhật mẫu mã, màu sắc và kiểu dáng mới nhằm đáp ứng nhu cầu mua
                sắm cũng như thị hiếu thời trang của khách hàng.
              </p>
              <p>
                Hình thức kinh doanh trực tuyến giúp doanh nghiệp tiếp cận khách
                hàng trên phạm vi rộng, tiết kiệm chi phí mặt bằng, tối ưu hoạt
                động bán hàng và nâng cao khả năng cạnh tranh trên thị trường thương
                mại điện tử. Đồng thời, thông qua các nền tảng trực tuyến, BIAS
                BAG có thể tư vấn, hỗ trợ và chăm sóc khách hàng thuận tiện hơn.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={SITE.social.shopee}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-accent px-6 py-3"
              >
                Mua trên Shopee
              </a>
              <a
                href={SITE.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-6 py-3"
              >
                Nhắn Facebook
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CHANNELS.map((c, i) => (
              <a
                key={c.name}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="reveal group rounded-2xl border border-ink-100 bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-blush-200 hover:shadow-[0_18px_40px_-24px_rgba(143,74,57,0.45)]"
                style={{ animationRange: `entry 0% entry ${30 + i * 6}%` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blush-100 text-blush-600 transition-colors group-hover:bg-blush-200">
                      {c.name === "Facebook" ? (
                        <MessageCircle className="h-4 w-4" />
                      ) : c.name === "Website chính thức" ? (
                        <Package className="h-4 w-4" />
                      ) : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                    </span>
                    <h3 className="text-sm font-semibold text-ink-900">
                      {c.name}
                    </h3>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-1 group-hover:text-blush-600" />
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-ink-600">
                  {c.desc}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="container-page pb-20 sm:pb-24">
        <div className="reveal flex flex-col items-start gap-6 rounded-3xl border border-blush-200 bg-gradient-to-br from-blush-50 via-white to-blush-100 p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Sẵn sàng phối đồ cùng BIAS BAG?</h2>
            <p className="mt-2 max-w-lg text-sm text-ink-600">
              Khám phá các dòng túi xách đang được giới trẻ quan tâm nhất tháng
              này.
            </p>
          </div>
          <Link href="/products" className="btn-primary px-6 py-3">
            Mua sắm ngay <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}