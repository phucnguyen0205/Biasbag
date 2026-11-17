export const SITE = {
  name: "BIAS BAG",
  slogan: "Phụ kiện nhỏ, phong cách riêng.",
  tagline: "Túi xách thời trang cho giới trẻ",
  description:
    "BIAS BAG chuyên kinh doanh và phân phối túi xách thời trang với mẫu mã đa dạng, thiết kế hiện đại. Chất liệu chọn lọc, mức giá hợp lý, giao hàng toàn quốc.",
  /**
   * Mô tả dùng cho meta description mặc định (SEO).
   * Tách riêng khỏi `description` (nội dung hiển thị ở footer) vì hai mục
   * đích khác nhau: footer cần câu văn thương hiệu, SEO cần từ khoá.
   */
  seoDescription:
    "BIAS BAG chuyên túi vải canvas dày dặn, thiết kế độc bản và nhận in hình cá nhân, idol sắc nét — giá hợp lý, giao nhanh toàn quốc.",
  currency: "VND",
  locale: "vi-VN",
  phone: "094 841 66 60",
  email: "biasbag597@gmail.com",
  address: "199 Hồ Tùng Mậu, Da Nang, Vietnam",
  workingHours: "Thứ 2 – Chủ nhật: 07:00 – 22:30",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61595001308839",
    shopee: "https://shopee.vn/shop/1770939006",
  },
  /**
   * Logo (WebP — nhẹ hơn PNG ~50%: 45KB → 22KB).
   *
   * Logo hiển thị ở kích thước 104×65px nên ảnh gốc 256×161 là dư; WebP
   * quality 88 vẫn sắc nét ở mọi kích thước hiển thị.
   */
  logo: "/logo.webp",
  logoWhite: "/logo-white.webp",
  /** Ảnh OG (share mạng xã hội) — giữ PNG vì nhiều nền tảng yêu cầu PNG/JPG. */
  logoOg: "/logo-og.png",
} as const;

export const ROUTES = {
  home: "/",
  products: "/products",
  cart: "/cart",
  checkout: "/checkout",
  orders: "/orders",
  about: "/about",
  admin: "/admin",
} as const;

export const ORDER_STATUS = {
  pending: { label: "Chờ xác nhận", tone: "amber" },
  confirmed: { label: "Đã xác nhận", tone: "blue" },
  shipping: { label: "Đang giao", tone: "indigo" },
  delivered: { label: "Đã giao", tone: "emerald" },
  cancelled: { label: "Đã hủy", tone: "rose" },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

export const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Bán chạy" },
  { value: "price-asc", label: "Giá: Thấp → Cao" },
  { value: "price-desc", label: "Giá: Cao → Thấp" },
  { value: "name-asc", label: "Tên A → Z" },
] as const;

export const FREE_SHIPPING_THRESHOLD = 300_000;

/** Phí vận chuyển cố định (đơn hàng trong nước). */
export const SHIPPING_FEE = 30_000;

/* ------------------------------------------------------------------ */
/*  Thanh toán                                                         */
/* ------------------------------------------------------------------ */

/**
 * Phương thức thanh toán.
 *
 * `id` được lưu vào cột `orders.payment_method`.
 * `instructions` hiển thị cho khách ngay trên form checkout + trang xác nhận
 * đơn, để khách biết chính xác phải làm gì sau khi đặt hàng.
 */
