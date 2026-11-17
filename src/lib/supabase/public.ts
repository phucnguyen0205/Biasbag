import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getSupabasePublishableKey, isSupabaseConfigured } from "./client";

/**
 * Thời gian cache (giây) cho truy vấn public.
 *
 * Khớp với `export const revalidate = 300` ở trang chủ → khi admin cập nhật
 * sản phẩm, `revalidatePath("/")` trong Server Action sẽ xoá cache này.
 */
export const PUBLIC_CACHE_SECONDS = 300;

/**
 * Tag cho cache Data của các truy vấn public.
 *
 * Khi admin sửa sản phẩm/danh mục/banner, Server Action gọi
 * `revalidateTag(PUBLIC_CACHE_TAG)` để xoá ngay response PostgREST đã cache
 * — không phải chờ hết 5 phút revalidate.
 */
export const PUBLIC_CACHE_TAG = "supabase-public";

/**
 * Supabase client cho các truy vấn CÔNG KHAI (không cần đăng nhập).
 *
 * Vì sao cần client riêng?
 *
 * `createClient()` trong `server.ts` gọi `await cookies()` để đọc session.
 * Trong Next.js App Router, chỉ cần chạm vào `cookies()` là route đó trở
 * thành **dynamic** → không bao giờ được cache tĩnh, mỗi lượt truy cập
 * đều phải:
 *   1. chạy middleware (verify JWT),
 *   2. render server component trên server,
 *   3. gọi Supabase từ server.
 *
 * Trang chủ chỉ cần dữ liệu PUBLIC (sản phẩm, danh mục, banner) — RLS đã
 * cho phép `anon` đọc. Dùng client này giúp trang chủ render **tĩnh** (ISR),
 * phục vụ từ CDN → TTFB gần như tức thì và LCP không phụ thuộc độ trễ DB.
 *
 * Client này KHÔNG đọc/ghi cookie nên không làm route chuyển sang dynamic.
 *
 * ⚠️ Chỉ dùng cho dữ liệu public. Mọi truy vấn cần session (đơn hàng của
 * user, hồ sơ, quản trị) PHẢI dùng `createClient()` có cookie.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = getSupabasePublishableKey()!;

  return createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      /**
       * Gắn `next.revalidate` vào mọi request → Next.js cache response
       * PostgREST trong Data Cache thay vì fetch lại từ Supabase mỗi lần
       * re-render. Đây là phần "thuật toán" giảm độ trễ cho LCP.
       *
       * `next.tags` cho phép invalidate theo tag khi admin sửa dữ liệu.
       */
      fetch: (input, init) => {
        const nextInit = (init ?? {}) as RequestInit & {
          next?: { revalidate?: number; tags?: string[] };
        };
        return fetch(input, {
          ...nextInit,
          next: {
            revalidate: PUBLIC_CACHE_SECONDS,
            tags: [PUBLIC_CACHE_TAG],
            ...nextInit.next,
          },
        });
      },
    },
  });
}

/** `true` khi có thể dùng client public (đã cấu hình Supabase). */
export function isPublicClientReady() {
  return isSupabaseConfigured();
}
