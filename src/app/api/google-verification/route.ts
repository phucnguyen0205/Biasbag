/**
 * Route phục vụ file xác minh Google Search Console.
 *
 * Google yêu cầu file HTML tên dạng `google<token>.html` ở thư mục gốc, nội
 * dung là chuỗi `google-site-verification: <token>`.
 *
 * Thay vì phải copy file vào `public/` rồi commit từng lần đổi token, ta
 * dùng `rewrite` trong `next.config.ts` để mọi request có dạng
 * `/google<token>.html` đều được ánh xạ về route này. Token lấy từ biến môi
 * trường `GOOGLE_SITE_VERIFICATION` → chỉ cần set env là xác minh được, không
 * cần build lại code.
 *
 * Nếu biến chưa được set, route trả 404 — an toàn (không lộ token).
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.GOOGLE_SITE_VERIFICATION?.trim();

  if (!token) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(`google-site-verification: ${token}`, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