export const PAYMENT_METHODS = {
  cod: {
    id: "cod",
    label: "Thanh toán khi nhận hàng (COD)",
    short: "COD",
    desc: "Bạn thanh toán tiền mặt cho shipper khi nhận đơn.",
    instructions: [
      "Chuẩn bị đúng số tiền trong đơn hàng để trả cho shipper.",
      "Kiểm tra kỹ sản phẩm trước khi thanh toán.",
      "Shipper sẽ liên hệ trước khi giao để xác nhận địa chỉ.",
    ],
    // COD chưa thu tiền khi đặt → admin xác nhận sau khi nhận tiền.
    paidOnCreate: false,
  },
  bank_transfer: {
    id: "bank_transfer",
    label: "Chuyển khoản ngân hàng",
    short: "Chuyển khoản",
    desc: "Chuyển khoản trực tiếp qua mã QR VietQR — nhanh và miễn phí.",
    instructions: [
      "Chuyển đúng số tiền trong đơn hàng.",
      "Ghi nội dung chuyển khoản là MÃ ĐƠN HÀNG để được đối soát nhanh nhất.",
      "Sau khi chuyển, chụp màn hình gửi qua Fanpage Facebook hoặc Zalo để được xác nhận nhanh.",
    ],
    paidOnCreate: false,
  },
  momo: {
    id: "momo",
    label: "Ví MoMo / ZaloPay",
    short: "MoMo / ZaloPay",
    desc: "Thanh toán bằng ví điện tử MoMo hoặc ZaloPay.",
    instructions: [
      "Mở ứng dụng MoMo hoặc ZaloPay và chọn phương thức BIAS BAG.",
      "Chuyển đúng số tiền trong đơn hàng.",
      "Ghi nội dung là MÃ ĐƠN HÀNG để đối soát.",
      "Chụp màn hình giao dịch gửi qua Fanpage Facebook hoặc Zalo.",
    ],
    paidOnCreate: false,
  },
} as const;

export type PaymentMethodId = keyof typeof PAYMENT_METHODS;

/**
 * Phương thức thanh toán KHÁCH ĐƯỢC CHỌN khi đặt hàng.
 *
 * Hiện tại shop chỉ nhận COD (thanh toán khi nhận hàng) → khách đặt hàng
 * xong là hoàn tất, không cần chuyển khoản/chờ xác nhận thu tiền.
 *
 * `bank_transfer` / `momo` vẫn còn trong `PAYMENT_METHODS` để hiển thị được
 * các đơn cũ đã tạo với 2 phương thức đó (không xoá dữ liệu lịch sử).
 */
export const PAYMENT_METHOD_LIST: readonly PaymentMethodId[] = ["cod"];

/**
 * Tất cả phương thức thanh toán mà hệ thống nhận diện được (dùng để validate
 * dữ liệu cũ / đơn đã tạo trước khi chỉ mở COD).
 */
export const ALL_PAYMENT_METHOD_LIST: readonly PaymentMethodId[] = Object.keys(
  PAYMENT_METHODS,
) as PaymentMethodId[];

/** Phương thức mặc định khi khách đặt hàng. */
export const DEFAULT_PAYMENT_METHOD: PaymentMethodId = "cod";

/** Nhãn ngắn gọn dùng ở trang admin / đơn hàng. */
export function paymentLabel(id: string): string {
  return (
    PAYMENT_METHODS[id as PaymentMethodId]?.short ??
    PAYMENT_METHODS.cod.short
  );
}

/**
 * Thông tin tài khoản nhận tiền (hiển thị cho khách khi chọn chuyển khoản).
 *
 * Thông tin này nên được cấu hình qua biến môi trường ở production, nhưng
 * để trong constants giúp admin dễ cập nhật trong code.
 */
export const BANK_INFO = {
  bank: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)",
  accountNumber: "0123 4567 89",
  accountName: "NGUYEN THI BIAS",
  // Nội dung chuyển khoản gợi ý — khách sẽ tự thêm mã đơn.
  transferMemo: "BIAS BAG",
  momoPhone: "094 841 66 60",
} as const;

/* ------------------------------------------------------------------ */
/*  Trạng thái thanh toán                                               */
/* ------------------------------------------------------------------ */

