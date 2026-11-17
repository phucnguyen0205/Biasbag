#!/bin/bash
# Tìm tổ hợp cờ kiểm thử hiệu năng cho đúng một điểm mục tiêu, đo TRÊN
# chính hạ tầng Vercel (preview deployment) — sát production nhất.
#
#   ./scripts/tune-perf-target.sh 55
#
# Với mỗi tổ hợp:
#   1. deploy preview với `-b NEXT_PUBLIC_PERF_DEGRADE=<combo>`
#   2. chạy Lighthouse (preset mobile) lên URL preview
#   3. in điểm
#
# Script dừng lại khi tìm được điểm gần mục tiêu nhất.

set -u

TARGET="${1:-55}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME_FLAGS="--headless=new --no-sandbox"

cd "$ROOT" || exit 1
command -v lighthouse >/dev/null 2>&1 || { echo "Cần: npm i -g lighthouse"; exit 1; }
command -v vercel >/dev/null 2>&1 || { echo "Cần: npm i -g vercel"; exit 1; }

measure() {
  local url="$1" label="$2"
  local out="${TMPDIR:-/tmp}/perf-tune.json"
  lighthouse "$url" \
    --output=json --output-path="$out" \
    --chrome-flags="$CHROME_FLAGS" \
    --only-categories=performance --quiet >/dev/null 2>&1

  python3 - "$out" "$label" <<'PY'
import json, sys
f, label = sys.argv[1], sys.argv[2]
try:
    d = json.load(open(f))
except Exception as e:
    print("%-24s ERROR %s" % (label, e)); sys.exit()
if d.get("runtimeError"):
    print("%-24s ERROR %s" % (label, d["runtimeError"]["message"][:50])); sys.exit()
a = d.get("audits", {})
score = d["categories"]["performance"]["score"] * 100
print("%-24s score %3.0f   LCP %-7s TBT %-8s CLS %-6s FCP %-6s SI %s" % (
    label, score,
    a.get("largest-contentful-paint", {}).get("displayValue", "?"),
    a.get("total-blocking-time", {}).get("displayValue", "?"),
    a.get("cumulative-layout-shift", {}).get("displayValue", "?"),
    a.get("first-contentful-paint", {}).get("displayValue", "?"),
    a.get("speed-index", {}).get("displayValue", "?"),
))
PY
}

deploy_and_measure() {
  local combo="$1" label="$2"
  echo "▸ Deploy ($label)…"
  local out
  out=$(vercel deploy --target=preview --build-env "NEXT_PUBLIC_PERF_DEGRADE=$combo" \
        --yes 2>&1 | grep -oE 'https://[a-z0-9.-]+\.vercel\.app' | tail -1)

  if [ -z "$out" ]; then
    echo "  deploy thất bại"; return 1
  fi

  echo "  → $out"
  sleep 8
  measure "$out" "$label"
}

echo "=== Tìm combo cho điểm mục tiêu ~$TARGET (preview, preset mobile) ==="
echo

# 1. Baseline (cờ tắt) — để biết điểm gốc trên chính hạ tầng Vercel.
deploy_and_measure "" "baseline"

# 2. Các tổ hợp tăng dần cường độ TBT.
for combo in "tbt:500" "tbt:800" "tbt:1100" "tbt:800,cls" "tbt:1100,cls"; do
  deploy_and_measure "$combo" "$combo"
done

echo
echo "Xong. Chọn tổ hợp gần mục tiêu nhất rồi đặt production:"
echo "  vercel env add NEXT_PUBLIC_PERF_DEGRADE production"
