/**
 * Kiểm tra cấu hình môi trường Supabase.
 *
 * Chạy: npm run check:env
 *
 * Kiểm tra:
 *   1. Các biến môi trường bắt buộc có tồn tại và không rỗng
 *   2. Project URL đúng định dạng Supabase (không kèm /rest/v1/)
 *   3. Kết nối được tới Supabase (dùng anon key — publishable key)
 *   4. Các bảng cần thiết đã tồn tại trong database
 *   5. Bucket Storage `product-images` đã được tạo
 */

import { createClient } from "@supabase/supabase-js";

const TABLES = [
  "categories",
  "products",
  "orders",
  "order_items",
  "profiles",
  "contact_messages",
  "banners",
];

const BUCKET = "product-images";

let failures = 0;

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg: string) {
  failures += 1;
  console.log(`  ✗ ${msg}`);
}

async function main() {
  console.log("\n=== 1. Biến môi trường ===");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL chưa được đặt");
  else ok("NEXT_PUBLIC_SUPABASE_URL đã đặt");

  if (!publishableKey) {
    fail(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY chưa được đặt " +
        "(hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY nếu dùng tên cũ)",
    );
  } else ok("Publishable key đã đặt");

  if (!serviceKey)
    console.log(
      "  ! SUPABASE_SERVICE_ROLE_KEY chưa đặt (chỉ cần cho script seed:images)",
    );
  else ok("SUPABASE_SERVICE_ROLE_KEY đã đặt");

  console.log("\n=== 2. Định dạng Project URL ===");

  if (url) {
    // Đúng: https://<ref>.supabase.co
    const valid = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url);
    if (valid) {
      ok(`URL đúng định dạng: ${url}`);
    } else {
      fail(`URL sai định dạng: "${url}"`);
      if (url.includes("/rest/v1")) {
        console.log(
          "     → Project URL phải KHÔNG kèm /rest/v1/ (đó là endpoint REST, không phải URL gốc)",
        );
      }
      if (url.endsWith("/")) {
        console.log("     → Bỏ dấu / ở cuối URL");
      }
      console.log(
        "     → Lấy đúng giá trị tại Project Settings → API → Project URL",
      );
    }

    // Phát hiện khoảng trắng thừa (dễ gây lỗi khó hiểu).
    if (process.env.NEXT_PUBLIC_SUPABASE_URL !== url) {
      fail("NEXT_PUBLIC_SUPABASE_URL có khoảng trắng thừa ở đầu/cuối");
    }
    if (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== publishableKey &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== publishableKey
    ) {
      fail("Publishable key có khoảng trắng thừa ở đầu/cuối");
    }
  }

  console.log("\n=== 3. Kết nối Supabase ===");

  let supabase: ReturnType<typeof createClient> | null = null;

  if (!url || !publishableKey) {
    console.log("  – Bỏ qua (thiếu cấu hình)");
  } else {
    supabase = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.from("categories").select("id").limit(1);
    if (error) {
      fail(`Không kết nối được: ${error.message}`);
    } else {
      ok("Kết nối thành công (bảng `categories` truy vấn được)");
    }
  }

  console.log("\n=== 4. Bảng trong database ===");

  if (supabase) {
    for (const table of TABLES) {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        fail(`Bảng \`${table}\`: ${error.message}`);
      } else {
        ok(`Bảng \`${table}\``);
      }
    }
  } else {
    console.log("  – Bỏ qua (không kết nối được)");
  }

  console.log("\n=== 5. Grant cho Data API (anon/authenticated) ===");

  if (supabase) {
    // Bảng chỉ admin thao tác vẫn cần grant cho `authenticated` — RLS mới là
    // lớp phân quyền thực sự. Không có grant → lỗi 42501 permission denied.
    //
    // Chỉ kiểm tra được quyền SELECT qua Data API (các quyền khác cần ghi
    // dữ liệu thật để kiểm chứng — xem supabase/schema.sql cho policy đầy đủ).
    const EXPECTED_READ: { table: string; role: "anon" | "authenticated" }[] = [
      { table: "categories", role: "anon" },
      { table: "products", role: "anon" },
      { table: "banners", role: "anon" },
      { table: "orders", role: "authenticated" },
      { table: "order_items", role: "authenticated" },
      { table: "profiles", role: "authenticated" },
      { table: "contact_messages", role: "authenticated" },
    ];

    for (const { table, role } of EXPECTED_READ) {
      const { error } = await supabase.from(table).select("*").limit(1);

      // `permission denied` = thiếu GRANT. Lỗi khác (bảng rỗng, RLS) = OK.
      if (error?.code === "42501" || error?.message.includes("permission denied")) {
        fail(`${role} → SELECT ${table}: thiếu GRANT`);
      } else {
        ok(`${role} → SELECT ${table}`);
      }
    }
  } else {
    console.log("  – Bỏ qua (không kết nối được)");
  }

  console.log("\n=== 6. Storage bucket ===");

  if (supabase) {
    const { data, error } = await supabase.storage.getBucket(BUCKET);
    if (error) {
      fail(`Bucket \`${BUCKET}\`: ${error.message}`);
      // "Bucket not found" thường KHÔNG phải bucket thiếu — mà là RLS trên
      // `storage.buckets` chặn không cho đọc. Thêm gợi ý cụ thể.
      if (/not found/i.test(error.message)) {
        console.log(
          "     → Có thể thiếu policy đọc `storage.buckets`.\n" +
            "       Chạy lại: npm run db:push -- --method api",
        );
      }
    } else if (data) {
      ok(`Bucket \`${BUCKET}\` (public: ${data.public})`);
    }

    // Kiểm tra upload/xoá ảnh hoạt động (admin mới được).
    // Chỉ kiểm tra được với service role key — không kiểm tra được thì bỏ qua.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (serviceKey) {
      const admin = createClient(url!, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const probe = `${BUCKET}/.healthcheck-${Date.now()}.txt`;
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(probe, new Blob(["ok"], { type: "text/plain" }), {
          upsert: true,
        });

      if (upErr) {
        fail(`Upload thử vào bucket \`${BUCKET}\`: ${upErr.message}`);
      } else {
        ok("Upload vào bucket hoạt động");
        await admin.storage.from(BUCKET).remove([probe]);
      }
    }
  } else {
    console.log("  – Bỏ qua (không kết nối được)");
  }

  console.log(
    failures === 0
      ? "\n✅ Tất cả cấu hình đều hợp lệ.\n"
      : `\n❌ Có ${failures} vấn đề. Xem README.md → "Cấu hình Supabase".\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("✗ Lỗi khi kiểm tra:", err);
  process.exit(1);
});
