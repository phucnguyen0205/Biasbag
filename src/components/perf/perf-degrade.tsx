"use client";

import { useEffect, useState } from "react";

/**
 * ⚠️ CÔNG CỤ KIỂM THỬ HIỆU NĂNG — TẮT MẶC ĐỊNH ⚠️
 *
 * Component này **cố tình làm hỏng** chỉ số hiệu năng của trang chủ, phục vụ
 * mục đích:
 *   - benchmark: đo tác động của từng yếu tố lên PageSpeed Insights
 *   - test trạng thái UI khi trang tải chậm: banner đến muộn, nội dung đến muộn
 *   - kiểm tra hệ thống có xử lý được tình huống xấu hay không
 *
 * Bật/tắt bằng biến môi trường `NEXT_PUBLIC_PERF_DEGRADE`.
 *
 * ── Cú pháp ────────────────────────────────────────────────────────────────
 *
 *   NEXT_PUBLIC_PERF_DEGRADE=<cờ>[:<cường độ>][,<cờ>[:<cường độ>]…]
 *
 * Mỗi cờ có **cường độ điều chỉnh được** → có thể tinh chỉnh để chạm đúng
 * một điểm mục tiêu thay vì rơi quá sâu.
 *
 * | Cờ    | Tác động                                              | Cường độ | Mặc định |
 * |-------|-------------------------------------------------------|----------|----------|
 * | `tbt` | Khoá Main Thread → TBT tăng (30% tổng điểm)         | ms block | 500ms    |
 * | `cls` | Banner cao chèn muộn, không set height → CLS (25%)   | px cao   | 150px    |
 * | `lcp` | Trì hoãn hiện ảnh hero → LCP tăng (25% tổng điểm)   | ms trễ   | 1500ms   |
 * | `delay`| Trì hoãn render toàn bộ nội dung chính → LCP (25%)   | ms trễ   | 1500ms   |
 * | `heavy`| Dùng ảnh hero nặng (~2.4 MB) thay ảnh tối ưu        | —        | tắt     |
 *
 * Ví dụ:
 *   ```bash
 *   NEXT_PUBLIC_PERF_DEGRADE=tbt                  # chỉ kéo TBT
 *   NEXT_PUBLIC_PERF_DEGRADE=tbt,cls              # TBT + CLS
 *   NEXT_PUBLIC_PERF_DEGRADE=tbt:800,lcp:2000     # tinh chỉnh
 *   NEXT_PUBLIC_PERF_DEGRADE=all                  # bật tất cả, mặc định
 *   ```
 *
 * ── Kết quả đo thực tế (Lighthouse preset mobile, đo trên production) ────
 *
 *   | Cờ                    | Điểm | TBT      | CLS   | LCP    |
 *   |-----------------------|------|----------|-------|--------|
 *   | baseline (tắt)       |  82  | 80 ms    | 0     | 4.7 s  |
 *   | `tbt:500`             |  67  | 1,390 ms | 0     | 3.2 s  |
 *   | `delay`               |  55–63 | 170 ms | 0.903 | 4.0 s  |
 *   | `tbt:200,lcp:1200,cls`|  53–62 | 680 ms | 0.182 | 4.6 s  |
 *   | `tbt:300,lcp:1500,cls`|  44–56 | 900 ms | 0.219 | 4.6 s  | ← preset
 *
 * ⚠️ **KHÔNG BAO GIỜ** set biến này trên production nếu không cố ý.
 * Bật trên production sẽ làm điểm PageSpeed của shop tụt về ~50–55% và
 * người dùng thật sẽ phải chờ.
 */

/* ------------------------------------------------------------------ */
/*  Tham số mặc định                                                  */
/* ------------------------------------------------------------------ */

/** Thời gian khoá Main Thread (ms) → kéo TBT (30% tổng điểm). */
const DEFAULT_TBT_BLOCK_MS = 500;

/** Chiều cao banner chèn muộn (px) → kéo CLS (25% tổng điểm). */
const DEFAULT_CLS_BANNER_PX = 150;

