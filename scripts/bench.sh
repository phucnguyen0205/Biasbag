#!/usr/bin/env bash
# Benchmark Lighthouse (mobile throttling) cho trang chủ.
#   usage: bash scripts/bench.sh <label> [runs]
set -euo pipefail

LABEL="${1:-run}"
RUNS="${2:-3}"
PORT="${PORT:-3999}"
# Thư mục gốc dự án — suy ra từ vị trí file script (không hardcode đường dẫn
# tuyệt đối để script chạy được trên mọi máy / trong CI).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${OUT_DIR:-/tmp/bench-$LABEL}"
mkdir -p "$OUT"

cd "$ROOT"

# ── Build ───────────────────────────────────────────────────────────────
echo "▸ build..."
npx next build >"$OUT/build.log" 2>&1 || { tail -30 "$OUT/build.log"; exit 1; }

# ── Start server ────────────────────────────────────────────────────────
echo "▸ start server :$PORT"
lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
PORT=$PORT npx next start -p $PORT >"$OUT/server.log" 2>&1 &
SERVER_PID=$!
trap 'kill -9 $SERVER_PID 2>/dev/null || true' EXIT

for i in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT/"; then break; fi
  sleep 0.5
done
# warm-up: render ISR + optimizer cache
curl -sf -o /dev/null "http://127.0.0.1:$PORT/"
curl -sf -o /dev/null "http://127.0.0.1:$PORT/"
sleep 1

# ── Lighthouse ──────────────────────────────────────────────────────────
for i in $(seq 1 $RUNS); do
  echo "▸ lighthouse run $i/$RUNS"
  npx lighthouse "http://127.0.0.1:$PORT/" \
    --output=json --output-path="$OUT/lhr-$i.json" \
    --only-categories=performance \
    --quiet --chrome-flags="--headless=new --no-sandbox" \
    >"$OUT/lh-$i.log" 2>&1 || echo "  ⚠ run $i failed"
done

# ── Summary ─────────────────────────────────────────────────────────────
node -e '
const fs=require("fs");
const dir=process.argv[1];
const runs=fs.readdirSync(dir).filter(f=>f.startsWith("lhr-")&&f.endsWith(".json")).sort();
const rows=[];
for(const f of runs){
  const c=JSON.parse(fs.readFileSync(dir+"/"+f,"utf8"));
  const a=c.audits;
  rows.push({
    score:+(c.categories.performance.score*100).toFixed(1),
    FCP:+a["first-contentful-paint"].numericValue.toFixed(0),
    LCP:+a["largest-contentful-paint"].numericValue.toFixed(0),
    TBT:+a["total-blocking-time"].numericValue.toFixed(0),
    CLS:+a["cumulative-layout-shift"].numericValue.toFixed(3),
    SI:+a["speed-index"].numericValue.toFixed(0),
    KB:+(a["total-byte-weight"].numericValue/1024).toFixed(0),
    req:a["network-requests"].details.items.length,
  });
}
const med=k=>{const v=rows.map(r=>r[k]).sort((x,y)=>x-y);return v[Math.floor(v.length/2)];};
console.log("\n=== "+dir+" ===");
console.table(rows);
console.log("MEDIAN  score",med("score"),"| FCP",med("FCP"),"| LCP",med("LCP"),"| TBT",med("TBT"),"| CLS",med("CLS"),"| KB",med("KB"),"| req",med("req"));
' "$OUT"
