-- BIAS BAG — bài viết (blog) trong database.
--
-- Thay thế nguồn bài viết WordPress bằng bảng `posts` do admin quản lý
-- tại `/admin/posts`.
--
-- Thiết kế:
--   1. Nội dung lưu dạng HTML → render bằng class `.prose-bb`.
--   2. Cột SEO riêng (meta_title, meta_description, meta_keywords, og_image)
--      cho phép tối ưu từng bài thay vì dùng chung metadata của cả site.
--   3. `slug` là URL công khai (/blog/<slug>) ⇒ UNIQUE để không trùng URL
--      (duplicate content làm giảm thứ hạng SEO).
--   4. Chỉ bài `published` hiển thị công khai (bản nháp không bị Google index).
--
-- Toàn bộ câu lệnh idempotent → chạy lại nhiều lần vẫn an toàn.
-- =============================================

-- 1. Hàm cập nhật `updated_at`
--
-- Định nghĩa TRƯỚC trigger vì Postgres yêu cầu hàm phải tồn tại trước khi
-- trigger được tạo.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. Bảng bài viết
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  -- Ảnh đại diện bài viết (URL tuyệt đối trong Supabase Storage).
  image_url text,
  -- Ảnh dùng cho OpenGraph / Twitter card.
  og_image text,
  -- Từ khoá & chủ đề.
  tags text[],
  category text,
  -- Meta SEO tuỳ chỉnh — để trống thì fallback sang title/excerpt.
  meta_title text,
  meta_description text,
  meta_keywords text[],
  -- Bài viết nổi bật.
  is_featured boolean not null default false,
  -- Chỉ bài `published` mới hiển thị công khai.
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  -- Số lượt xem (chỉ để thống kê — không ảnh hưởng SEO).
  view_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lọc theo trạng thái + sắp xếp theo thời gian đăng (index phủ 2 cột
-- phổ biến nhất của trang blog).
create index if not exists posts_status_published_idx
  on public.posts (status, published_at desc);

-- Tìm bài liên quan theo tag.
create index if not exists posts_tags_idx
  on public.posts using gin (tags);

-- Thêm cột cho database đã tồn tại (idempotent).
alter table public.posts add column if not exists og_image text;
alter table public.posts add column if not exists tags text[];
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists meta_title text;
alter table public.posts add column if not exists meta_description text;
alter table public.posts add column if not exists meta_keywords text[];
alter table public.posts add column if not exists is_featured boolean not null default false;
alter table public.posts add column if not exists status text not null default 'draft';
alter table public.posts add column if not exists view_count integer not null default 0;
alter table public.posts add column if not exists published_at timestamptz;

-- 3. Trigger cập nhật `updated_at`
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- 4. Trigger đồng bộ `published_at` với `status`
--
--   - chuyển sang `published` mà chưa có thời điểm đăng → lấy now().
--   - rút lại bản nháp → xoá thời điểm đăng.
--
-- Nhờ vậy admin không phải chọn ngày đăng thủ công.
create or replace function public.sync_post_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  elsif new.status <> 'published' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_sync_published_at on public.posts;
create trigger posts_sync_published_at
  before insert or update of status on public.posts
  for each row execute function public.sync_post_published_at();

-- 5. RLS
alter table public.posts enable row level security;

-- Công khai chỉ thấy bài đã đăng.
--
-- Bản nháp (`draft`) / lưu trữ (`archived`) là nội dung chưa hoàn thiện ⇒
-- KHÔNG được lộ ra công khai (cũng tránh bị Google index nháp).
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public"
  on public.posts for select
  to anon, authenticated
  using (status = 'published');

-- Admin đọc toàn bộ (kể cả bản nháp).
drop policy if exists "posts_select_admin" on public.posts;
create policy "posts_select_admin"
  on public.posts for select
  to authenticated
  using (public.is_admin_user());

-- Admin thêm / sửa / xoá.
drop policy if exists "posts_insert_admin" on public.posts;
create policy "posts_insert_admin"
  on public.posts for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "posts_update_admin" on public.posts;
create policy "posts_update_admin"
  on public.posts for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "posts_delete_admin" on public.posts;
create policy "posts_delete_admin"
  on public.posts for delete
  to authenticated
  using (public.is_admin_user());

-- 6. GRANT
--
-- Từ 30/10/2026, Supabase KHÔNG còn tự động grant quyền cho bảng mới ⇒
-- bảng không có GRANT sẽ trả về "permission denied for table ...".
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
