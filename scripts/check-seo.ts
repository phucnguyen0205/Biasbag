/**
 * Kiểm tra cấu hình SEO / Google Search Console trên website đang chạy.
 *
 * Chạy: npm run check:seo -- https://biasbag.shop
 *
 * Kiểm tra:
 *   1. `robots.txt` — có trỏ tới sitemap không, có chặn trang riêng tư không
 *   2. `sitemap.xml` — parse được, URL đúng domain, không trùng lặp
 *   3. Thẻ `google-site-verification` trong `<head>` của trang chủ
 *   4. Canonical + JSON-LD + title trên các trang chính
 */

const DEFAULT_URL = "https://biasbag.shop";

let failures = 0;
let warnings = 0;

function ok(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg: string) {
  failures += 1;
  console.log(`  ✗ ${msg}`);
}

function warn(msg: string) {
  warnings += 1;
  console.log(`  ! ${msg}`);
}

async function main() {
  const base = (process.argv[2] ?? DEFAULT_URL).replace(/\/+$/, "");
  console.log(`\n=== Kiểm tra SEO tại ${base} ===\n`);

  // --- 1. robots.txt ---
  console.log("1. robots.txt");
  try {
    const res = await fetch(`${base}/robots.txt`);
    const text = await res.text();

    if (!res.ok) {
      fail(`robots.txt trả về ${res.status}`);
    } else {
      ok(`robots.txt (${res.status})`);
      if (/^\s*Sitemap:\s*\S+/im.test(text)) {
        ok("có khai báo Sitemap");
      } else {
        fail("thiếu dòng `Sitemap:` — Google sẽ không tìm thấy sitemap");
      }
      if (/Disallow:\s*\/admin/mi.test(text)) {
        ok("chặn /admin");
      } else {
        warn("chưa chặn /admin trong robots.txt");
      }
      if (/<html|<!DOCTYPE/i.test(text)) {
        fail("robots.txt trả về HTML thay vì văn bản thuần");
      } else {
        ok("là văn bản thuần (không phải HTML)");
      }
    }
  } catch (e) {
    fail(`không tải được robots.txt: ${(e as Error).message}`);
  }

  // --- 2. sitemap.xml ---
  console.log("\n2. sitemap.xml");
  try {
    const res = await fetch(`${base}/sitemap.xml`);
    const xml = await res.text();

    if (!res.ok) {
      fail(`sitemap.xml trả về ${res.status}`);
    } else {
      ok(`sitemap.xml (${res.status})`);

      // ⚠️ Lỗi "Sơ đồ trang web của bạn dường như là một trang HTML" trong
      // Google Search Console xảy ra khi GSC fetch `/sitemap.xml` mà nhận về
      // HTML thay vì XML. Kiểm tra chính xác điều đó ở đây.
      const contentType = res.headers.get("content-type") ?? "";
      if (/xml/i.test(contentType)) {
        ok(`content-type: ${contentType}`);
      } else {
        fail(`content-type không phải XML: "${contentType}"`);
      }

      if (/^\s*<\?xml/i.test(xml)) {
        ok("bắt đầu bằng khai báo XML");
      } else {
        fail("nội dung không bắt đầu bằng <?xml — có thể là trang HTML");
      }

      if (/<html|<!DOCTYPE html/i.test(xml)) {
        fail("nội dung chứa thẻ HTML — GSC sẽ báo lỗi 'sitemap là trang HTML'");
      } else {
        ok("không chứa thẻ HTML");
      }

      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      ok(`${locs.length} URL trong sitemap`);

      if (locs.length === 0) fail("sitemap rỗng");

      const wrongDomain = locs.filter((u) => !u.startsWith(base));
      if (wrongDomain.length) {
        fail(
          `${wrongDomain.length} URL trỏ domain khác (${base}): ${wrongDomain[0]}`,
        );
      } else {
        ok("mọi URL cùng domain");
      }

      const dupes = locs.filter((u, i) => locs.indexOf(u) !== i);
      if (dupes.length) {
        fail(`có ${dupes.length} URL trùng lặp: ${dupes[0]}`);
      } else {
        ok("không có URL trùng lặp");
      }

      const privatePages = locs.filter((u) =>
        /\/admin|\/login|\/account|\/cart|\/checkout|\/orders/.test(u),
      );
      if (privatePages.length) {
        fail(`sitemap chứa URL riêng tư: ${privatePages[0]}`);
      } else {
        ok("không chứa trang riêng tư");
      }
    }
  } catch (e) {
    fail(`không tải được sitemap.xml: ${(e as Error).message}`);
  }

  // --- 3. thẻ xác minh Google ---
  console.log("\n3. Thẻ xác minh Google (google-site-verification)");
  try {
    const res = await fetch(base);
    const html = await res.text();
    const m = html.match(
      /<meta[^>]+name=["']google-site-verification["'][^>]*content=["']([^"']+)["']/i,
    );
    if (m) {
      ok(`thẻ meta xác minh: ${m[1]}`);
    } else {
      warn(
        "chưa có thẻ meta google-site-verification — đặt biến môi trường GOOGLE_SITE_VERIFICATION rồi deploy lại",
      );
    }
  } catch (e) {
    fail(`không tải được trang chủ: ${(e as Error).message}`);
  }

  // --- 4. canonical + JSON-LD ---
  console.log("\n4. Canonical, JSON-LD & title");
  for (const path of ["/", "/products", "/blog", "/about", "/contact"]) {
    try {
      const res = await fetch(`${base}${path}`);
      const html = await res.text();
      const canonical = html.match(
        /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
      );
      const hasLd = /application\/ld\+json/i.test(html);
      const title = html.match(/<title>([^<]*)<\/title>/i);
      const desc = html.match(
        /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i,
      );

      const bits: string[] = [];
      bits.push(canonical ? "canonical ✓" : "canonical ✗");
      bits.push(hasLd ? "JSON-LD ✓" : "JSON-LD ✗");
      bits.push(title?.[1] ? "title ✓" : "title ✗");
      bits.push(desc?.[1] ? "description ✓" : "description ✗");

      if (canonical && hasLd && title?.[1] && desc?.[1]) {
        ok(`${path} — ${bits.join(" · ")}`);
      } else {
        warn(`${path} — ${bits.join(" · ")}`);
      }
    } catch (e) {
      fail(`${path}: ${(e as Error).message}`);
    }
  }

  console.log(
    failures === 0
      ? `\n✅ Không có lỗi (${warnings} cảnh báo).\n`
      : `\n❌ ${failures} lỗi, ${warnings} cảnh báo.\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("✗ Lỗi:", err);
  process.exit(1);
});
