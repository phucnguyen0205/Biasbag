#!/bin/bash
# Đo hiệu năng trang chủ với các cờ kiểm thử hiệu năng khác nhau.
#
#   ./scripts/measure-perf.sh              # preset mobile (giống PageSpeed Insights)
#   ./scripts/measure-perf.sh desktop
#
# Mỗi tổ hợp được build riêng + chạy trên **port riêng** + server được dọn
# sạch trước khi đo tiếp (nếu không, Lighthouse sẽ đo nhầm build cũ).
#
# Yêu cầu: lighthouse đã cài (`npm i -g lighthouse`).

set -u

PRESET="${1:-mobile}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/perf-degrade"
PORT_BASE=3100
mkdir -p "$OUT"

cd "$ROOT" || exit 1

command -v lighthouse >/dev/null 2>&1 || {
  echo "Chưa cài lighthouse: npm i -g lighthouse"; exit 1;
}

CHROME_FLAGS="--headless=new --no-sandbox"

print_result() {
  local out="$1" label="$2"
  python3 - "$out" "$label" <<'PY'
import json, sys
f, label = sys.argv[1], sys.argv[2]
try:
    d = json.load(open(f))
except Exception as e:
    print("%-22s ERROR: %s" % (label, e)); sys.exit()
if d.get("runtimeError"):
    print("%-22s ERROR: %s" % (label, d["runtimeError"]["message"][:60])); sys.exit()
a = d.get("audits", {})
score = d["categories"]["performance"]["score"] * 100
print("%-18s score %3.0f   LCP %-7s TBT %-8s CLS %-6s FCP %-6s SI %s" % (
    label, score,
    a.get("largest-contentful-paint", {}).get("displayValue", "?"),
    a.get("total-blocking-time", {}).get("displayValue", "?"),
    a.get("cumulative-layout-shift", {}).get("displayValue", "?"),
    a.get("first-contentful-paint", {}).get("displayValue", "?"),
    a.get("speed-index", {}).get("displayValue", "?"),
))
PY
}

# Dọn sạch mọi process `next start` còn sót (nếu không, port bị chiếm và
# Lighthouse đo nhầm build cũ).
cleanup_servers() {
  pkill -f "next start -p 31" >/dev/null 2>&1
  pkill -f "next-server" >/dev/null 2>&1
  sleep 1
}

cleanup_servers

ORIG_ENV="$OUT/.env.local.orig"
cp "$ROOT/.env.local" "$ORIG_ENV"

i=0
measure_with() {
  local flags="$1" label="$2"
  i=$((i + 1))
  local port=$((PORT_BASE + i))

  # Khôi phục .env.local gốc rồi ghi cờ mới (tránh nhân bội giá trị).
  cp "$ORIG_ENV" "$ROOT/.env.local"
  if [ -n "$flags" ]; then
    printf '\nNEXT_PUBLIC_PERF_DEGRADE=%s\n' "$flags" >> "$ROOT/.env.local"
  fi

  echo "▸ Build ($label)…"
  if ! ( cd "$ROOT" && rm -rf .next && npm run build > "$OUT/build-$i.log" 2>&1 ); then
    echo "  BUILD FAILED — xem $OUT/build-$i.log"
    cp "$ORIG_ENV" "$ROOT/.env.local"
    return 1
  fi

  # Server riêng port riêng, nền, và chờ sẵn sàng.
  ( cd "$ROOT" && nohup npx next start -p "$port" > "$OUT/server-$i.log" 2>&1 & )

  for _ in $(seq 1 30); do
    if curl -s -o /dev/null "http://localhost:$port"; then break; fi
    sleep 1
  done

  local extra=()
  [ "$PRESET" = "desktop" ] && extra=(--preset=desktop)

  lighthouse "http://localhost:$port" \
    --output=json --output-path="$OUT/result-$i.json" \
    --chrome-flags="$CHROME_FLAGS" \
    --only-categories=performance \
    ${extra[@]+"${extra[@]}"} \
    --quiet >/dev/null 2>&1

  print_result "$OUT/result-$i.json" "$label"

  pkill -f "next start -p $port" >/dev/null 2>&1
  sleep 1
}

echo "=== Đo hiệu năng (preset: $PRESET) ==="
echo

# Nếu truyền tham số thứ 2 → đo đúng danh sách tổ hợp đó (phân tách bằng dấu phẩy).
#   ./scripts/measure-perf.sh mobile "tbt:300,cls"
#   ./scripts/measure-perf.sh mobile "tbt:300,cls tbt:450,cls tbt:600"
if [ -n "${2:-}" ]; then
  for combo in $2; do
    measure_with "$combo" "$combo"
  done
else
  measure_with "" "baseline"
  measure_with "tbt" "tbt"
  measure_with "cls" "cls"
  measure_with "lcp" "lcp"
  measure_with "delay" "delay"
  measure_with "tbt,cls" "tbt+cls"
  measure_with "tbt,cls,lcp" "tbt+cls+lcp"
  measure_with "tbt,cls,lcp,delay" "tat ca"
fi

cp "$ORIG_ENV" "$ROOT/.env.local"
cleanup_servers
echo
echo "Kết quả lưu tại: $OUT"
