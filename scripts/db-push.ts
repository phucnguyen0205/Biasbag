/**
 * Đẩy schema + dữ liệu mẫu lên Supabase project.
 *
 * Ưu tiên 1: Supabase CLI (`supabase db push --include-seed`)
 *   - Cần: `npx supabase login` hoặc biến môi trường SUPABASE_ACCESS_TOKEN.
 *   - Ưu điểm: ghi lịch sử migration chuẩn (`supabase_migrations.schema_migrations`).
 *
 * Ưu tiên 2: Management API (`POST /v1/projects/{ref}/database/query`)
 *   - Cần: biến môi trường SUPABASE_ACCESS_TOKEN (personal access token có
 *     scope `database_write`).
 *   - Chạy SQL trực tiếp, KHÔNG ghi lịch sử migration.
 *   - Dùng khi không muốn (hoặc không thể) dùng CLI.
 *
 * Cả hai đều chạy `supabase/schema.sql` rồi `supabase/seed.sql` — cùng một
 * nguồn SQL, nên kết quả giống nhau.
 *
 * Chạy:
 *   npm run db:push                 # tự chọn cách khả dụng
 *   npm run db:push -- --method cli
 *   npm run db:push -- --method api
 *   npm run db:push -- --dry-run     # chỉ in ra SQL, không gửi
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCHEMA_SQL = join(ROOT, "supabase", "schema.sql");
const SEED_SQL = join(ROOT, "supabase", "seed.sql");

type Method = "cli" | "api";

function parseArgs(): { method: Method | null; dryRun: boolean } {
  const argv = process.argv.slice(2);
  let method: Method | null = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--method=cli") {
      method = "cli";
    } else if (arg === "--method=api") {
      method = "api";
    } else if (arg === "--method") {
      const value = argv[i + 1];
      if (value === "cli" || value === "api") method = value;
    }
  }

  return { method, dryRun };
}

/* ------------------------------------------------------------------ */
/*  Cấu hình                                                            */
/* ------------------------------------------------------------------ */

function loadEnv() {
  // Nạp .env.local nếu chưa có biến trong môi trường.
  const envPath = join(ROOT, ".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
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
    // Không có .env.local — bỏ qua.
  }
}

loadEnv();

function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Cách 1: Supabase CLI                                                */
/* ------------------------------------------------------------------ */

async function pushWithCli(dryRun: boolean): Promise<number> {
  const { spawn } = await import("node:child_process");

  // Mặc định đẩy lên project remote (project ref lấy từ NEXT_PUBLIC_SUPABASE_URL).
  // Dùng `--remote` không kèm ref → CLI dùng project đã link.
  const projectRef = getProjectRef();

  const args = ["--yes", "supabase@latest", "db", "push", "--include-seed"];
  if (projectRef) args.push(`--remote=${projectRef}`);
  else args.push("--remote");
  if (dryRun) args.push("--dry-run");

  console.log("→ Dùng Supabase CLI: supabase db push --include-seed");
  if (projectRef) console.log(`  Target: ${projectRef}`);
  if (dryRun) console.log("  (dry-run: chỉ in migration, không apply)");

  const code = await new Promise<number>((resolve) => {
    const child = spawn("npx", args, { stdio: "inherit", cwd: ROOT });
    child.on("close", (c) => resolve(c ?? 1));
    child.on("error", (err) => {
      console.error("✗ Không chạy được CLI:", err.message);
      resolve(1);
    });
  });

  if (code !== 0) {
    console.error(
      "\n── Nếu CLI báo `DbConfigIpv6Error` / `IPv6 is not supported` ──\n" +
        "  Mạng hiện tại không có route IPv6 tới database của Supabase.\n" +
        "  Dùng Management API qua HTTPS (không bị giới hạn này):\n" +
        "    1. Tạo token: https://supabase.com/dashboard/account/tokens\n" +
        "       (scope: database_write)\n" +
        "    2. export SUPABASE_ACCESS_TOKEN=sbp_...\n" +
        "    3. npm run db:push -- --method api\n",
    );
  }

  return code;
}

/* ------------------------------------------------------------------ */
/*  Cách 2: Management API                                              */
/* ------------------------------------------------------------------ */

async function pushWithApi(dryRun: boolean): Promise<number> {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = getProjectRef();

  if (!token) {
    console.error(
      "✗ Thiếu SUPABASE_ACCESS_TOKEN.\n" +
        "  Tạo personal access token tại:\n" +
        "  https://supabase.com/dashboard/account/tokens\n" +
        "  (cần scope `database_write` cho project này)",
    );
    return 1;
  }

  if (!projectRef) {
    console.error(
      "✗ Không tìm được project ref từ NEXT_PUBLIC_SUPABASE_URL.\n" +
        "  URL phải có dạng https://<project-ref>.supabase.co",
    );
    return 1;
  }

  const steps: [string, string][] = [
    ["supabase/schema.sql", readFileSync(SCHEMA_SQL, "utf-8")],
    ["supabase/seed.sql", readFileSync(SEED_SQL, "utf-8")],
  ];

  if (dryRun) {
    console.log(`→ Dry-run — sẽ gửi ${steps.length} file tới project ${projectRef}:`);
    for (const [name, sql] of steps) {
      console.log(`   - ${name} (${sql.length} ký tự)`);
    }
    return 0;
  }

  // Cho phép override base URL (test, proxy, self-hosted).
  const apiBase = (
    process.env.SUPABASE_MANAGEMENT_API_URL?.trim() || "https://api.supabase.com"
  ).replace(/\/+$/, "");
  const url = `${apiBase}/v1/projects/${projectRef}/database/query`;

  for (const [name, sql] of steps) {
    process.stdout.write(`→ Đang gửi ${name} … `);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.log("✗");
        console.error(`  Lỗi HTTP ${res.status}: ${text}`);
        return 1;
      }

      console.log("✓");
    } catch (err) {
      console.log("✗");
      console.error("  ", err instanceof Error ? err.message : err);
      return 1;
    }
  }

  console.log("\n✓ Hoàn tất. Kiểm tra lại bằng: npm run check:env");
  return 0;
}

/* ------------------------------------------------------------------ */

async function main() {
  const { method, dryRun } = parseArgs();

  if (method === "cli") {
    process.exit(await pushWithCli(dryRun));
  }

  if (method === "api") {
    process.exit(await pushWithApi(dryRun));
  }

  // Tự chọn: có token → Management API, không có → CLI.
  const hasToken = Boolean(process.env.SUPABASE_ACCESS_TOKEN?.trim());

  if (hasToken) {
    console.log("→ Phát hiện SUPABASE_ACCESS_TOKEN — dùng Management API.\n");
    process.exit(await pushWithApi(dryRun));
  }

  console.log(
    "→ Không có SUPABASE_ACCESS_TOKEN — dùng Supabase CLI.\n" +
      "  Nếu CLI chưa đăng nhập, chạy: npx supabase login\n",
  );
  process.exit(await pushWithCli(dryRun));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
