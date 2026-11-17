-- BIAS BAG — hoàn thiện chức năng thanh toán đơn hàng.
--
-- Thêm:
--   1. Mã đơn dễ đọc (`order_code`) → khách tra cứu đơn không cần đăng nhập.
--   2. Tách cơ cấu giá (`subtotal`, `shipping_fee`) → `total` luôn =
--      subtotal + shipping_fee, khớp với những gì khách nhìn thấy.
--   3. `payment_status` tách khỏi `status` (status = hàng đi đâu,
--      payment_status = đã thu tiền chưa).
--   4. Hàm trừ/hoàn tồn kho NGUYÊN TỬ → không còn bán vượt tồn kho.
--   5. Hàm sinh mã đơn duy nhất, tăng dần.
--
-- Toàn bộ câu lệnh đều idempotent → chạy lại nhiều lần vẫn an toàn.
-- =============================================

-- 1. Cột mới cho bảng `orders`
alter table public.orders add column if not exists order_code text;
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists subtotal numeric(12,0) not null default 0;
alter table public.orders add column if not exists shipping_fee numeric(12,0) not null default 0;

-- Ràng buộc tập giá trị cho `payment_status`.
-- Postgres không có `add constraint if not exists` → dùng DO block.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_payment_status_check'
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('unpaid', 'paid', 'refunded'));
  end if;
end $$;

-- Mã đơn phải duy nhất. Partial index vì đơn cũ (trước khi có cột) có NULL.
create unique index if not exists orders_order_code_idx
  on public.orders(order_code)
  where order_code is not null;

-- Tạo mã đơn cho các đơn cũ chưa có mã (sinh từ id + ngày tạo).
update public.orders
   set order_code = 'BB-' || to_char(created_at, 'YYMMDD') || '-' ||
       upper(substr(replace(id::text, '-', ''), 1, 4))
 where order_code is null;

-- 2. Sequence + hàm sinh mã đơn
--
-- Mã đơn cần DUY NHẤT và tăng dần (để admin tra cứu dễ). Nếu sinh ở tầng
-- ứng dụng thì 2 đơn song song có thể trùng → phải retry. Ở đây sequence
-- của Postgres đảm bảo duy nhất ngay trong 1 câu lệnh.
create sequence if not exists public.order_code_seq start 1;

create or replace function public.next_order_code()
returns text
language sql
volatile
security definer set search_path = public
as $$
  select 'BB-' || to_char(now(), 'YYMMDD') || '-' ||
         lpad(nextval('public.order_code_seq')::text, 6, '0')
$$;

revoke execute on function public.next_order_code() from public;
grant execute on function public.next_order_code() to service_role;

-- 3. Trừ tồn kho NGUYÊN TỬ
--
-- VÌ SAO CẦN HÀM NÀY (thay vì đọc rồi ghi):
--   Mã cũ đọc `stock` trước rồi `update stock = stock - qty` → nếu 2 khách
--   đặt hàng cùng lúc với tồn kho = 1 thì CẢ HAI đều thấy stock = 1 và đều
--   ghi stock = 0 → bán vượt tồn kho (oversell).
--
-- Ở đây điều kiện `stock >= p_quantity` nằm TRONG cùng câu UPDATE → Postgres
-- khoá dòng và đánh giá lại điều kiện sau khi khóa → chỉ một giao dịch
-- thắng, giao dịch còn lại trả về `false` (không đủ hàng).
--
-- Đồng thời cập nhật `in_stock` để sản phẩm hết hàng tự ẩn khỏi lọc.
create or replace function public.decrement_product_stock(
  p_product_id uuid,
  p_quantity integer
)
returns boolean
language plpgsql
volatile
security definer set search_path = public
as $$
declare
  v_new_stock integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    return false;
  end if;

  update public.products
     set stock = stock - p_quantity,
         in_stock = (stock - p_quantity) > 0
   where id = p_product_id
     and is_active = true
     and stock >= p_quantity
  returning stock into v_new_stock;

  -- Không có dòng nào được update → không đủ hàng / sản phẩm không hợp lệ.
  if v_new_stock is null then
    return false;
  end if;

  return true;
end;
$$;

revoke execute on function public.decrement_product_stock(uuid, integer) from public;
grant execute on function public.decrement_product_stock(uuid, integer) to service_role;

-- 4. Hoàn lại tồn kho khi đơn bị huỷ (admin bấm "Đã hủy").
--
-- Dùng `greatest(stock + qty, 0)` để không bao giờ có stock âm.
create or replace function public.restore_product_stock(
  p_product_id uuid,
  p_quantity integer
)
returns boolean
language plpgsql
volatile
security definer set search_path = public
as $$
begin
  if p_product_id is null or p_quantity is null or p_quantity <= 0 then
    return false;
  end if;

  update public.products
     set stock = greatest(stock + p_quantity, 0),
         in_stock = true
   where id = p_product_id;

  return found;
end;
$$;

revoke execute on function public.restore_product_stock(uuid, integer) from public;
grant execute on function public.restore_product_stock(uuid, integer) to service_role;
