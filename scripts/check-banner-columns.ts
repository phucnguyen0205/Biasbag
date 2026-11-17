/**
 * Kiểm tra nhanh các cột của bảng `banners` trên Supabase.
 *
 * Dùng khi DB chưa có RPC `exec_sql` (không chạy được DDL từ code) —
 * để biết migration đã áp dụng hay chưa.
 *
 * Chạy: npx tsx scripts/check-banner-columns.ts
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  try {
    const content = readFileSync(join(ROOT, ".env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnv();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("✗ Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from("banners").select("*").limit(1);
  if (error) {
    console.error("✗ Lỗi đọc bảng banners:", error.message);
    process.exit(1);
  }

  const row = (data ?? [])[0];
  if (!row) {
    console.log("• Bảng banners trống — không lấy được mẫu để xem cột.");
  } else {
    console.log("• Các cột hiện có trong bảng banners:");
    for (const key of Object.keys(row)) console.log(`   - ${key}`);
  }

  const hasMobile = row && "image_url_mobile" in row;
  console.log(
    hasMobile
      ? "\n✓ Đã có cột image_url_mobile."
      : "\n✗ CHƯA có cột image_url_mobile — cần chạy migration.",
  );
}

main();
