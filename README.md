# BIAS BAG — Website bán túi xách thời trang

Website chính thức của thương hiệu **BIAS BAG** — chuyên kinh doanh và phân phối túi xách thời trang cho giới trẻ.

> *"BIAS BAG – Phụ kiện nhỏ, phong cách riêng."*

Xây dựng bằng **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Supabase**.

## Yêu cầu

- Node.js 20+ (đã test với Node 26)
- Tài khoản [Supabase](https://supabase.com) (miễn phí)

## Cài đặt nhanh

```bash
npm install
cp .env.example .env.local   # điền thông tin Supabase
npm run dev                   # http://localhost:3000
```

> **Chưa có Supabase?** App vẫn chạy được ở **chế độ demo** với 8 sản phẩm mẫu trong `src/lib/data/products.ts`. Chỉ cần điền `.env.local` để chuyển sang DB thật.

## Cấu hình Supabase

1. Tạo project mới tại [supabase.com](https://supabase.com/dashboard)
2. Áp dụng schema — có 2 cách (xem [Áp dụng schema](#-áp-dụng-schema) bên dưới):
   - `npm run db:push` (khuyến nghị — tự động, có ghi lịch sử migration)
   - hoặc dán `supabase/schema.sql` + `supabase/seed.sql` vào **SQL Editor**
3. Vào **Project Settings → API** → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `publishable key` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `secret key` → `SUPABASE_SERVICE_ROLE_KEY` (chỉ dùng server-side)
4. Tạo tài khoản admin (script idempotent — chạy lại nhiều lần vẫn OK):

```bash
npm run auth:admin -- --email admin@biasbag.vn --password "MatKhauCuaBan123"
```

> Script này tự tạo user trong `auth.users` **và** nâng `profiles.role` lên
> `admin`. Đây là **đường duy nhất** để tạo admin — form `/login` luôn tạo
> role `customer`, nên admin không thể tự đăng ký.
>
> Nếu bạn tạo user thủ công tại **Authentication → Users → Add user**, hãy
> nâng quyền bằng SQL:
>
> ```sql
> update public.profiles set role = 'admin' where email = 'admin@biasbag.vn';
> ```

> Trigger `handle_new_user()` tự tạo profile với role `customer` cho mỗi user mới.
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` là tên biến mới theo khuyến nghị của
> Supabase. Code vẫn hỗ trợ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (tên cũ) nếu bạn
> đang dùng.

### ⚠️ Lỗi thường gặp khi điền `.env.local`

| Sai                                   | Đúng                                | Hậu quả                                            |
| ------------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `.../supabase.co/rest/v1/`            | `.../supabase.co`                  | `Invalid path specified in request URL` (HTTP 404)  |
| Có khoảng trắng cuối dòng            | Không có                            | URL/key không khớp → `Invalid API key`             |
| Thiếu `SUPABASE_SERVICE_ROLE_KEY`     | Cần đủ                              | Script `seed:images` và upload Storage không chạy  |
| `NEXT_PUBLIC_SITE_URL` trỏ localhost | Domain thật khi deploy              | OG image, sitemap, robots trỏ sai domain            |

**Kiểm tra cấu hình sau khi điền:**

```bash
npm run check:env
```

Script sẽ kiểm tra biến môi trường, định dạng Project URL, kết nối Supabase,
tồn tại của 7 bảng, quyền `GRANT` cho Data API và bucket Storage `product-images`.

Đăng nhập admin tại `/login` bằng user vừa tạo.

### 🔒 Ghi chú bảo mật (đã xử lý trong `schema.sql`)

`schema.sql` đã được viết theo khuyến nghị bảo mật chính thức của Supabase:

| Vấn đề                                              | Cách xử lý trong schema                                          |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| Bảng mới không tự được expose qua Data API (từ 30/10/2026) | Có `GRANT` tường minh cho `anon` / `authenticated`         |
| `auth.role()` đã deprecated                         | Dùng `current_setting('request.jwt.claim.role')`                 |
| `security definer` trong schema `public`            | `REVOKE EXECUTE ... FROM public` + `GRANT` đúng role             |
| Policy UPDATE thiếu `WITH CHECK`                    | Bổ sung `WITH CHECK` cho mọi policy UPDATE                        |
| `order_items` BOLA (ghi vào đơn người khác)          | `anon` không được ghi trực tiếp — checkout dùng server action     |
| `storage.buckets` không có policy → `Bucket not found` | Có policy `product_images_bucket_read` (chỉ đọc)             |

> `schema.sql` chạy được nhiều lần (idempotent): mọi policy đều có
> `DROP POLICY IF EXISTS` trước khi tạo.

> **Lưu ý về `storage.buckets`:** bảng này bật RLS nhưng mặc định **không có
> policy nào** → mọi lệnh đọc bucket bị lọc ra và Storage API trả
> `Bucket not found` dù bucket có tồn tại thật. Policy trên `storage.objects`
> không có tác dụng thay thế — đọc bucket và đọc object là hai bảng khác nhau.
> `schema.sql` đã tạo policy `product_images_bucket_read` cho việc này.

### 🛠️ Áp dụng schema không cần copy-paste

Cấu trúc thư mục `supabase/`:

| File                              | Vai trò                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `supabase/schema.sql`             | **DDL** — bảng, RLS, policy, Storage, GRANT. Nguồn duy nhất. |
| `supabase/seed.sql`               | **Dữ liệu mẫu** — 4 danh mục, 8 sản phẩm, 4 banner. Idempotent. |
| `supabase/config.toml`            | Cấu hình Supabase CLI (migrations + seed).                   |
| `supabase/migrations/*.sql`       | Migration cho CLI — **sinh ra tự động** từ `schema.sql`.    |

```bash
# 1. Sync schema.sql → migration (chạy sau mỗi lần sửa schema.sql)
npm run db:sync

# 2. Đẩy lên Supabase
npm run db:push
```

`db:push` chạy `supabase db push --include-seed` — apply migration **rồi**
chạy seed, đúng thứ tự.

**Cách khác khi CLI không dùng được** (ví dụ mạng không có route IPv6 tới DB):

```bash
# Tạo personal access token: https://supabase.com/dashboard/account/tokens
# scope: database_write
export SUPABASE_ACCESS_TOKEN=sbp_...

npm run db:push -- --method api    # gọi Management API qua HTTPS
npm run db:push -- --dry-run       # chỉ in ra SQL, không gửi
```

| Cách                  | Ghi lịch sửử migration | Cần token                                    |
| --------------------- | ----------------------- | -------------------------------------------- |
| CLI (`db push`)       | ✅ Có                   | `supabase login` hoặc `SUPABASE_ACCESS_TOKEN` |
| Management API        | ❌ Không                | `SUPABASE_ACCESS_TOKEN` (scope `database_write`) |

> `db push` của CLI **không** ghi lịch sử migration khi chạy qua API path —
> nếu cần lịch sử đầy đủ, dùng CLI.

Hoặc dùng [Supabase MCP server](https://supabase.com/docs/guides/getting-started/mcp)
(file `.mcp.json` đã có sẵn trong dự án) với tool `execute_sql`.

## Cấu trúc thư mục

```
src/
├── app/                      # App Router
│   ├── page.tsx              # Trang chủ (+ JSON-LD Organization/WebSite)
│   ├── about/page.tsx        # Giới thiệu, tầm nhìn, sứ mệnh, giá trị cốt lõi
│   ├── products/             # Danh sách + chi tiết sản phẩm (+ JSON-LD Product/Breadcrumb)
│   ├── blog/                 # Bài viết (Supabase `posts`) + chi tiết bài viết
│   ├── cart/                 # Giỏ hàng
│   ├── checkout/             # Thanh toán (+ server action)
│   ├── orders/               # Tra cứu đơn hàng (timeline trạng thái)
│   ├── policies/             # Chính sách vận chuyển / đổi trả / bảo hành
│   ├── contact/              # Liên hệ (+ form gửi tin nhắn)
│   ├── login/                # Đăng nhập Supabase Auth
│   ├── api/contact/          # Route handler nhận tin nhắn (có rate limit)
│   ├── admin/banners/        # Quản lý banner trang chủ (2–5 ảnh)
│   ├── admin/posts/          # Quản lý bài viết (thêm/sửa/xoá + SEO)
│   ├── sitemap.ts            # Sitemap động (có cả trang sản phẩm & bài viết)
│   ├── robots.ts             # robots.txt + khai báo sitemap
│   ├── icon.tsx              # Favicon sinh động từ logo
│   └── admin/                # Quản trị: tổng quan, sản phẩm, đơn, tin nhắn, users
├── components/
│   ├── layout/               # Header, Footer, ProductsMenu (dropdown), ForbiddenBanner
│   ├── product/              # Card, form lọc, panel mua hàng
│   ├── cart/  checkout/  admin/  auth/  contact/  order/  ui/
├── lib/
│   ├── data/products.ts      # Data layer (fallback mock + Supabase)
│   ├── data/posts.ts         # Data layer bài viết (Supabase `posts` + fallback)
│   ├── auth.ts               # getCurrentUser, isAdmin, isSuperAdmin
│   ├── storage.ts            # Upload ảnh lên Supabase Storage
│   ├── supabase/             # client / server / middleware
│   ├── store/                # Zustand: cart, toast
│   ├── types/                # Domain types + Database types
│   ├── constants.ts          # SITE, nav, dòng sản phẩm, giá trị cốt lõi
│   └── utils.ts              # formatPrice, slugify, cn…
├── hooks/
└── middleware.ts             # Refresh session + chặn /admin theo role
scripts/seed-images.ts        # Đồng bộ ảnh mẫu lên Supabase Storage
scripts/db-push.ts             # Đẩy schema + seed lên Supabase (CLI hoặc Management API)
scripts/sync-migration.ts      # Sinh migration từ schema.sql
supabase/
├── schema.sql                # DDL + RLS + Storage + GRANT  (nguồn duy nhất)
├── seed.sql                  # Dữ liệu mẫu (idempotent)
├── config.toml               # Cấu hình Supabase CLI
└── migrations/               # Migration cho CLI (sinh tự động từ schema.sql)
```

## Tính năng

**Storefront**

- Trang chủ: hero theo slogan, 4 dòng sản phẩm, sản phẩm nổi bật, 3 bước mua sắm, kênh bán hàng
- **Carousel banner ở hero**: 2–5 ảnh nền luân phiên, tự chuyển mỗi 3 giây, có thumbnail ở góc dưới bên phải + dấu chấm trạng thái, nút mũi tên, tạm dừng khi rê chuột / tab ẩn
- `/about`: giới thiệu thương hiệu, tầm nhìn, sứ mệnh, 5 giá trị cốt lõi, hình thức kinh doanh
- Danh sách sản phẩm: lọc theo dòng, tìm kiếm, khoảng giá, tồn kho, 6 kiểu sắp xếp, phân trang
- `/blog` + `/blog/[slug]`: bài viết lưu trong Supabase, có tìm kiếm / lọc theo chủ đề / phân trang / sắp xếp (xem mục [Bài viết (Blog)](#bài-viết-blog))
- Header: menu "Sản phẩm" dạng dropdown gộp "Tất cả sản phẩm" + 5 dòng sản phẩm, cạnh tab "Bài viết"
- Chi tiết sản phẩm: gallery, đặc điểm nổi bật, thông số (chất liệu / màu / size), sản phẩm cùng dòng
- Giỏ hàng (Zustand + persist), checkout với validation (Zod) và 3 phương thức thanh toán
- `/orders`: tra cứu đơn hàng kèm timeline trạng thái (đặt → xác nhận → giao → hoàn thành)
- `/policies`: chính sách vận chuyển, đổi trả, bảo hành
- `/contact`: 4 kênh liên hệ + form gửi tin nhắn (lưu vào bảng `contact_messages`)

**Admin** (yêu cầu đăng nhập + role `admin`/`staff`)

- Dashboard: số sản phẩm, đơn hàng, doanh thu, đơn hàng gần đây
- CRUD sản phẩm (thêm/sửa/xóa, giá khuyến mãi, tồn kho, đặc điểm, cờ nổi bật)
- **Upload ảnh trực tiếp lên Supabase Storage** (bucket `product-images`) kèm preview
- **Quản lý banner trang chủ** (`/admin/banners`): thêm/sửa/xoá, bật–ẩn, đổi thứ tự (↑↓), tối đa 5 banner đang bật, upload ảnh hoặc chọn nhanh từ thư viện banner có sẵn
- **Quản lý bài viết** (`/admin/posts`): thêm/sửa/xoá bài, trình soạn thảo HTML, upload ảnh, chủ đề/tags, meta SEO, xuất bản & bài nổi bật
- Đơn hàng: chi tiết sản phẩm trong đơn, đổi trạng thái inline
- Hộp thư liên hệ: đọc, đánh dấu đã đọc, trả lời qua mail
- Phân quyền: đổi role `customer` / `staff` / `admin` (chỉ `admin` mới đổi được)

**Phân quyền**

| Role    | Quyền                                             |
| ------- | ------------------------------------------------- |
| customer| Xem shop, đặt hàng, xem đơn của mình             |
| staff   | + vào `/admin`, sửa sản phẩm, cập nhật đơn hàng  |
| admin   | + đổi role người dùng, đọc hộp thư liên hệ       |

## Đăng nhập / Đăng ký

Trang `/login` dùng **một form duy nhất** cho cả khách hàng và admin.

| Điểm                  | Chi tiết                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Giao diện             | Split-panel: cột trái kể chuyện thương hiệu (gradient hồng), cột phải là form. Tông hồng `#ddada0` (`blush-400`) — đúng màu chữ "Phụ kiện nhỏ, phong cách riêng" ở banner |
| Chuyển tab            | `Đăng nhập` / `Đăng ký` dùng chung giao diện, chuyển qua lại không mất dữ liệu nhập                |
| Mật khẩu              | Nút hiện/ẩn, **thanh đo độ mạnh** (Rất yếu → Rất mạnh) cập nhật tức thì                          |
| Validate              | Zod, lỗi hiển thị **ngay dưới từng trường** (không dùng `alert`)                                |
| Ghi nhớ đăng nhập     | Bật → cookie phiên 1 năm. Tắt → cookie phiên trình duyệt (tự xoá khi đóng tab)                  |
| Đăng ký               | Tạo tài khoản **ngay lập tức** — không cần xác nhận email, không bị chặn bởi rate limit SMTP      |
| Điều hướng sau login  | `admin`/`staff` → `/admin`, `customer` → `/account`                                              |
| Admin là tài khoản riêng | Form đăng ký **luôn** tạo role `customer` — không có ô chọn role. Admin được cấp qua `npm run auth:admin` |

**Luồng dữ liệu:** `useActionState` (React 19) → Server Action → Zod validate →
Supabase Auth (`auth.users`) + trigger `handle_new_user()` tự tạo dòng
`public.profiles` với `role = 'customer'`.

**Vì sao dùng service role khi đăng ký?** Project Supabase đang giới hạn tần suất
gửi email (`over_email_send_rate_limit`), nên đăng ký công khai sẽ treo ở bước
"chờ email xác nhận". Server Action dùng `auth.admin.createUser` với
`email_confirm: true` rồi đăng nhập luôn — tài khoản có sẵn ngay.

> **Cột `profiles.phone`:** schema mới thêm cột này. Nếu DB chưa chạy migration,
> số điện thoại vẫn được lưu trong `auth.users.raw_user_meta_data` và code tự
> bỏ qua cột `phone` (không lỗi). Chạy `npm run db:push` để thêm cột.

**Kỹ thuật**

- Server Components mặc định, Server Actions cho mutation
- Middleware refresh session Supabase và chặn `/admin` theo role
- Server Action tự kiểm tra lại role (chống gọi trực tiếp qua POST)
- Toast notification, responsive mobile-first
- Metadata/OG tags, `revalidate` cho ISR
- **SEO**: `sitemap.xml` động (kèm trang sản phẩm), `robots.txt`, JSON-LD
  (`Organization` + `WebSite` ở trang chủ; `Product` + `BreadcrumbList` ở trang sản phẩm),
  favicon sinh động từ file logo

**Bảo mật**

| Biện pháp                                   | Chi tiết                                                     |
| ------------------------------------------- | ------------------------------------------------------------ |
| Phân quyền hai lớp                          | Middleware chặn route + `requireAdmin()` trong từng Server Action |
| RLS                                          | `is_admin_user()` (security definer) cho bảng admin          |
| Chống giả mạo `user_id`                     | Policy `orders_insert_own` chỉ cho `user_id = auth.uid()` hoặc `null` |
| Giá & tồn kho từ database                    | Checkout không tin giá client gửi lên — luôn query lại `products` |
| Chống open redirect                          | Param `next` ở `/login` chỉ chấp nhận đường dẫn nội bộ (`/...`, không `//`) |
| Rate limit form liên hệ                    | Tối đa 3 tin nhắn / IP / 10 phút (trả về HTTP 429)            |
| Validate đầu vào                            | Zod schema cho mọi form + Server Action                        |
| Giữ nguyên slug khi sửa sản phẩm            | Đổi tên không làm hỏng link đã chia sẻ                          |

## Dòng sản phẩm

| Dòng       | Slug           | Mô tả                       |
| ---------- | -------------- | --------------------------- |
| Túi Tote   | `tui-tote`     | Dáng rộng, đựng vừa đồ    |
| Túi Xách   | `tui-xach`     | Nhỏ gọn, tôn vinh sự thanh lịch |
| Túi Đeo Vai| `tui-deo-vai`  | Vai dài, thoải mái cả ngày |
| Balo & Cặp | `balo-cap`     | Hợp đồng học, văn phòng    |

### Nguồn sự thật duy nhất

5 dòng sản phẩm (K-Pop, Logo, Địa Điểm, Tối Giản, Y2K) được định nghĩa
**một lần** trong `STYLE_LINES` (`src/lib/constants.ts`). Header (dropdown),
footer (menu phụ), trang chủ (grid dòng sản phẩm) và bộ lọc ở `/products` đều
lấy từ đó — đổi tên/slug ở `STYLE_LINES` là tất cả cập nhật theo.

## Bài viết (Blog)

Bài viết lưu trong **Supabase** (bảng `posts`), admin quản lý tại `/admin/posts`.
Không còn phụ thuộc WordPress hay bất kỳ CMS bên ngoài nào.

### Cách hoạt động

| Điểm            | Chi tiết                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Nguồn           | `src/lib/data/posts.ts` — `getPosts()` (danh sách), `getPostBySlug()` (chi tiết), `getRelatedPosts()` |
| Bảng            | `public.posts` — tiêu đề, slug, nội dung HTML, ảnh, tags, chủ đề, meta SEO, trạng thái         |
| Client          | Trang công khai dùng `createPublicClient()` (không cookie) ⇒ route vẫn render tĩnh (ISR)         |
| Trang quản trị  | Dùng client có session (`createClient()`) để thấy cả bản nháp                                    |
| Cache           | `revalidate = 300` (5 phút) + `revalidateTag`/`revalidatePath` khi admin sửa bài                |
| Lỗi DB         | Bắt lỗi → trả về **dữ liệu mẫu** trong code (3 bài viết mẫu) ⇒ site không trắng                  |
| RLS             | Chỉ bài `status = 'published'` hiển thị công khai; admin CRUD qua policy `is_admin_user()`        |
| Sitemap         | `/sitemap.xml` tự thêm các URL `/blog/[slug]`                                                    |

### Quản trị bài viết

Tại `/admin/posts` (hoặc `/admin/posts/new`):

- **Nội dung**: trình soạn thảo HTML (in đậm/nghiêng, tiêu đề, danh sách, trích dẫn, liên kết) + chế độ xem trước
- **Ảnh**: upload lên Supabase Storage kèm preview (bucket `product-images`, folder `posts`)
- **Phân loại**: chủ đề + tags (tạo liên kết nội bộ `/blog?tag=…` giúp SEO)
- **SEO**: meta title, meta description, meta keywords, ảnh OG — để trống thì fallback sang tiêu đề & tóm tắt
- **Xuất bản**: Bản nháp / Đã đăng / Đã ẩn + cờ bài nổi bật

### Tối ưu SEO của trang bài viết

- `metadata` riêng cho từng bài (title, description, keywords, canonical, OG, Twitter card)
- JSON-LD `Article` + `BreadcrumbList` (rich snippet trên Google)
- JSON-LD `Blog` + `ItemList` cho trang danh sách `/blog`
- Cấu trúc heading chuẩn (`<article>` + `<h1>`/`<h2>`), ảnh có `alt` mô tả nội dung
- Liên kết nội bộ tới bài liên quan, chủ đề và tag
- `generateStaticParams` + ISR ⇒ HTML tĩnh, TTFB thấp
- `robots.txt` chặn `/admin`, `/cart`, `/checkout`, `/login`; sitemap động

Nội dung bài viết lưu dạng HTML → render bằng `dangerouslySetInnerHTML` với class
`.prose-bb` (định nghĩa trong `globals.css`) để chuẩn hoá tiêu đề, danh sách,
ảnh, bảng, trích dẫn theo màu thương hiệu.

## Scripts

```bash
npm run dev            # dev server
npm run build          # production build
npm run start          # chạy production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run seed:images    # tải ảnh mẫu lên Supabase Storage + cập nhật products.image_url
npm run check:env      # kiểm tra cấu hình .env.local + kết nối Supabase + bảng + bucket
npm run check:seo      # kiểm tra robots.txt / sitemap.xml / canonical / JSON-LD trên website đang chạy
npm run db:sync        # sinh supabase/migrations/*.sql từ supabase/schema.sql
npm run db:push        # đẩy schema + seed lên Supabase (CLI, fallback Management API)
npm run auth:admin     # tạo/nâng tài khoản admin (--email, --password)
npm run logo:optimize  # sinh lại logo.png / logo-white.png / logo-og.png đã tối ưu
npm run banner:optimize # sinh lại public/banners/*.webp từ assets/banners/
```

`npm run seed:images` cần `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local` và chỉ nên chạy cục bộ.

## Banner trang chủ

Hero trang chủ dùng **carousel ảnh nền**. Admin quản lý tại `/admin/banners`.

| Mục                | Chi tiết                                                       |
| ------------------ | -------------------------------------------------------------- |
| Số lượng           | Tối thiểu 2, tối đa **5** banner đang bật (kiểm tra cả server lẫn UI) |
| Tự động chuyển     | Mỗi **3 giây**, hiệu ứng `opacity` chuyển mềm 700ms              |
| Thumbnail          | Góc dưới bên phải — bấm để nhảy tới banner đó                  |
| Điều khiển         | Nút mũi tên trái/phải + dấu chấm trạng thái                     |
| Tạm dừng           | Tự dừng khi rê chuột vào hero hoặc khi tab trình duyệt bị ẩn   |
| Tối ưu tải trang   | Chỉ render ảnh hiện tại + ảnh kế tiếp (không tải cả 5 ảnh 1920px) |
| Ảnh thumbnail      | Dùng bản `-sm.webp` (960px) nếu có, nhẹ hơn ~30%                |

**Cấu trúc ảnh trong `public/banners/`**

| File                 | Dùng cho                                  |
| -------------------- | ----------------------------------------- |
| `banner-N.webp`      | Ảnh nền hero (1920px, ~40–62KB)          |
| `banner-N-sm.webp`   | Thumbnail + mobile (960px, ~30–47KB)      |
| `banner-N.jpg`       | Fallback cho trình duyệt cũ              |

Ảnh gốc nằm ở `assets/banners/` (không đưa vào `public/` để tránh bị nén
lại). Chạy `npm run banner:optimize` để sinh lại.

**Quản trị**

- Thêm banner: chọn ảnh từ thư viện có sẵn, upload ảnh mới lên Storage, hoặc dán URL
- **Ảnh riêng cho mobile**: mỗi banner có thể có ảnh dọc riêng
  (`image_url_mobile`, khuyến nghị 1080×1350px). Màn hình `< md` dùng ảnh này,
  từ `md` trở lên dùng ảnh ngang. Bỏ trống → dùng chung ảnh desktop
- Sửa: bấm icon bút chì trên từng banner → form chuyển sang chế độ sửa
- Bật/ẩn: icon con mắt (bánh xe đang quay = đang hiển thị)
- Đổi thứ tự: mũi tên ↑ ↓ (thứ tự hiển thị trên trang chủ)
- Xoá: icon thùng rác (có xác nhận)

Bảng `banners` trong Supabase có RLS: công khai chỉ đọc được banner đang bật,
admin quản lý toàn bộ.

## Logo

| File                    | Kích thước | Dùng cho                                          |
| ----------------------- | ---------- | ------------------------------------------------- |
| `public/logo.png`       | 256px      | Header, trang login, admin layout                 |
| `public/logo-white.png` | 256px      | Hero trang chủ & `/about`, footer (nền tối)       |
| `public/logo-og.png`    | 512px      | Favicon, apple-touch-icon, Open Graph / Twitter   |

Logo gốc có nền trong suốt. Các bản được sinh bằng:

```bash
npm run logo:optimize   # resize + PNG lossless, không palette quantization
```

**Vì sao logo phải dùng `unoptimized`?**

Logo là chữ calligraphy có nét rất mỏng. Next.js Image optimizer nén PNG bằng
**palette quantization**, làm mất khoảng **40% độ sắc nét** — nét chữ bị vỡ
pixel và nhìn mờ. Đo bằng Laplacian variance ở 56px:

| Phương pháp                    | Độ sắc | So với chuẩn |
| ------------------------------ | ------ | ------------ |
| PNG lossless (không palette)   | 20796  | **100%**     |
| Next.js optimizer (PNG, q=75)  | 12707  | 61%          |
| JPEG q=75                     | 7299   | 35%          |

Vì vậy logo được tối ưu sẵn ở đúng kích thước hiển thị và gắn `unoptimized`
để serve thẳng file, không đi qua optimizer.

Logo ở header và footer là link trỏ về trang chủ (`/`) — không kèm chữ "BIAS BAG /
Bags". Vùng nền tối (hero, footer) dùng bản trắng để đảm bảo độ tương phản.

Toàn bộ link mạng xã hội nằm tại `SITE.social` trong `src/lib/constants.ts`:

- Shopee: `https://shopee.vn/shop/1770939006`
- Facebook: `https://www.facebook.com/profile.php?id=61595001308839`
- TikTok: `https://tiktok.com/@biasbag`
- Instagram: `https://instagram.com/biasbag`

## Deploy

**Vercel (khuyến nghị)**

1. Import repo vào Vercel
2. Thêm các biến môi trường từ `.env.example`
3. Deploy

### ⚠️ Biến môi trường BẮT BUỘC khi deploy

Thiếu biến này sẽ khiến **admin không đăng nhập được** (bị đẩy về `/account`)
và **không đặt được hàng**. Vercel → Settings → Environment Variables:

| Biến                             | Bắt buộc | Nếu thiếu                                            |
| -------------------------------- | -------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | ✅        | App không kết nối được DB                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅   | Không đăng nhập được                                 |
| `SUPABASE_SERVICE_ROLE_KEY`      | ✅        | Admin login sai role, đổi email/mật khẩu hỏng, **không đặt được hàng** |
| `NEXT_PUBLIC_SITE_URL`           | ⬜        | OG image / sitemap / robots trỏ sai domain           |
| `GOOGLE_SITE_VERIFICATION`       | ⬜        | Không xác minh được với Google Search Console        |

> `SUPABASE_SERVICE_ROLE_KEY` lấy ở Supabase → Project Settings → API →
> **secret key** (`sb_secret_…`). Đặt cho cả **Production**, **Preview** và
> **Development** — nếu chỉ set Production mà preview deploy thiếu key thì
> bạn sẽ tưởng "deploy lên không đăng nhập được".

Kiểm tra nhanh sau khi deploy:

```bash
npm run check:env
```

Trang `/admin/profile` cũng hiển thị cảnh báo nếu phát hiện thiếu
`SUPABASE_SERVICE_ROLE_KEY`.

### Kiểm tra migration đã áp dụng

Sau khi đổi schema (thêm cột, bảng, function), chạy migration trước khi
deploy code mới:

```bash
npm run db:push        # CLI (ghi lịch sử migration)
# hoặc
export SUPABASE_ACCESS_TOKEN=sbp_...
npm run db:push -- --method api
```

Code đã được viết để **không sập** khi migration chưa chạy (dò cột rồi mới
ghi — xem `src/lib/supabase/order-schema.ts` và `banner-schema.ts`), nhưng
để có tính năng mới thì migration vẫn phải được apply.

## Hồ sơ quản trị

Trang `/admin/profile` cho phép admin:

- Xem email hiện tại, vai trò
- **Đổi email** (email được `email_confirm: true` ngay → không cần chờ link
  xác nhận, nhưng phải đăng nhập lại bằng email mới)
- **Đổi mật khẩu** (bắt buộc nhập mật khẩu hiện tại; tối thiểu 8 ký tự,
  có chữ cái và chữ số)

Cả hai thao tác dùng service role key nên **bắt buộc phải có**
`SUPABASE_SERVICE_ROLE_KEY`.

## Google Search Console (chỉ mục web)

Toàn bộ phần cấu hình đã có sẵn trong code — việc còn lại là **thêm property
trên Google Search Console** và **dán mã xác minh** vào biến môi trường.

### Những gì dự án đã chuẩn bị

| Hạng mục           | Vị trí                                                | Ghi chú                                       |
| ------------------ | ----------------------------------------------------- | --------------------------------------------- |
| Sitemap            | `src/app/sitemap.ts`                                  | Sinh động từ DB: trang tĩnh + sản phẩm + danh mục + bài viết |
| Robots             | `src/app/robots.ts`                                   | Trỏ `Sitemap:` + chặn trang riêng tư          |
| Canonical          | `src/lib/seo.ts` (`buildPageMetadata`)                 | Mọi trang đều có `alternates.canonical`        |
| JSON-LD            | `src/components/seo/json-ld.tsx`                      | `Organization`, `WebSite`, `Product`, `Article`, `BreadcrumbList`… |
| Thẻ xác minh       | `src/app/layout.tsx` (`metadata.verification.google`)  | Đọc từ env, không cần sửa code                |
| File xác minh      | `src/app/api/google-verification/route.ts`            | Sinh `/google<token>.html` từ env             |
| Analytics           | `@vercel/analytics` (`<Analytics />` trong layout)    | Đo lưu lượng truy cập                         |

### Bước 1 — Thêm property

1. Vào [search.google.com/search-console](https://search.google.com/search-console)
2. Nhấn **Add property** (Thuộc tính) → chọn loại **Domain** và nhập `biasbag.shop`
   (loại Domain bao gồm cả `www` và mọi subdomain — khuyến nghị)
3. Google hiển thị một **DNS TXT record** → dán vào DNS của domain (nhà cung cấp
   nơi bạn mua `biasbag.shop`)

> Nếu không quản lý DNS được, dùng loại **URL-prefix** với `https://biasbag.shop`
> và xác minh bằng **HTML thẻ** hoặc **HTML file** (cả hai đều đã tích hợp sẵn).

### Bước 2 — Dán mã xác minh

| Cách xác minh | Mã cần lấy ở đâu                        | Cách dán vào dự án                                                     |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| **HTML thẻ**  | Xác minh → HTML thẻ → copy `content`     | Set `GOOGLE_SITE_VERIFICATION=<mã>` trên Vercel → deploy lại           |
| **HTML file** | Xác minh → HTML file → copy tên file    | Set `GOOGLE_SITE_VERIFICATION=<mã>` trên Vercel → deploy lại           |
| **DNS TXT**   | Xác minh → DNS → bảng ghi TXT          | Không cần deploy — thêm bản ghi DNS rồi bấm Xác minh                  |

Trên Vercel: **Project → Settings → Environment Variables** → thêm
`GOOGLE_SITE_VERIFICATION` (đặt cho cả **Production** và **Preview**) → **Redeploy**.

Sau khi deploy, kiểm tra:

```bash
curl https://biasbag.shop | grep -o 'google-site-verification" content="[^"]*"'
curl https://biasbag.shop/googleABC123.html   # tên file Google cấp
```

### Bước 3 — Gửi sitemap

Trong Search Console → **Sitemaps** → mục `Sitemap` → nhập:

```
sitemap.xml
```

Google sẽ tự đọc `https://biasbag.shop/sitemap.xml`. Ngoài ra `robots.txt` đã
trỏ sẵn tới sitemap nên Google cũng tự tìm thấy.

### Bước 4 — Yêu cầu lập chỉ mục (Request indexing)

Với các URL quan trọng (trang chủ, từng sản phẩm, từng bài viết):

1. Vào **URL Inspection** trên thanh công cụ Search Console
2. Dán URL → **Enter** → **Request Indexing**

`robots.txt` đã chặn `/admin`, `/login`, `/cart`, `/checkout`, `/orders`,
`/account`; các trang này cũng có `noindex` nên sẽ không bị lập chỉ mục.

### Kiểm tra tự động

```bash
npm run check:seo -- https://biasbag.shop
```

Script kiểm tra: `robots.txt` (có khai báo sitemap, chặn trang riêng tư),
`sitemap.xml` (URL đúng domain, không trùng lặp, không chứa trang riêng tư),
thẻ `google-site-verification`, và canonical + JSON-LD + title + description
trên các trang chính.

## Thanh toán

Shop chỉ nhận **COD** (thanh toán khi nhận hàng).

- `payment_method` luôn là `cod`; đơn mới tạo có `payment_status = 'unpaid'`
- Mã đơn sinh bằng sequence Postgres `next_order_code()` → dạng
  `BB-YYMMDD-000123`, duy nhất kể cả khi nhiều đơn tạo đồng thời
- Tồn kho trừ **nguyên tử** qua RPC `decrement_product_stock` → không bao giờ
  bán vượt tồn kho
- Khách chưa đăng nhập vẫn đặt hàng được; sau khi đặt được cấp cookie
  httpOnly (HMAC) để xem chi tiết đơn

## Ghi chú

- Giá lưu dạng `numeric` (VNĐ, không có phần thập phân) — hiển thị `320.000 ₫`
- Ảnh mẫu dùng URL Unsplash. `next.config.ts` đã khai báo sẵn `remotePatterns` cho
  `images.unsplash.com` và `**.supabase.co/storage/**`
- Upload ảnh giới hạn 5MB, chỉ nhận JPG / PNG / WEBP / AVIF
- `is_admin_user()` là `security definer` — không được gọi từ client, chỉ dùng trong RLS policy
