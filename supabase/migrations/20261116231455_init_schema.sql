-- BIAS BAG — migration khởi tạo schema.
--
-- File này được SINH RA tự động từ `supabase/schema.sql`.
-- Đừng sửa trực tiếp — hãy sửa schema.sql rồi chạy `npm run db:sync`.
-- =============================================
-- BIAS BAG — Supabase schema
-- Chạy trong Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Bảng danh mục (dòng sản phẩm)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  created_at timestamptz not null default now()
);

-- 2. Bảng sản phẩm
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,0) not null check (price >= 0),
  sale_price numeric(12,0) check (sale_price is null or sale_price >= 0),
  image_url text,
  images text[],
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  material text,
  color text,
  size text,
  features text[],
  in_stock boolean not null default true,
  stock integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  rating numeric(2,1),
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists products_featured_idx on public.products(is_featured);

-- 3. Bảng đơn hàng
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address text not null,
  note text,
  payment_method text not null default 'cod',
  status text not null default 'pending',
  total numeric(12,0) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders(created_at desc);

-- 4. Bảng chi tiết đơn hàng
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price numeric(12,0) not null,
  quantity integer not null check (quantity > 0)
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- =============================================
-- 4b. Bảng banner trang chủ
-- =============================================
-- Admin quản lý 2–5 banner hiển thị luân phiên ở hero trang chủ.
-- `sort_order` quyết định thứ tự hiển thị.

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Tối đa 5 banner đang hoạt động (ràng buộc ở tầng ứng dụng).
  constraint banners_image_not_blank check (length(trim(image_url)) > 0)
);

create index if not exists banners_active_idx
  on public.banners(is_active, sort_order);