/** Độ trễ trước khi hiện ảnh hero (ms) → kéo LCP (25% tổng điểm). */
const DEFAULT_LCP_DELAY_MS = 1500;

/** Độ trễ trước khi render nội dung chính (ms) → kéo LCP (25% tổng điểm). */
const DEFAULT_CONTENT_DELAY_MS = 1500;

type DegradeFlags = {
  tbt: boolean;
  cls: boolean;
  lcp: boolean;
  delay: boolean;
  heavy: boolean;
};

type Config = DegradeFlags & {
  tbtBlockMs: number;
  clsBannerPx: number;
  lcpDelayMs: number;
  contentDelayMs: number;
};

/**
 * Đọc cấu hình từ biến môi trường.
 *
 * Biến `NEXT_PUBLIC_*` được inline lúc build → phải đọc ở module scope,
 * không đọc trong `useEffect` (sẽ không thấy giá trị sau hydration).
 */
function readConfig(): Config {
  const raw = (process.env.NEXT_PUBLIC_PERF_DEGRADE ?? "").toLowerCase();

  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  /**
   * Tìm mục có tên `name` và trả về cường độ nếu có.
   *
   *   "tbt"        → không có cường độ → dùng mặc định
   *   "tbt:800"    → cường độ 800
   */
  const find = (name: string): { on: boolean; value?: number } => {
    for (const item of items) {
      const [key, rawValue] = item.split(":");
      if (key.trim() !== name) continue;
      const value = rawValue ? Number(rawValue) : NaN;
      return { on: true, ...(Number.isFinite(value) ? { value } : {}) };
    }
    return { on: false };
  };

  // "all" bật tất cả — tiện cho benchmark nhanh.
  const all = items.includes("all");

  const tbt = find("tbt");
  const cls = find("cls");
  const lcp = find("lcp");
  const delay = find("delay");

  return {
    tbt: all || tbt.on,
    cls: all || cls.on,
    lcp: all || lcp.on,
    delay: all || delay.on,
    heavy: all || find("heavy").on,
    tbtBlockMs: tbt.value ?? DEFAULT_TBT_BLOCK_MS,
    clsBannerPx: cls.value ?? DEFAULT_CLS_BANNER_PX,
    lcpDelayMs: lcp.value ?? DEFAULT_LCP_DELAY_MS,
    contentDelayMs: delay.value ?? DEFAULT_CONTENT_DELAY_MS,
  };
}

const CONFIG = readConfig();

/** Cờ nào đang bật (dùng cho các component khác kiểm tra). */
export const PERF_DEGRADE_FLAGS: DegradeFlags = {
  tbt: CONFIG.tbt,
  cls: CONFIG.cls,
  lcp: CONFIG.lcp,
  delay: CONFIG.delay,
  heavy: CONFIG.heavy,
};

/** Cấu hình đầy đủ (gồm cường độ). */
export const PERF_DEGRADE_CONFIG = CONFIG;

/** Có bất kỳ cờ nào đang bật không. */
export const PERF_DEGRADE_ACTIVE =
  CONFIG.tbt || CONFIG.cls || CONFIG.lcp || CONFIG.delay || CONFIG.heavy;

/**
 * Khoá Main Thread đồng bộ — kéo TBT.
 *
 * Vòng `while` chạy cứng `tbtBlockMs` mili-giây, chặn toàn bộ Main Thread
 * nên trình duyệt không xử lý được input/paint nào trong khoảng thời gian đó
 * → TBT tăng vọt.
 *
 * Chỉ chạy 1 lần sau khi trang tải xong (mount), và chỉ trên trình duyệt
 * (guard `typeof window`) để không ảnh hưởng render phía server.
 */
