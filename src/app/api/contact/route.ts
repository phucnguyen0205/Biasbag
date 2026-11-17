import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const contactSchema = z.object({
  name: z.string().min(2, "Vui lòng nhập họ tên"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().max(20).optional(),
  subject: z.string().max(120).optional(),
  message: z.string().min(10, "Vui lòng nhập nội dung (tối thiểu 10 ký tự)"),
});

/**
 * Rate limiting in-memory.
 *
 * Mỗi IP chỉ được gửi tối đa 3 tin nhắn trong 10 phút. Dùng Map trong bộ
 * nhớ của server — đủ để chặn spam cơ bản. Với deployment nhiều instance,
 * nên chuyển sang Redis / Upstash để có rate limit dùng chung.
 */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { message: "Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau ít phút." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin.",
      },
      { status: 400 },
    );
  }

  const d = parsed.data;

  if (!isSupabaseConfigured()) {
    // Chế độ demo: không lưu được, nhưng vẫn báo thành công để khách
    // không bị chặn bởi việc chưa cấu hình backend.
    console.warn("[contact] Chưa cấu hình Supabase — bỏ qua lưu tin nhắn.");
    return NextResponse.json({
      message:
        "Đã gửi! (Chế độ demo — chưa kết nối cơ sở dữ liệu. Vui lòng liên hệ hotline nếu cần phản hồi nhanh.)",
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: d.name,
    email: d.email,
    phone: d.phone ?? null,
    subject: d.subject ?? null,
    message: d.message,
    status: "new",
  });

  if (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Đã gửi! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.",
  });
}
