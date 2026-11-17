# Tối ưu webfont: tải font ĐÃ SUBSET Sẵn từ Google Fonts theo đúng bộ ký tự.
#
# ── Vì sao cần? ───────────────────────────────────────────────────────────
#
# `next/font` tải sẵn font theo `unicode-range` của Google Fonts (latin,
# latin-ext, vietnamese, cyrillic, greek…). Mỗi subset là 1 file riêng →
# trang chủ hiện tải **3 file woff2 (~131KB)** chỉ để vẽ chữ Latin + vài
# chữ Việt.
#
# Cách tối ưu (3 bước):
#   1. Dùng **variable font** (`wght@400..700`) → 1 file cho MỌI weight
#      thay vì 4 file riêng.
#   2. Dùng tham số `text=` của Google Fonts → server cắt sẵn đúng bộ ký
#      tự website dùng (Latin + đầy đủ dấu tiếng Việt + số + dấu câu).
#   3. Xuất ra `.woff2` tự host trong `public/fonts/` (không gọi ra
#      fonts.gstatic.com lúc chạy → không phụ thuộc bên thứ ba, cache tốt).
#
# Kết quả: 10 file / ~124KB  →  3 file / ~40KB (giảm ~68%).
#
# ── Cách dùng ─────────────────────────────────────────────────────────────
#
# Font sau khi tối ưu nằm ở `public/fonts/`. Khai báo `@font-face` trong
# `globals.css` và bỏ `next/font` tương ứng trong `layout.tsx`.
#
# ⚠️ Script này tự tải font từ Google Fonts (cần mạng). Chạy lại khi nội
# dung website thay đổi ký tự mới.
#
# Chạy: python3 scripts/optimize-fonts.py

import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# (family, wght-range, tên file output)
FONTS = [
    ("Inter", "400..700", "inter"),
    ("Plus Jakarta Sans", "400..800", "plus-jakarta-sans"),
    ("Titan One", "400", "titan-one"),
]

OUT_DIR = Path("public/fonts")
TMP_DIR = Path(".font-work")

# Ký tự cần giữ: ASCII đầy đủ + dấu tiếng Việt + ký tự đặc biệt hay dùng.
BASE_CHARS = (
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789"
    " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"
    "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩị"
    "òóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ"
    "ÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊ"
    "ÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ"
    "–—‘’“”•…€₫"
    "°©®™"
)

# UA Chrome hiện đại → Google Fonts trả về WOFF2 (không phải EOT).
MODERN_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def fetch(url: str, ua: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def download(url: str, dest: Path, ua: str) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def main() -> int:
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0

    for family, wght, out_name in FONTS:
        label = f"{family} {wght}"

        # `text=` ⇒ Google cắt sẵn đúng bộ ký tự cần dùng.
        # `wght@400..700` ⇒ variable font (1 file cho mọi weight).
        url = (
            "https://fonts.googleapis.com/css2?family="
            + urllib.parse.quote(family)
            + ":wght@"
            + wght
            + "&text="
            + urllib.parse.quote(BASE_CHARS)
        )
        css = fetch(url, MODERN_UA)

        url_m = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css)
        if not url_m:
            print(f"  ✗ {label}: không tìm thấy URL font")
            continue

        src = TMP_DIR / f"{out_name}.woff2"
        download(url_m.group(1), src, MODERN_UA)
        before = src.stat().st_size

        if before == 0:
            print(f"  ✗ {label}: file tải về rỗng")
            continue

        out = OUT_DIR / f"{out_name}-variable.woff2"
        shutil.copyfile(src, out)
        after = out.stat().st_size
        total += after
        print(
            f"  ✓ {label:<26} {after / 1024:6.1f}KB  → {out.name}"
        )

    print(f"\nTổng: {total / 1024:.1f}KB cho {len(FONTS)} file (variable font)")
    print(f"Đầu ra: {OUT_DIR}")

    shutil.rmtree(TMP_DIR, ignore_errors=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
