-- =============================================
-- BIAS BAG — Dữ liệu mẫu (seed)
--
-- Chạy SAU khi `supabase/schema.sql` đã tạo bảng.
--
--   - Tự động:  `npm run db:push` (gọi `supabase db push --include-seed`)
--   - Thủ công: dán vào Supabase Dashboard > SQL Editor
--
-- Script này IDEMPOTENT — chạy nhiều lần không tạo bản ghi trùng.
--
-- Lưu ý: dữ liệu mẫu KHÔNG ghi đè dữ liệu đã có. Admin có thể sửa/xoá
-- trong /admin mà không bị ghi đè khi seed chạy lại.
-- =============================================

-- ---------------------------------------------------------------
-- 1. Danh mục sản phẩm
-- ---------------------------------------------------------------
insert into public.categories (name, slug, description, image_url) values
  ('Túi Tote K-Pop', 'tui-tote-kpop', 'In hình idol, nhóm nhạc, concert — BTS, BLACKPINK, Jungkook',
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600'),
  ('Túi Tote Logo', 'tui-tote-logo', 'Thương hiệu, câu slogan, logo nổi tiếng',
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600'),
  ('Túi Tote Địa Điểm', 'tui-tote-dia-diem', 'Đà Nẵng, Hội An, phố cổ — Việt Nam trong từng hình thêu',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600'),
  ('Túi Tote Tối Giản', 'tui-tote-toi-gian', 'Trắng, đen, in đơn sắc — mẫu mã an toàn cho mọi outfit',
    'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=600'),
  ('Túi Tote Y2K', 'tui-tote-y2k', 'Họa tiết trendy, màu sắc Y2K đầy cá tính',
    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------
-- 2. Sản phẩm
--
-- `on conflict (slug) do nothing` → không ghi đè sản phẩm đã chỉnh sửa.
-- ---------------------------------------------------------------
insert into public.products
  (name, slug, description, price, sale_price, image_url, images, category_id, brand, material, color, size, features, stock, in_stock, is_active, is_featured, rating, review_count)
select
  v.name, v.slug, v.description, v.price, v.sale_price, v.image_url, v.images,
  c.id, 'BIAS BAG', v.material, v.color, v.size, v.features, v.stock, v.stock > 0, true, v.is_featured, v.rating, v.review_count
from (values
  ('Túi Tote Canvas Hàn Quốc — Dây Khoang Dài','tui-tote-canvas-han-quoc-day-khoang-dai',
   'Túi tote canvas dệt thô với dây khoang dài, đựng vừa một cuốn sổ A4 và vài món đồ. Chất liệu dày dặn, đường may chắc, phù hợp đi học, đi làm và làm phụ kiện thời trang.',
   320000,249000,'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
   array['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1200','https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=1200'],
   'tui-tote-toi-gian','Canvas dệt thô','Be','38 x 42 x 12 cm',
   array['Chất liệu canvas dày, chịu lực tốt','Dây khoang dài đeo vai hoặc đeo chéo','Ngăn trong lớp lót vải','Logo thêu dập nổi mặt trước'],
   42,true,4.8,186),

  ('Túi Xách Mini Da Trơn Màu Nâu','tui-xach-mini-da-tron-mau-nau',
   'Túi xách mini bằng da tổng hợp mặt trơn, đường viền sạch và khóa kim loại màu vàng champagne. Kích thước nhỏ gọn vừa điện thoại, ví, son và chìa khóa — dễ dàng kết hợp với váy liền hoặc blazer.',
   450000,null,'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
   array['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200','https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200'],
   'tui-tote-logo','Da tổng hợp cao cấp','Nâu','22 x 15 x 8 cm',
   array['Mặt da trơn không in hoa văn','Khóa kim loại champagne','Kèm dây xích đeo vai tháo rời','Lót trong vải satin'],
   28,true,4.7,143),

  ('Túi Đeo Vai Nữ Soft Shell Olive','tui-deo-vai-nu-soft-shell-olive',
   'Túi đeo vai chất liệu soft shell mềm mại, form dáng ôm vai giúp tạo cảm giác gọn gàng. Dây quai rộng giảm tải trọng lượng khi đeo lâu. Màu olive dễ phối cùng trang phục màu trung tính.',
   390000,329000,'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800',
   array['https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=1200','https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1200'],
   'tui-tote-kpop','Soft shell','Olive','30 x 24 x 13 cm',
   array['Chất liệu mềm không bị xé','Quai vai rộng, giảm tải trọng lượng','Ngăn chính có đường khóa kéo','Phù hợp đi học, đi làm, đi dạo phố'],
   35,true,4.6,97),

  ('Balo Laptop 15.6 inch Water Resistant','balo-laptop-156-inch-water-resistant',
   'Balô công nghệ chống nước với ngăn riêng cho laptop 15.6 inch, ngăn chống sốc phía trước và cổng USB sạc nhanh. Thiết kế gọn gàng nhưng sức chứa lớn, chuyên dụng cho học sinh, sinh viên và người đi làm.',
   590000,469000,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
   array['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200','https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=1200'],
   'tui-tote-y2k','Polyester chống nước','Đen','30 x 45 x 15 cm',
   array['Ngăn riêng laptop 15.6 inch','Vải chống nước và chống xước','Cổng USB sạc nhanh','Lưng êm, dây đệm thoáng khí'],
   51,true,4.9,264),

  ('Túi Xách Tròn Dáng Tròn Canvas Trắng','tui-xach-tron-dang-tron-canvas-trang',
   'Túi xách dáng tròn đặc trưng, dễ phối và tạo điểm nhấn cho bộ đồ tối giản. Chất liệu canvas trắng dễ vệ sinh, khóa kéo dài cho dễ mở. Mẫu túi được giới trẻ yêu thích nhờ kiểu dáng trẻ trung.',
   290000,null,'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800',
   array['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=1200'],
   'tui-tote-toi-gian','Canvas','Trắng','26 x 26 x 8 cm',
   array['Dáng tròn cá tính','Khóa kéo dài dễ mở','Canvas dễ vệ sinh','Dây đeo da tháo rời'],
   19,false,4.5,78),

  ('Túi Tote Vải Nỉ Nữ Dây Xách Nâng','tui-tote-vai-ni-nu-day-xach-nang',
   'Túi tote vải nỉ dày dặn với dây xách nâng gọn gàng, nữ tính và thanh lịch. Vải nỉ giữ form đẹp, không nhăn, phù hợp đi làm và các buổi gặp gỡ nhẹ nhàng.',
   360000,289000,'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800',
   array['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1200'],
   'tui-tote-toi-gian','Vải nỉ','Xám','36 x 30 x 12 cm',
   array['Vải nỉ giữ form, không nhăn','Dây xách nâng gọn gàng','Lót trong canvas','Nhẹ, dễ mang'],
   0,false,4.4,52),

  ('Túi Đeo Vai Nữ Da Nâu Cognac','tui-deo-vai-nu-da-nau-cognac',
   'Túi đeo vai bằng da cognac tông nâu ấm, phom dáng mềm và bo tròn. Quai da điệu giả, khóa bấm chắc chắn — thiết kế tối giản nhưng vẫn có điểm nhấn riêng.',
   520000,null,'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
   array['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200'],
   'tui-tote-dia-diem','Da cognac','Cognac','25 x 18 x 9 cm',
   array['Da cognac tự nhiên','Quai da điệu giả','Khóa bấm chắc chắn','Form mềm bo tròn'],
   16,false,4.7,61),

  ('Cặp Tote Laptop 14 inch Da Grainy','cap-tote-laptop-14-inch-da-grainy',
   'Cặp tote da grainy với ngăn laptop 14 inch, thiết kế thanh lịch cho môi trường văn phòng. Tay cầm da cầm chắc tay, đáy tăng cường giúp chứa nhiều mà vẫn giữ dáng đẹp.',
   780000,649000,'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800',
   array['https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=1200'],
   'tui-tote-logo','Da grainy','Nâu đậm','38 x 30 x 12 cm',
   array['Ngăn laptop 14 inch','Đáy tăng cường giữ dáng','Tay cầm da êm tay','Khoá da bấm chắc chắn'],
   9,false,4.8,34)
) as v(name, slug, description, price, sale_price, image_url, images, category_slug, material, color, size, features, stock, is_featured, rating, review_count)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- ---------------------------------------------------------------
-- 3. Banner trang chủ
--
-- Ảnh nằm trong `public/banners/` (đã tối ưu). Admin có thể thêm / sửa /
-- ẩn / xoá / đổi thứ tại tại /admin/banners.
--
-- Bảng `banners` không có unique constraint → dùng `where not exists`
-- để tránh chèn trùng khi seed chạy lại (so theo image_url + sort_order).
-- ---------------------------------------------------------------
insert into public.banners (image_url, alt_text, sort_order, is_active)
select v.image_url, v.alt_text, v.sort_order, v.is_active
from (values
  ('/banners/banner-1.webp', 'Túi xách BIAS BAG — phụ kiện nhỏ, phong cách riêng', 0, true),
  ('/banners/banner-2.webp', 'Bộ sưu tập túi xách thời trang BIAS BAG', 1, true),
  ('/banners/banner-3.webp', 'Túi tote canvas cho học sinh, sinh viên', 2, true),
  ('/banners/banner-4.webp', 'Túi đeo vai và balo BIAS BAG cho giới trẻ', 3, true)
) as v(image_url, alt_text, sort_order, is_active)
where not exists (
  select 1 from public.banners b
  where b.image_url = v.image_url and b.sort_order = v.sort_order
);

-- ---------------------------------------------------------------
-- 4. Bài viết (blog)
-- ---------------------------------------------------------------
-- Bài viết do admin quản lý tại /admin/posts. Script này chỉ tạo bài mẫu
-- (để website có nội dung ngay khi cài đặt) — không ghi đè bài đã có.
--
-- `slug` có UNIQUE constraint → dùng `where not exists` theo slug để seed
-- chạy lại không tạo trùng.
-- ---------------------------------------------------------------
insert into public.posts
  (title, slug, excerpt, content, category, tags, meta_title, meta_description, status, is_featured, published_at)
select v.title, v.slug, v.excerpt, v.content, v.category, v.tags,
       v.meta_title, v.meta_description, 'published', v.is_featured, v.published_at::timestamptz
   from (values
  (
    'Cách phối màu túi tote theo dáng người',
    'cach-phan-mau-tui-tote-theo-dang-nguoi',
    'Túi tote không chỉ là phụ kiện đi theo — màu sắc của chiếc túi còn giúp tôn lên tổng thể outfit của bạn.',
    '<p>Túi tote không chỉ là phụ kiện đi theo — màu sắc của chiếc túi còn giúp tôn lên tổng thể outfit của bạn. Chọn đúng màu túi là cách nhanh nhất để bộ đồ trông "có chủ đề" hơn mà không tốn thêm một món đồ nào.</p>
<h2>Bắt đầu từ tông áo</h2>
<p>Quy tắc đơn giản nhất: chọn túi đối lập hoặc tương phản với tông áo đang mặc. Áo trắng, quần denim đậm thì túi be hoặc nâu là lựa chọn an toàn và tôn dáng.</p>
<ul>
<li>Outfit tối giản (đen, trắng, xám) → túi màu nổi bật làm điểm nhấn.</li>
<li>Outfit nhiều màu → túi trung tính để không gây rối mắt.</li>
<li>Outfit đơn sắc → túi cùng tông tạo cảm giác đồng bộ, cao cấp.</li>
</ul>
<h2>Chú ý kích thước túi so với vai</h2>
<p>Túi nhỏ hơn vai một chút, treo vừa ngang hông là tỉ lệ đẹp nhất. Túi quá lớn sẽ khiến dáng người bị "bị nuốt", còn túi quá nhỏ lại khó đựng đồ.</p>
<blockquote>Chiếc túi tốt không lấn át bạn, mà khiến bạn nổi bật hơn.</blockquote>
<h2>Mẹo nhỏ</h2>
<p>Thử đeo túi ở ba tư thế khác nhau: đeo vai, đeo chéo và cầm tay. Loại túi hợp với bạn là loại bạn vẫn thấy thoải mái ở cả ba tư thế — không phải loại đẹp nhất trong ảnh.</p>',
    'Phong cách',
    array['phối đồ', 'túi tote'],
    'Cách phối màu túi tote theo dáng người',
    'Hướng dẫn phối màu túi tote theo tông áo, kích thước túi so với vai và cách chọn màu an toàn cho giới trẻ.',
    true,
    '2026-01-15T08:00:00+07'
  ),
  (
    'Bảo quản túi canvas đúng cách để dùng lâu hơn',
    'bao-quan-tui-canvas-theo-dung-cach',
    'Canvas dệt thô bền, nhưng cách giặt và bảo quản sai có thể khiến vải nhanh xù, mất form.',
    '<p>Canvas dệt thô bền, nhưng cách giặt và bảo quản sai có thể khiến vải nhanh xù, mất form dáng sau vài lần sử dụng. Một chiếc túi được giữ đúng cách có thể dùng cả năm.</p>
<h2>Giặt đúng cách</h2>
<ul>
<li>Lội ngược mặt in, tắt chế độ vắt — vắt mạnh làm nét thêu và hình in bị nhăn.</li>
<li>Dùng nước lạnh và xà phòng nhẹ, không dùng thuốc tẩy mạnh.</li>
<li>Phơi nơi thoáng gió, tránh nắng trực tiếp để màu không bạc.</li>
</ul>
<h2>Vệ sinh vết bẩn thường gặp</h2>
<p>Giặt tay bằng xà phòng pha loãng và dùng bàn chải mềm chà nhẹ. Với vết mực, xử lý từ mép vết vào trong để không lan ra nền vải.</p>
<h2>Làm phẳng lại form túi</h2>
<p>Vuốt tay dọc theo sợi vải khi túi còn ẩm, hoặc treo túi ở nơi có gió để vải tự căng. Không dùng bàn ủi nóng trực tiếp lên bề mặt in.</p>
<blockquote>Để túi khô tự nhiên là cách bảo quản canvas tốt nhất mà không tốn thêm một đồng nào.</blockquote>',
    'Hướng dẫn',
    array['bảo quản', 'canvas'],
    'Bảo quản túi canvas đúng cách',
    'Cách giặt, vệ sinh vết bẩn và phơi khô túi canvas để giữ form dáng và màu sắc lâu dài.',
    true,
    '2026-01-08T08:00:00+07'
  ),
  (
    'Một chiếc túi tote đi học, đi làm và đi chơi',
    'tui-tote-mua-hoc-kien-va-lam-viec',
    'Túi tote size vừa phải, chất liệu dày, có ngăn riêng cho laptop và sổ vở là người bạn đồng hành đáng tin.',
    '<p>Túi tote size vừa phải, chất liệu dày, có ngăn riêng cho laptop và sổ vở là người bạn đồng hành đáng tin mỗi ngày.</p>
<h2>Kích thước nào vừa?</h2>
<p>Chiếc túi 38 x 42 cm đựng vừa một cuốn sổ A4, một chiếc laptop 14 inch và vài món đồ cá nhân. Đây là kích thước dùng được nhiều nhất cho học sinh, sinh viên và người làm văn phòng.</p>
<h2>Đừng quên dây khoang</h2>
<p>Dây khoang dài cho phép đeo vai hoặc đeo chéo. Với dây dài, túi nằm gọn trên hông, tay bạn hoàn toàn tự do — rất tiện khi đang cầm cà phê hoặc cầm điện thoại.</p>
<h2>Chọn chất liệu</h2>
<p>Canvas dệt thô dày hơn canvas mỏng, chịu lực tốt hơn nhiều. Nếu bạn thường xuyên đựng laptop hoặc đồ nặng, nên chọn loại có đáy gia cố.</p>
<blockquote>Chiếc túi tốt là chiếc túi bạn không phải nghĩ nhiều mỗi khi ra khỏi nhà.</blockquote>',
    'Hướng dẫn',
    array['mẹo chọn túi', 'túi tote'],
    'Một chiếc túi tote đi học, đi làm và đi chơi',
    'Chọn kích thước, chất liệu và dây khoang cho túi tote đa dụng dùng hàng ngày.',
    false,
    '2025-12-20T08:00:00+07'
  )
) as v(title, slug, excerpt, content, category, tags, meta_title, meta_description, is_featured, published_at)
where not exists (
  select 1 from public.posts p where p.slug = v.slug
);