-- =============================================
-- 5. Bảng hồ sơ người dùng + phân quyền
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  -- Số điện thoại (lấy từ `auth.users.raw_user_meta_data` lúc đăng ký).
  phone text,
  role text not null default 'customer'
    check (role in ('customer', 'staff', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Thêm cột `phone` cho database đã tồn tại (idempotent).
alter table public.profiles
  add column if not exists phone text;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);

-- Tự động tạo profile khi có user đăng ký mới.
-- role mặc định là 'customer' — phải được nâng lên 'admin' thủ công
-- (xem `scripts/create-admin.ts`).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tự động cập nhật `updated_at` mỗi khi hồ sơ bị sửa.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Hàm kiểm tra quyền admin (security definer để tránh đệ quy RLS).
--
-- `security definer` + `search_path` cố định là đủ an toàn: hàm chỉ đọc
-- `public.profiles` và `auth.uid()` — không nhận tham số từ người gọi.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- Hàm này được gọi từ RLS policy nên phải cho `anon`/`authenticated` quyền
-- EXECUTE. Vì nó nằm trong schema `public` (được expose), Postgres mặc định đã
-- grant EXECUTE cho PUBLIC — thu hẹp lại đúng mức cần thiết.
--
-- THỨ TỰ QUAN TRỌNG: `revoke ... from public` phải đứng TRƯỚC `grant`.
-- `PUBLIC` là nhóm bao gồm mọi role, nên revoke sau sẽ xóa luôn grant vừa cấp
-- cho `anon`/`authenticated`.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Hàm kiểm tra quyền admin (kể cả service role).
--
-- LƯU Ý: đây là hàm `security definer` nằm trong schema `public` (được expose),
-- nên theo mặc định mọi role (kể cả `anon`) đều có quyền EXECUTE.
-- Vì vậy hàm phải tự kiểm tra `auth.uid()` — nếu không, `anon` có thể gọi và
-- nhận về `true` khi không đăng nhập.
--
-- `auth.role()` đã bị Supabase deprecated → dùng `current_setting` để kiểm tra
-- service_role mà không phụ thuộc hàm bị deprecated.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'staff') from public.profiles where id = auth.uid()),
    false
  ) or coalesce(
    (select current_setting('request.jwt.claim.role', true) = 'service_role'),
    false
  )
  -- Format JWT mới: role nằm trong `request.jwt.claims` dạng JSON.
  -- Có guard để không lỗi cast khi biến chưa được set hoặc rỗng.
  or case
       when coalesce(current_setting('request.jwt.claims', true), '') ~ '^\s*\{'
         then (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
       else false
     end;
$$;

-- Hàm này được gọi từ RLS policy nên phải cho `anon`/`authenticated` quyền
-- EXECUTE. Vì nó nằm trong schema `public` (được expose), Postgres mặc định đã
-- grant EXECUTE cho PUBLIC — thu hẹp lại đúng mức cần thiết.
--
-- THỨ TỰ QUAN TRỌNG: `revoke ... from public` phải đứng TRƯỚC `grant`.
-- `PUBLIC` là nhóm bao gồm mọi role, nên revoke sau sẽ xóa luôn grant vừa cấp.
revoke execute on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to anon, authenticated;

-- Hàm kiểm tra quyền thao tác dòng hàng của một đơn.
--
-- Bắt buộc dùng `security definer` vì điều kiện kiểm tra nằm ở bảng `orders`,
-- mà RLS của `orders` chặn `anon` đọc → nếu viết subquery thẳng trong policy
-- của `order_items` thì `WITH CHECK` luôn trả false và guest checkout sẽ
-- thất bại với lỗi "new row violates row-level security policy".
--
-- `security definer` + `search_path` cố định giúp hàm bỏ qua RLS khi đọc
-- bảng `orders`, đồng thời không bị lạm dụng qua `search_path`.
--
-- Lưu ý BOLA: đơn của khách chưa đăng nhập có `user_id is null` → không thể
-- xác định chủ sở hữu. Vì vậy KHÔNG cho `anon` ghi dòng hàng trực tiếp.
-- Server action checkout ghi bằng service role (đã validate giá/tồn kho từ
-- database) — xem src/app/checkout/actions.ts.
create or replace function public.can_write_order_item(order_uuid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_admin_user() or exists (
    select 1
    from public.orders o
    where o.id = order_uuid
      and o.user_id = auth.uid()
  );
$$;

revoke execute on function public.can_write_order_item(uuid) from public;
grant execute on function public.can_write_order_item(uuid) to anon, authenticated;

-- =============================================
-- 6. RLS (Row Level Security)
-- =============================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;
alter table public.banners enable row level security;

-- Profiles: đọc chính mình + admin đọc tất cả
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin_user());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- KHÔNG tạo policy cho phép user tự sửa hồ sơ.
--
-- Postgres RLS không tách được "cột nào được sửa": nếu có policy
-- `using (id = auth.uid())` thì user sẽ sửa được CẢ cột `role` → tự nâng
-- quyền lên admin. Vì vậy mọi đường ghi hồ sơ của chính user đều đi qua
-- Server Action dùng service role, có kiểm tra `user_id` ở tầng ứng dụng
-- (xem `updateProfile` trong `src/app/login/actions.ts`).

-- Categories: đọc công khai
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (true);

-- Products: công khai chỉ thấy sản phẩm đang bán
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select
  to anon, authenticated
  using (is_active = true);

-- Products: admin đọc toàn bộ (kể cả sản phẩm đã ẩn)
drop policy if exists "products_select_admin" on public.products;
create policy "products_select_admin"
  on public.products for select
  to authenticated
  using (public.is_admin_user());

-- Products: admin thêm / sửa / xóa
drop policy if exists "products_insert_admin" on public.products;
create policy "products_insert_admin"
  on public.products for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin"
  on public.products for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin"
  on public.products for delete
  to authenticated
  using (public.is_admin_user());

-- Categories: admin quản lý
drop policy if exists "categories_all_admin" on public.categories;
create policy "categories_all_admin"
  on public.categories for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Banners: công khai đọc banner đang hoạt động
drop policy if exists "banners_select_public" on public.banners;
create policy "banners_select_public"
  on public.banners for select
  to anon, authenticated
  using (is_active = true);

-- Banners: admin đọc toàn bộ (kể cả banner đã ẩn)
drop policy if exists "banners_select_admin" on public.banners;
create policy "banners_select_admin"
  on public.banners for select
  to authenticated
  using (public.is_admin_user());

-- Banners: admin thêm / sửa / xóa
drop policy if exists "banners_insert_admin" on public.banners;
create policy "banners_insert_admin"
  on public.banners for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "banners_update_admin" on public.banners;
create policy "banners_update_admin"
  on public.banners for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "banners_delete_admin" on public.banners;
create policy "banners_delete_admin"
  on public.banners for delete
  to authenticated
  using (public.is_admin_user());

-- Orders: người tạo đọc được đơn của mình, admin đọc tất cả
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin_user());

-- Khách chưa đăng nhập đặt đơn (user_id = null) hoặc đã đăng nhập đặt đơn
-- cho chính mình. Chặn việc giả mạo user_id của người khác.
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  to anon, authenticated
  with check (
    user_id is null
    or user_id = auth.uid()
    or public.is_admin_user()
  );

-- UPDATE cần cả USING và WITH CHECK — nếu thiếu WITH CHECK, admin có thể
-- chuyển đơn sang user khác.
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
  on public.orders for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Order items: tương ứng với quyền trên orders
--
-- Admin đọc được toàn bộ (kể cả đơn của khách chưa đăng nhập — `user_id is null`).
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
  on public.order_items for select
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
    )
  );

-- Chỉ được thêm dòng hàng vào đơn của chính mình.
-- `with check (true)` ở đây sẽ cho phép ghi dòng hàng vào đơn của người khác.
--
-- Không cho `anon` ghi: đơn của khách chưa đăng nhập không xác định được chủ
-- sở hữu (user_id is null) nên sẽ mở lỗ hổng BOLA. Guest checkout đi qua
-- server action với service role.
drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
  on public.order_items for insert
  to authenticated
  with check (public.can_write_order_item(order_id));

