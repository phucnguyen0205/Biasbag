/**
 * Đồng bộ `supabase/schema.sql` → migration file của Supabase CLI.
 *
 * Vì sao cần script này:
 *   - `supabase/schema.sql` là nguồn DDL duy nhất, được dùng để chạy tay
 *     trong SQL Editor (README hướng dẫn cách này).
 *   - `supabase db push` chỉ đọc file trong `supabase/migrations/`.
 *   - Nếu copy thủ công, hai file sẽ lệch nhau theo thời gian.
 *
 * Script này copy nội dung DDL vào migration `init_schema`, nên
 * `supabase db push` luôn đồng bộ với `schema.sql`.
 *
 * Chạy: npm run db:sync
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_PATH = join(ROOT, "supabase", "schema.sql");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

/** Tên migration gốc — cần khớp với file đã tạo bằng `supabase migration new`. */
const MIGRATION_NAME = "init_schema";

function findMigration(): string | null {
  if (!existsSync(MIGRATIONS_DIR)) return null;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && f.includes(MIGRATION_NAME))
    .sort();

  return files.length > 0 ? join(MIGRATIONS_DIR, files[0]) : null;
}

function main() {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  const migrationPath = findMigration();

  if (!migrationPath) {
    console.error(
      `✗ Không tìm thấy migration "${MIGRATION_NAME}" trong supabase/migrations/.\n` +
        `  Tạo trước: npx supabase migration new ${MIGRATION_NAME}`,
    );
    process.exit(1);
  }

  const header = [
    `-- BIAS BAG — migration khởi tạo schema.`,
    `--`,
    `-- File này được SINH RA tự động từ \`supabase/schema.sql\`.`,
    `-- Đừng sửa trực tiếp — hãy sửa schema.sql rồi chạy \`npm run db:sync\`.`,
    ``,
  ].join("\n");

  const next = header + schema;

  const current = existsSync(migrationPath)
    ? readFileSync(migrationPath, "utf-8")
    : "";

  if (current === next) {
    console.log(`✓ Migration đã đồng bộ: ${migrationPath}`);
    return;
  }

  writeFileSync(migrationPath, next, "utf-8");
  console.log(`✓ Đã cập nhật: ${migrationPath}`);
}

main();
