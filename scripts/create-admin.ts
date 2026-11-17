/**
 * Tạo / cập nhật tài khoản ADMIN cho BIAS BAG.
 *
 * Admin là tài khoản RIÊNG BIỆT — không đăng ký qua form `/login` (form đó
 * luôn tạo role `customer`). Script này là đường duy nhất để tạo admin,
 * dùng service role key nên bỏ qua được hạn chế `disable_signup`.
 *
 * CÁCH DÙNG
 * ---------
 *   # Tạo admin mới (nếu đã tồn tại sẽ cập nhật mật khẩu + role)
 *   npx tsx --env-file=.env.local scripts/create-admin.ts \
 *     --email admin@biasbag.vn --password "MatKhauCuaBan123"
 *
 *   # Hoặc đặt qua biến môi trường
 *   ADMIN_EMAIL=admin@biasbag.vn ADMIN_PASSWORD="MatKhauCuaBan123" \
 *     npm run auth:admin
 *
 * GHI CHÚ
 * -------
 * - Script IDEMPOTENT: chạy lại nhiều lần vẫn OK, không tạo user trùng.
 * - Mật khẩu được truyền qua CLI arg hoặc env → không ghi vào file nào.
 * - Sau khi chạy, đăng nhập tại `/login` bằng tài khoản này sẽ tự động
 *   chuyển tới trang quản trị `/admin`.
 */

import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Tham số                                                             */
/* ------------------------------------------------------------------ */

function parseArgs(): { email?: string; password?: string } {
  const argv = process.argv.slice(2);
  const out: { email?: string; password?: string } = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--email" || arg === "-e") out.email = argv[++i];
    else if (arg === "--password" || arg === "-p") out.password = argv[++i];
    else if (arg.startsWith("--email=")) out.email = arg.slice(8);
    else if (arg.startsWith("--password=")) out.password = arg.slice(11);
  }

  return {
    email: out.email ?? process.env.ADMIN_EMAIL,
    password: out.password ?? process.env.ADMIN_PASSWORD,
  };
}

/* ------------------------------------------------------------------ */
/*  Nạp .env.local                                                      */
/* ------------------------------------------------------------------ */

async function loadEnv() {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  try {
    const content = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // Không có .env.local — bỏ qua.
  }
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  await loadEnv();

  const { email, password } = parseArgs();

  if (!email || !password) {
    console.error(
      "✗ Thiếu email hoặc mật khẩu admin.\n" +
        "  Dùng: npx tsx --env-file=.env.local scripts/create-admin.ts \\\n" +
        "         --email admin@biasbag.vn --password \"MatKhauCuaBan123\"",
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("✗ Mật khẩu admin phải có ít nhất 8 ký tự.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "✗ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local.",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Tìm user theo email.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error("✗ Không đọc được danh sách user:", listError.message);
    process.exit(1);
  }

  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  let userId = existing?.id;

  // 2. Tạo mới hoặc cập nhật mật khẩu + email đã xác nhận.
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, full_name: "BIAS BAG Admin" },
    });
    if (error) {
      console.error("✗ Không cập nhật được user:", error.message);
      process.exit(1);
    }
    console.log(`✓ Đã cập nhật user tồn tại: ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "BIAS BAG Admin" },
    });
    if (error || !data.user) {
      console.error("✗ Không tạo được user:", error?.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`✓ Đã tạo user: ${email}`);
  }

  // 3. Nâng role lên `admin`.
  //
  //    Trigger `handle_new_user` đã tạo dòng `profiles` với role `customer`.
  //    Ở đây ta upsert lại với role `admin` (service role bypass RLS).
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: "BIAS BAG Admin",
      role: "admin",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    console.error("✗ Không cập nhật được profiles:", profileError.message);
    process.exit(1);
  }

  console.log(`✓ Role đã đặt: admin (${userId})`);
  console.log(`\nĐăng nhập tại /login bằng ${email} → sẽ vào thẳng /admin.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
