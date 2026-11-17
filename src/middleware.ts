import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Loại trừ các file/đường dẫn KHÔNG cần session:
     *   - tài nguyên tĩnh của Next.js
     *   - `/sitemap.xml`, `/robots.txt` → file cho Google Search Console.
     *     Middleware gọi Supabase Auth mỗi request; nếu Supabase chậm/lỗi thì
     *     route này có thể trả về trang lỗi HTML → GSC báo "sitemap có vẻ là
     *     một trang HTML". Bỏ qua middleware giúp sitemap luôn là XML hợp lệ.
     *   - `/api/google-verification` → file xác minh, cũng cần luôn trả text.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|api/google-verification|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
