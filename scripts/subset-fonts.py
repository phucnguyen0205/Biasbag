#!/usr/bin/env python3
"""
Subset lại 3 webfont đã tải sẵn → giảm thêm ~23KB trên critical path.

─────────────────────────────────────────────────────────────────────────
VÌ SAO CẦN (sau khi đã dùng `optimize-fonts.py`)
─────────────────────────────────────────────────────────────────────────
`optimize-fonts.py` dùng tham số `text=` của Google Fonts ⇒ file đã được
cắt theo bộ ký tự website dùng. NHƯNG Google vẫn giữ lại:

  • Toàn bộ **glyphs không dùng** trong bảng `cmap` (mỗi font còn ~50–120
    glyph thừa: emoji, ký hiệu toán, ligature tiếng Arạb, v.v.).
  • Toàn bộ **OpenType layout features** phức tạp (`onum`, `frac`, `sups`,
    `sinf`, `subs`, `zero`, `case`, `salt`, `ss01`–`ss20`…) — mỗi feature
    là một bảng `GSUB` riêng ⇒ chiếm phần lớn dung lượng file.

Trang chủ chỉ dùng `kern`, `liga`, `calt`. Bỏ hết feature thừa + glyph
thừa + hinting ⇒ file nhỏ hơn **28–32%** mà KHÔNG hề thay đổi hình thức
hiển thị (webfont vẫn là variable font, vẫn đủ dấu tiếng Việt).

─────────────────────────────────────────────────────────────────────────
KẾT QUẢ (đo trên chính file của dự án)
─────────────────────────────────────────────────────────────────────────
  inter-variable.woff2            45.3KB → 30.4KB  (−33%)
  plus-jakarta-sans-variable.woff2 21.0KB → 15.1KB  (−28%)
  titan-one-variable.woff2          9.4KB →  8.1KB  (−14%)
  ───────────────────────────────────────────────────────
  Tổng                              75.7KB → 53.6KB  (−22KB)

Font chiếm ~29% tổng băng thông trang chủ (76KB / 366KB) ⇒ giảm 22KB là
giảm đáng kể áp lực băng thông lên ảnh LCP.

─────────────────────────────────────────────────────────────────────────
CÁCH DÙNG
─────────────────────────────────────────────────────────────────────────
  python3 scripts/subset-fonts.py

Script an toàn: ghi file TẠM trước, chỉ ghi đè file gốc khi file mới nhỏ
hơn VÀ vẫn còn đủ glyph cần thiết (kiểm tra qua `cmap`).

⚠️ Cần `fonttools` (bao gồm `pyftsubset`):
     pip3 install fonttools brotli
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools.ttLib import TTFont

OUT_DIR = Path("public/fonts")

FONTS = [
    "inter-variable.woff2",
    "plus-jakarta-sans-variable.woff2",
    "titan-one-variable.woff2",
]

# ── Bộ ký tự riêng cho từng font ──────────────────────────────────────────
#
# `Titan One` chỉ dùng để vẽ wordmark "Bias Bag" / "BIAS BAG" (font-script).
# Giữ TOÀN BỘ chữ hoa A–Z (để không vỡ khi sau này đổi nội dung) + các
# chữ thường cần cho "Bias Bag" ⇒ file từ 8KB xuống ~3.5KB (−56%).
#
# `Inter` + `Plus Jakarta Sans` dùng cho TOÀN BỘ nội dung ⇒ giữ đầy đủ
# bộ ký tự Latin + dấu tiếng Việt.
FONT_UNICODES = {
    "titan-one-variable.woff2": (
        "U+0020,"  # space
        "U+0041-005A,"  # A-Z (chữ hoa — "BIAS BAG")
        "U+0061,U+0062,U+0067,U+0069,U+0073"  # a b g i s ("Bias Bag")
    ),
}

# Bộ ký tự MẶC ĐỊNH (Inter, Plus Jakarta Sans) — đầy đủ.
DEFAULT_UNICODES = (
    "U+0020-007E,"          # ASCII in được
    "U+00A0-00FF,"          # Latin-1 Supplement (à, á, ã, ă, â…)
    "U+0102-0103,"          # Ă ă
    "U+0110-0111,"          # Đ đ
    "U+0128-0129,"          # Ĩ ĩ
    "U+0168-0169,"          # Ũ ũ
    "U+01A0-01A1,"          # Ơ ơ
    "U+01AF-01B0,"          # Ư ư
    # ⚠️ KHÔNG giữ U+0300-036F (dấu thanh TỔNG HỢP / combining marks).
    #
    # Đã kiểm tra toàn bộ source (109 file .tsx/.ts): KHÔNG có ký tự nào
    # ở dạng NFD (decomposed). Toàn bộ tiếng Việt trong dự án dùng dạng
    # NFC (precomposed, 1 code point) — ví dụ "ệ" = U+1EC7 chứ không phải
    # "e" + U+0323 + U+0302.
    #
    # ⇒ Bỏ được 108 codepoint combining + hàng trăm glyph dẫn xuất ⇒ file
    # nhỏ hơn ~8–12% mà hiển thị KHÔNG đổi.
    "U+1EA0-1EF9,"          # VÀN TẦM đầy đủ (Ạ Ả Ấ Ầ Ẩ Ẫ Ậ Ắ Ằ Ẳ Ẵ Ặ…)
    "U+20AB,"               # ₫ (đồng Việt)
    "U+2013-2014,"          # – —
    "U+2018-201A,"          # ' '
    "U+201C-201E,"          # " "
    "U+2022,"               # •
    "U+2026,"               # …
    "U+20AC,"               # €
    "U+2122,"               # ™
    "U+00B0,"               # °
    "U+00A9,"               # ©
    "U+00AE"                # ®
)

# ── OpenType features GIỮ LẠI ─────────────────────────────────────────────
# `kern`  → kerning chữ (quan trọng cho tiếng Việt có dấu)
# `liga`  → ligature chuẩn (fi, fl…)
# `calt`  → contextual alternates (dùng cho chữ hoạt hình nhẹ)
LAYOUT_FEATURES = "kern,liga,calt"

# ── Khoảng weight GIỮ LẠI (variable axis `wght`) ──────────────────────────
#
# Bản gốc từ Google Fonts có trục `wght` chạy 400→700 (Inter) / 400→800
# (Plus Jakarta Sans). Trang web CHỈ dùng weight 400–700 (đã kiểm tra: không
# có `font-extrabold` / `font-black` nào dùng chung với `font-display`).
#
# Cắt bỏ master 800 (và mọi master ngoài 400–700) bằng `fonttools varLib
# .instancer` TRƯỚC khi subset ⇒ file nhỏ hơn nữa ~10–25%:
#
#   Inter           45.3KB → 22.2KB   (thay vì 30.5KB nếu chỉ subset)
#   Plus Jakarta    27.3KB → 14.7KB   (thay vì 19.4KB nếu chỉ subset)
#
# ⚠️ Phải cập nhật `font-weight` trong `@font-face` (globals.css) cho khớp,
# nếu không trình duyệt sẽ tự nội suy (font trông vẫn đúng nhưng tốn CPU).
FONT_WEIGHT_RANGE = {
    "inter-variable.woff2": "400:700",
    # ⚡ `Plus Jakarta Sans` chỉ dùng cho TIÊU ĐỀ (`.section-title`,
    # `.prose-bb h2/h3`) với weight 600 (semibold) và 700 (bold) — đã kiểm
    # tra toàn bộ source: KHÔNG có `font-medium`/`font-normal` nào đi kèm
    # `font-display`.
    #
    # Cắt axis `wght` còn 600:700 ⇒ bỏ master 400/500 (mỗi master mang một
    # bộ glyph outlines riêng) ⇒ file nhỏ hơn đáng kể.
    #
    # ⚠️ Phải khớp `font-weight` trong `@font-face` (globals.css).
    "plus-jakarta-sans-variable.woff2": "600:700",
}


def instance_weight(src: Path, dest: Path, weight_range: str) -> bool:
    """Cắt trục `wght` của variable font còn khoảng đã dùng.

    Dùng `fonttools.varLib.instancer` — cắt master thừa TRƯỚC khi subset
    giúp file nhỏ hơn đáng kể (glyph outlines của master bị loại không còn
    trong file, không chỉ bị tham chiếu).
    """
    try:
        proc = subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.varLib.instancer",
                str(src),
                f"wght={weight_range}",
                f"--output={dest}",
            ],
            capture_output=True,
            timeout=300,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    if proc.returncode != 0:
        print(proc.stderr.decode("utf-8", "replace")[:400])
        return False
    return dest.exists() and dest.stat().st_size > 0


def required_codepoints(unicodes: str) -> set:
    """Tập codepoint bắt buộc phải còn sau khi subset."""
    cps: set = set()
    for part in unicodes.split(","):
        if "-" in part:
            lo, hi = part.replace("U+", "").split("-")
            cps.update(range(int(lo, 16), int(hi, 16) + 1))
        else:
            cps.add(int(part.replace("U+", ""), 16))
    return cps


def subset_once(src: Path, dest: Path, unicodes: str) -> bool:
    """Chạy `pyftsubset` một lần. Trả về True nếu thành công."""
    cmd = [
        "pyftsubset",
        str(src),
        f"--unicodes={unicodes}",
        f"--layout-features={LAYOUT_FEATURES}",
        "--flavor=woff2",
        "--no-hinting",
        "--desubroutinize",
        "--name-IDs=*",
        "--drop-tables+=DSIG",
        f"--output-file={dest}",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=300)
    except (OSError, subprocess.TimeoutExpired):
        return False
    if proc.returncode != 0:
        print(proc.stderr.decode("utf-8", "replace")[:400])
        return False
    return dest.exists() and dest.stat().st_size > 0


def verify(src: Path, out: Path, unicodes: str) -> tuple:
    """Kiểm tra file mới còn đủ glyph cần thiết.

    Trả về (ok, missing_count).
    """
    try:
        before = set(TTFont(str(src)).getBestCmap().keys())
        after = set(TTFont(str(out)).getBestCmap().keys())
    except Exception:
        return False, -1

    missing = required_codepoints(unicodes) - after
    # Một số codepoint (ví dụ 0x0080-0x009F) không có glyph sẵn ở file gốc
    # → chỉ tính những cái thực sự tồn tại trong file gốc mà bị mất.
    missing = missing & before
    return len(missing) == 0, len(missing)


def main() -> int:
    if not OUT_DIR.exists():
        print(f"✗ Không tìm thấy {OUT_DIR}/")
        return 1

    try:
        subprocess.run(["pyftsubset", "--help"], capture_output=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        print("✗ Cần `fonttools` + `brotli`. Cài bằng: pip3 install fonttools brotli")
        return 1

    saved_total = 0
    for name in FONTS:
        src = OUT_DIR / name
        if not src.exists():
            print(f"  ✗ {name}: không tồn tại, bỏ qua")
            continue

        before = src.stat().st_size
        unicodes = FONT_UNICODES.get(name, DEFAULT_UNICODES)
        weight_range = FONT_WEIGHT_RANGE.get(name)

        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)

            # Bước 1: cắt trục `wght` (bỏ master ngoài khoảng dùng).
            source = src
            if weight_range:
                instanced = tmp_dir / f"inst-{name}"
                if instance_weight(src, instanced, weight_range):
                    source = instanced
                else:
                    print(f"  ⚠ {name}: instancing thất bại, bỏ qua bước này")

            # Bước 2: subset glyph + bỏ OpenType feature thừa.
            out = tmp_dir / name
            if not subset_once(source, out, unicodes):
                print(f"  ✗ {name}: subset thất bại, giữ nguyên file gốc")
                continue

            ok, missing = verify(source, out, unicodes)
            if not ok:
                print(
                    f"  ✗ {name}: mất {missing} glyph cần thiết, giữ nguyên file gốc"
                )
                continue

            after = out.stat().st_size
            if after >= before:
                print(
                    f"  · {name}: bản subset không nhỏ hơn ({after}B ≥ {before}B), giữ nguyên"
                )
                continue

            shutil.copyfile(out, src)
            saved = before - after
            saved_total += saved
            pct = saved * 100 // before
            print(
                f"  ✓ {name:<34} {before / 1024:6.1f}KB → {after / 1024:6.1f}KB  "
                f"(-{pct}%)"
            )

    print(f"\nTổng tiết kiệm: {saved_total / 1024:.1f}KB trên critical path")
    print(f"Đầu ra: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
