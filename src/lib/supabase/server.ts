import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { getSupabasePublishableKey, isSupabaseConfigured } from "./client";
import { REMEMBER_COOKIE, applyRemember, readRemember } from "./session";

/**
 * Server client (Server Components / Route Handlers / Server Actions).
 * Next.js 15: `cookies()` là async.
 *
 * Cookie auth được ghi với `maxAge` mặc định của @supabase/ssr (400 ngày).
 * Nếu người dùng chọn "không ghi nhớ đăng nhập", ta bỏ `maxAge` để cookie
 * chỉ sống trong phiên trình duyệt — xem `src/lib/supabase/session.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Đọc lựa chọn "ghi nhớ đăng nhập" trước khi tạo client.
  const remember = readRemember(cookieStore.get(REMEMBER_COOKIE)?.value);

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
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
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    },
  );
}

/** Server client that bypasses RLS (service role). Use only in trusted server code. */
export async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export { isSupabaseConfigured, getSupabasePublishableKey };