-- =============================================
-- 7. Bảng tin nhắn liên hệ
-- =============================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx
  on public.contact_messages(created_at desc);

alter table public.contact_messages enable row level security;

-- Khách gửi tin nhắn (không cần đăng nhập)
drop policy if exists "contact_messages_insert_public" on public.contact_messages;
create policy "contact_messages_insert_public"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- Chỉ admin đọc được hộp thư
drop policy if exists "contact_messages_select_admin" on public.contact_messages;
create policy "contact_messages_select_admin"
  on public.contact_messages for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "contact_messages_update_admin" on public.contact_messages;
create policy "contact_messages_update_admin"
  on public.contact_messages for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- =============================================
-- 8. GRANT — expose bảng cho Data API
-- =============================================
--
-- Từ 30/10/2026, Supabase KHÔNG còn tự động grant quyền cho các bảng mới
-- trong schema `public` (breaking change 45329). Bảng không có GRANT sẽ trả về:
--   {"code":"42501","message":"permission denied for table ..."}
--
-- RLS và GRANT là 2 lớp độc lập:
--   - GRANT  → role có được gọi bảng qua Data API hay không
--   - RLS    → role được thấy dòng dữ liệu nào
--
-- Bảng public đọc bởi khách (anon + authenticated) cần quyền đọc.
-- Bảng chỉ admin thao tác (orders, order_items, profiles, contact_messages)
-- cần quyền cho authenticated — RLS sẽ chặn lại nếu không phải admin.
-- `service_role` bỏ qua RLS nên không cần grant thủ công.

grant usage on schema public to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.banners to anon, authenticated;

grant insert on public.orders to anon, authenticated;
grant select, update on public.orders to authenticated;

-- `order_items`: khách chưa đăng nhập không được ghi trực tiếp (BOLA) —
-- guest checkout đi qua server action dùng service role.
grant insert on public.order_items to authenticated;
grant select on public.order_items to authenticated;

grant select, update on public.profiles to authenticated;

grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;

-- =============================================
-- 9. Storage — bucket ảnh sản phẩm
-- =============================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Quyền ĐỌC metadata bucket (`storage.buckets`).
--
-- Bắt buộc! `storage.buckets` bật RLS nhưng mặc định KHÔNG có policy nào
-- → mọi lệnh đọc bucket bị RLS lọc ra → Storage API trả:
--     {"error":"Bucket not found","code":"NoSuchBucket"}
-- dù bucket có tồn tại thật. Triệu chứng: `supabase.storage.getBucket()` và
-- `storage.list()` đều hỏng, còn upload bằng đường dẫn đầy đủ thì vẫn chạy.
--
-- Policy trên `storage.objects` KHÔNG có tác dụng cho việc này — đọc bucket
-- và đọc object là hai bảng khác nhau.
--
-- Chỉ cho đọc, không cho tạo/xoá/sửa bucket. `service_role` bypass RLS nên
-- vẫn quản lý bucket được (script seed:images).
drop policy if exists "product_images_bucket_read" on storage.buckets;
create policy "product_images_bucket_read"
  on storage.buckets for select
  to anon, authenticated
  using (id = 'product-images');

-- Ảnh: công khai đọc, admin mới được upload/xoá.
-- Storage upsert cần INSERT + SELECT + UPDATE — thiếu SELECT thì thay thế
-- file sẽ thất bại trong im lặng.
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin_user());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin_user())
  with check (bucket_id = 'product-images' and public.is_admin_user());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin_user());

-- =============================================
-- 9. Dữ liệu mẫu — xem `supabase/seed.sql`
-- =============================================
--
-- Dữ liệu mẫu (danh mục, sản phẩm, banner) nằm ở file riêng
-- `supabase/seed.sql` để tách rõ:
--   - schema.sql → DDL (bảng, RLS, policy, Storage, GRANT)  — chạy 1 lần
--   - seed.sql   → dữ liệu mẫu                            — chạy lại được
--
-- `supabase db push --include-seed` sẽ tự chạy cả hai theo đúng thứ tự.
-- Nếu chạy schema.sql thủ công trong SQL Editor, nhớ chạy seed.sql sau.

-- =============================================
-- 10. Nâng quyền admin (chạy SAU khi đã tạo user)
-- =============================================

-- Thay email bên dưới bằng email admin của bạn rồi chạy lại script này:
-- update public.profiles set role = 'admin' where email = 'admin@biasbag.vn';

-- Xem danh sách user + role hiện tại:
-- select p.id, p.email, p.role, u.last_sign_in_at
-- from public.profiles p
-- left join auth.users u on u.id = p.id
-- order by p.created_at desc;
