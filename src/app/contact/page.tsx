import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { SITE } from "@/lib/constants";
import ContactForm from "@/components/contact/contact-form";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = buildPageMetadata("contact");

const CHANNELS = [
  {
    name: "Hotline",
    value: SITE.phone,
    href: `tel:${SITE.phone.replace(/\s/g, "")}`,
    icon: Phone,
    desc: "Tư vấn nhanh trong giờ làm việc.",
  },
  {
    name: "Email",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    icon: Mail,
    desc: "Phản hồi trong vòng 24 giờ.",
  },
  {
    name: "Shopee",
    value: SITE.social.shopee.replace(/^https?:\/\//, ""),
    href: SITE.social.shopee,
    icon: ShoppingBag,
    desc: "Kênh bán lẻ chính, cập nhật mẫu mã hằng tuần.",
  },
  {
    name: "Facebook",
    value: "facebook.com/biasbag.dn",
    href: SITE.social.facebook,
    icon: MessageCircle,
    desc: "Nhắn tin Messenger mọi lúc.",
  },
] as const;

export default function ContactPage() {
  // JSON-LD: ContactPage + Organization (địa chỉ/điện thoại → hiển thị local pack)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": `${SITE_URL}/contact#webpage`,
        url: `${SITE_URL}/contact`,
        name: "Thông tin liên hệ BIAS BAG",
        description:
          "Liên hệ BIAS BAG để được tư vấn mẫu túi vải canvas, báo giá in hình theo yêu cầu và hỗ trợ đơn hàng nhanh chóng.",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE.name,
        url: SITE_URL,
        logo: `${SITE_URL}${SITE.logoOg}`,
        email: SITE.email,
        telephone: SITE.phone,
        address: {
          "@type": "PostalAddress",
          streetAddress: SITE.address,
          addressCountry: "VN",
        },
        contactPoint: {
          "@type": "ContactPoint",
          telephone: SITE.phone,
          contactType: "customer service",
          areaServed: "VN",
          availableLanguage: ["Vietnamese"],
        },
      },
      breadcrumbJsonLd([
        { name: "Trang chủ", url: SITE_URL },
        { name: "Liên hệ", url: `${SITE_URL}/contact` },
      ]),
    ],
  };

  return (
    <div className="container-page py-12">
      <JsonLd data={jsonLd} />
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Về trang chủ
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <p className="eyebrow">Liên hệ</p>
          <h1 className="section-title mt-2">Chúng tôi luôn sẵn sàng hỗ trợ</h1>
          <p className="mt-3 max-w-lg text-ink-600">
            Bạn cần tư vấn mẫu túi phù hợp, tra cứu đơn hàng hay muốn hợp tác
            bán hàng? Chọn cách liên hệ thuận tiện nhất — BIAS BAG phản hồi nhanh
            nhất qua Messenger và hotline.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CHANNELS.map((c) => (
              <a
                key={c.name}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="card group flex items-start gap-4 p-5 transition hover:border-blush-400"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush-50 text-blush-600 transition group-hover:bg-blush-600 group-hover:text-white">
                  <c.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-ink-500">
                    {c.name}
                  </span>
                  <span className="mt-0.5 block font-semibold text-ink-900">
                    {c.value}
                  </span>
                  <span className="mt-1 block text-xs text-ink-500">{c.desc}</span>
                </span>
              </a>
            ))}
          </div>

          <div className="card mt-6 space-y-3 p-5 text-sm text-ink-600">
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blush-600" />
              {SITE.address}
            </p>
            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blush-600" />
              {SITE.workingHours}
            </p>
          </div>
        </div>

        <div>
          <p className="eyebrow">Gửi tin nhắn</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-ink-900">
            Để lại thông tin, chúng tôi sẽ gọi lại
          </h2>
          <div className="mt-5">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
