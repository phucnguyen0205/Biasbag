-- BIAS BAG — banner riêng cho giao diện MOBILE.
--
-- Thêm cột `banners.image_url_mobile`:
--   - NULL            → dùng chung `image_url` (hành vi mặc định).
--   - có URL          → hero trên màn hình dọc dùng ảnh này.
--
-- Toàn bộ câu lệnh idempotent → chạy lại nhiều lần vẫn an toàn.
-- =============================================

alter table public.banners
  add column if not exists image_url_mobile text;

-- Ràng buộc nhẹ: nếu có ảnh mobile thì phải là URL hợp lệ
-- (bắt đầu bằng http://, https:// hoặc /).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'banners_mobile_url_check'
  ) then
    alter table public.banners
      add constraint banners_mobile_url_check
      check (
        image_url_mobile is null
        or image_url_mobile ~ '^(https?://|/)'
      );
  end if;
end $$;
