import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Banknote, MessageCircle, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, SITE } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Chính sách & Hỗ trợ",
  description:
    "Chính sách đổi trả, bảo hành, vận chuyển và các thông tin hỗ trợ của BIAS BAG.",
};

const POLICIES = [
  {
    icon: Truck,
    title: "Vận chuyển",
    blocks: [
      {
        h: "Thời gian giao hàng",
        p: `Đơn nội thành Đà Nẵng giao trong 1–2 ngày làm việc. Đơn tỉnh thành khác giao trong 3–5 ngày làm việc. Đơn xuất khẩu vui lòng liên hệ hotline ${SITE.phone}.`,
      },
      {
        h: "Phí giao hàng",
        p: `Đơn từ ${formatPrice(FREE_SHIPPING_THRESHOLD)} trở lên được miễn phí vận chuyển. Dưới mức này phí cố định ${formatPrice(SHIPPING_FEE)}/đơn.`,
      },
      {
        h: "Đơn hàng số lượng lớn",
        p: "Áp dụng phí giao hàng theo bảng giá của đơn vị vận chuyển, BIAS BAG hỗ trợ giảm trừ một phần.",
      },
    ],
  },
  {
    icon: RotateCcw,
    title: "Đổi trả sản phẩm",
    blocks: [
      {
        h: "Thời hạn đổi trả",
        p: "Sản phẩm được đổi trả trong vòng 7 ngày kể từ ngày nhận hàng, với điều kiện còn nguyên tem mác và chưa qua sử dụng.",
      },
      {
        h: "Sản phẩm không được đổi trả",
        p: "Sản phẩm đã sử dụng, có vết ẩm, vết bẩn, vết xước hoặc thiếu phụ kiện đi kèm sẽ không được chấp nhận đổi trả.",
      },
      {
        h: "Quy trình đổi trả",
        p: "Liên hệ hotline hoặc fanpage để được hướng dẫn. Phí vận chuyển chiều đi do khách hàng chịu, trừ khi BIAS BAG gửi nhầm hoặc lỗi sản xuất.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Bảo hành & uy tín",
    blocks: [
      {
        h: "Bảo hành",
        p: "Túi được bảo hành 6 tháng về đường chỉ, móc khóa và lót trong. Lỗi sản xuất trong thời gian bảo hành sẽ được sửa hoặc đổi mới.",
      },
      {
        h: "Thông tin minh bạch",
        p: "Hình ảnh, chất liệu và kích thước trên website được mô tả trung thực. Màu sắc thực tế có thể chênh nhẹ do ánh sáng khi chụp.",
      },
      {
        h: "Cập nhật mẫu mã",
        p: "BIAS BAG thường xuyên cập nhật mẫu mã, màu sắc và kiểu dáng mới theo xu hướng thời trang của giới trẻ.",
      },
    ],
  },
  {
    icon: Banknote,
    title: "Thanh toán",
    blocks: [
      {
        h: "Thanh toán khi nhận hàng (COD)",
        p: "Bạn thanh toán tiền mặt cho shipper khi nhận đơn. Vui lòng chuẩn bị đúng số tiền trong đơn để giao dịch nhanh chóng.",
      },
      {
        h: "Chuyển khoản ngân hàng",
        p: `Chuyển khoản trực tiếp qua mã QR VietQR. Vui lòng ghi nội dung chuyển khoản là MÃ ĐƠN HÀNG để chúng tôi đối soát nhanh nhất.`,
      },
      {
        h: "Ví MoMo / ZaloPay",
        p: "Thanh toán bằng ví điện tử MoMo hoặc ZaloPay — nhanh chóng và tiện lợi trên điện thoại.",
      },
      {
        h: "Xác nhận đơn hàng",
        p: "Sau khi đặt hàng, BIAS BAG sẽ liên hệ qua điện thoại hoặc email để xác nhận. Đơn chuyển khoản / ví điện tử được xác nhận sau khi nhận được tiền.",
      },
      {
        h: "Tra cứu đơn hàng",
        p: "Mỗi đơn hàng đều có mã đơn riêng (ví dụ BB-241117-000123). Bạn có thể tra cứu trạng thái bất cứ lúc nào bằng mã đơn và email đã dùng khi đặt.",
      },
    ],
  },
] as const;

export default function PoliciesPage() {
  return (
    <div className="container-page py-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Về trang chủ
      </Link>

      <p className="eyebrow">Hỗ trợ khách hàng</p>
      <h1 className="section-title mt-2">Chính sách &amp; Hỗ trợ</h1>
      <p className="mt-3 max-w-2xl text-ink-600">
        BIAS BAG cam kết minh bạch trong mọi thông tin, chính sách đổi trả và
        hỗ trợ sau bán để bạn yên tâm mua sắm.
      </p>

      <div className="mt-10 space-y-10">
        {POLICIES.map((section) => (
          <section key={section.title}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blush-50 text-blush-600">
                <section.icon className="h-5 w-5" />
              </span>
              <h2 className="font-display text-xl font-semibold text-ink-900">
                {section.title}
              </h2>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.blocks.map((b) => (
                <div key={b.h} className="card p-5">
                  <h3 className="text-sm font-semibold text-ink-900">{b.h}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {b.p}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="card mt-12 flex flex-col items-start gap-4 bg-ink-900 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Cần hỗ trợ thêm?
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            Hotline {SITE.phone} · {SITE.workingHours}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="btn-accent">
            Gọi hotline
          </a>
          <a
            href={SITE.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <MessageCircle className="h-4 w-4" /> Nhắn Facebook
          </a>
        </div>
      </section>
    </div>
  );
}