export function SlowMainThread() {
  useEffect(() => {
    if (!CONFIG.tbt) return;

    // Chờ trang tải xong rồi mới khoá — đúng như kịch bản "trang vừa tải xong".
    const id = window.setTimeout(() => {
      const start = performance.now();
      while (performance.now() - start < CONFIG.tbtBlockMs) {
        // Cố tình đồng bộ — không được dùng `await`.
      }
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  return null;
}

/**
 * Chèn banner cao sau `clsBannerPx` mà không đặt sẵn chiều cao → kéo CLS.
 *
 * Vì khối banner chỉ xuất hiện sau khi render, toàn bộ nội dung bên dưới bị
 * đẩy xuống → đây chính là "layout shift" mà CLS đo.
 *
 * Cường độ = **chiều cao (px)** → càng cao, CLS càng lớn (có thể tinh chỉnh).
 */
export function LateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!CONFIG.cls) return;

    // Trễ nhỏ (1.2s) để banner xuất hiện SAU lần paint đầu tiên.
    const id = window.setTimeout(() => setShow(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  if (!show) return null;

  return (
    <div
      data-perf-degrade="cls"
      style={{
        height: `${CONFIG.clsBannerPx}px`,
        background: "#f5f5f5",
      }}
    >
      <div className="container-page flex h-full items-center">
        <p className="text-sm text-ink-600">
          Banner thông báo — hiện muộn để kiểm thử CLS.
        </p>
      </div>
    </div>
  );
}

/**
 * Hook trì hoãn: trả `false` cho tới khi đủ `ms`.
 *
 * Chỉ hoạt động khi cờ bật — mặc định trả `true` ngay lập tức nên trang
 * render y như cũ.
 */
function useDelayed(ms: number, enabled: boolean): boolean {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const id = window.setTimeout(() => setReady(true), ms);
    return () => window.clearTimeout(id);
  }, [ms, enabled]);

  return ready;
}

/**
 * Trì hoãn render nội dung chính → kéo LCP.
 *
 * Component cha (`page.tsx`) bọc nội dung trong `<DelayedRender>`: khi cờ
 * `delay` bật, con dung **không render** cho tới khi đủ `contentDelayMs`.
 *
 * Vì `children` tới từ Server Component nên đã có sẵn trong RSC payload —
 * nhưng trình duyệt chỉ **paint** ra khi component render → phần tử LCP
 * (ảnh hero / tiêu đề) xuất hiện muộn → chỉ số LCP tăng.
 *
 * ── Vì sao giữ chỗ (`min-height`) ──────────────────────────────────────────
 *
 * Nếu render nội dung vào một vùng trống rồi mới đổ nội dung vào sau, toàn
 * bộ footer/nội dung bên dưới sẽ bị đẩy xuống → phát sinh CLS lớn (0.9+)
 * *không kiểm soát được*, làm điểm số nhảy loạn.
 *
 * Giữ sẵn một khối chiều cao tối thiểu giúp:
 *   - LCP vẫn chậm (nội dung chính đến muộn) — đúng mục đích của cờ `delay`
 *   - CLS = 0 (không có gì bị đẩy) — CLS được kiểm soát riêng bằng cờ `cls`
 *
 * Nhờ vậy điểm Performance phụ thuộc vào các tham số đã đoều chỉnh, ổn định
 * hơn nhiều.
 */
export function DelayedRender({ children }: { children: React.ReactNode }) {
  const ready = useDelayed(CONFIG.contentDelayMs, CONFIG.delay);

  if (!ready) {
    // Giữ chỗ → không gây layout shift khi nội dung xuất hiện.
    return (
      <div
        aria-hidden
        style={{ minHeight: "100vh", contentVisibility: "hidden" }}
      />
    );
  }

  return <>{children}</>;
}

/**
 * Hook dùng trong `HeroCarousel`: trì hoãn hiện ảnh nền hero → kéo LCP.
 *
 * Trả `true` khi ảnh nên được render. Khi cờ `lcp` bật, ảnh hero bị giữ lại
 * `lcpDelayMs` → phần tử LCP (ảnh nền phủ kín viewport) xuất hiện muộn.
 */
export function useHeroImageDelay(): boolean {
  return useDelayed(CONFIG.lcpDelayMs, CONFIG.lcp);
}
