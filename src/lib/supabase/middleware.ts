import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";
import { getSupabasePublishableKey } from "./client";
import { REMEMBER_COOKIE, applyRemember, readRemember } from "./session";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = getSupabasePublishableKey();
  if (!url || !key) return response;

  // Lựa chọn "ghi nhớ đăng nhập" của người dùng.
  //
  // Phải đọc ở đây (không chỉ ở Server Action) vì khi access token hết hạn,
  // middleware refresh token và ghi lại cookie — nếu không áp dụng lựa chọn này,
  // cookie phiên sẽ bị "đánh bóng" thành cookie dài hạn.
  const remember = readRemember(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(
            name,
            value,
            applyRemember(options, remember) as {
              path?: string;
              sameSite?: "lax" | "strict" | "none";
              httpOnly?: boolean;
              maxAge?: number;
              domain?: string;
              secure?: boolean;
              priority?: "low" | "medium" | "high";
            },
          ),
        );
      },
    },
  });

  // Xác thực session và refresh token nếu hết hạn.
  //
  // Dùng `getClaims()` thay vì `getUser()`:
  //   - `getClaims()` verify JWT cục bộ bằng JWKS (không gọi network về Auth
  //     server) → nhanh hơn đáng kể vì middleware chạy trên MỌI request.
  //   - `getUser()` gọi network mỗi lần → độ trễ thêm cho mọi route.
  //
  // `getClaims()` tự refresh session khi token hết hạn và ghi cookie mới
  // qua `setAll` ở trên.
  const {
    data,
    error: claimsError,
  } = await supabase.auth.getClaims();

  // `sub` là user id (UUID) trong access token.
  // `data` có thể `null` khi không có session hoặc token không hợp lệ.
  const userId = data?.claims?.sub ?? null;

  if (claimsError && !userId) {
    // Token hỏng / hết hạn không refresh được → coi như chưa đăng nhập.
    console.warn("[middleware] getClaims error:", claimsError.message);
  }

  const { pathname } = request.nextUrl;

  // Chưa đăng nhập → chuyển tới trang login.
  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/account")) &&
    !userId
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Đã đăng nhập nhưng không có quyền quản trị → về trang chủ.
  if (pathname.startsWith("/admin") && userId) {
    const role = await fetchRole(supabase, userId);
    if (role !== "admin" && role !== "staff") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("error", "forbidden");
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Đã đăng nhập rồi thì không hiện trang login nữa.
  //
  // Admin/staff về `/admin`, khách về `/account` — đúng nơi họ cần đến.
  if ((pathname === "/login" || pathname === "/register") && userId) {
    const role = await fetchRole(supabase, userId);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      role === "admin" || role === "staff" ? "/admin" : "/account";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/**
 * Đọc role của user. Trả về null nếu bảng `profiles` chưa được tạo
 * (schema chưa chạy) — khi đó tạm coi như chưa có quyền admin.
 */
async function fetchRole(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    return data?.role ?? null;
  } catch {
    return null;
  }
}