export const PAYMENT_STATUS = {
  unpaid: { label: "Chưa thanh toán", tone: "amber" },
  paid: { label: "Đã thanh toán", tone: "emerald" },
  refunded: { label: "Đã hoàn tiền", tone: "rose" },
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUS;


/** Dòng sản phẩm — phản ánh đúng định hướng phong cách của thương hiệu. */
export const STYLE_LINES = [
  {
    slug: "tui-tote-kpop",
    name: "Túi Tote K-Pop",
    tagline: "In hình idol, nhóm nhạc, concert",
    desc: "Dòng túi canvas in hình chủ nhân cầu thể dừa đầu: BTS, BLACKPINK, COWBOYS và các nhóm thần tượng khác.",
  },
  {
    slug: "tui-tote-logo",
    name: "Túi Tote Logo",
    tagline: "Thương hiệu, câu slogan",
    desc: "Những mẫu túi in logo BIAS BAG và các thương hiệu, câu slogan nổi tiếng — dễ phối, dễ đi.",
  },
  {
    slug: "tui-tote-dia-diem",
    name: "Túi Tote Địa Điểm",
    tagline: "Việt Nam trong từng hình thêu",
    desc: "Hà Nội, Đà Nẵng, Hội An, Sài Gòn… những địa danh được vẽ lại đầy cá tính trên nền canvas.",
  },
  {
    slug: "tui-tote-toi-gian",
    name: "Túi Tote Tối Giản",
    tagline: "Trắng, đen, in đơn sắc",
    desc: "Form dáng canvas cơ bản, màu trắng hoặc đen, hình in tối giản — mẫu mã an toàn cho mọi outfit.",
  },
  {
    slug: "tui-tote-y2k",
    name: "Túi Tote Y2K",
    tagline: "Hình in sắc màu, họa tiết trendy",
    desc: "Trào lưu Y2K đầy màu sắc: hình minh họa tai nghe, hình học và chi tiết đột biến.",
  },
] as const;

/**
 * Menu điều hướng chính ở header.
 *
 * "Trang chủ" là mục đầu tiên — người dùng có thể về trang chủ từ tab
 * trên header, không chỉ bằng cách bấm logo.
 *
 * "Sản phẩm" là menu cha: click vào chữ "Sản phẩm" sẽ vào thẳng trang
 * `/products`, phần chevron bên cạnh (hoặc hover chuột) mở dropdown liệt kê
 * các dòng sản phẩm. Danh sách dòng lấy từ `STYLE_LINES` để chỉ có một
 * nguồn sự thật — đổi tên/slug ở `STYLE_LINES` là header + footer + trang
 * sản phẩm cùng cập nhật.
 */
export const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  {
    href: "/products",
    label: "Sản phẩm",
    children: STYLE_LINES.map((line) => ({
      href: `/products?category=${line.slug}`,
      label: line.name,
    })),
  },
  { href: "/blog", label: "Bài viết" },
  { href: "/about", label: "Về chúng tôi" },
  { href: "/contact", label: "Liên hệ" },
] as const;

/** Link danh mục (dùng cho menu phụ trong footer). */
export const CATEGORY_LINKS: readonly { href: string; label: string }[] =
  STYLE_LINES.map((line) => ({
    href: `/products?category=${line.slug}`,
    label: line.name,
  }));

export const CORE_VALUES = [
  {
    title: "Chất lượng & Tận tâm",
    desc: "Chọn lọc chất liệu, kiểu dáng và độ hoàn thiện; quan tâm trọn vẹn tới trải nghiệm mua sắm.",
  },
  {
    title: "Thời trang & Sáng tạo",
    desc: "Cập nhật xu hướng, đa dạng hóa mẫu mã và phong cách để đáp ứng thị hiếu giới trẻ.",
  },
  {
    title: "Khách hàng là trọng tâm",
    desc: "Nhu cầu và sự hài lòng của khách hàng luôn được đặt lên hàng đầu, từ tư vấn đến hỗ trợ sau bán.",
  },
  {
    title: "Uy tín & Minh bạch",
    desc: "Thông tin và hình ảnh rõ ràng, tư vấn trung thực, chính sách bán hàng minh bạch.",
  },
  {
    title: "Phát triển bền vững",
    desc: "Hoàn thiện dần chất lượng sản phẩm, dịch vụ và hệ thống bán hàng trực tuyến.",
  },
] as const;

export const CHANNELS = [
  {
    name: "Shopee",
    desc: "Kênh bán lẻ chính với cập nhật mẫu mã hằng tuần.",
    href: SITE.social.shopee,
  },
  {
    name: "Facebook",
    desc: "Kênh tư vấn nhanh qua Messenger và livestream.",
    href: "https://www.facebook.com/profile.php?id=61595001308839",
  },
  {
    name: "Website chính thức",
    desc: "Cửa hàng trực tuyến với đầy đủ thông tin và chính sách.",
    href: "/",
  },
] as const;
