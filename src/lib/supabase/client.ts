import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

/**
 * Publishable key (khuyến nghị mới của Supabase) hoặc anon key (cũ).
 *
 * Supabase đang chuyển từ `anon` key sang `publishable` key. Hỗ trợ cả hai
 * để không bị gãy khi đổi tên biến môi trường.
 */
export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && getSupabasePublishableKey(),
  );
}

/** Browser client (Client Components). Requires public env vars. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = getSupabasePublishableKey()!;
  return createBrowserClient<Database>(url, key);
}
