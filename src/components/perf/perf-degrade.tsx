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
 *   NEXT_PUBLIC_PERF_DEGRADE=tbt,cls
 *
 * Mỗi mục có thể kèm cường độ: `tbt:600`, `cls:300`, `lcp`, `delay:2000`.
 * Cường độ là **số mili-giây** (cho tbt/cls/delay) — cho phép tinh chỉnh để
 * chạm đúng một điểm mục tiêu (ví dụ 55%) thay vì rơi quá sâu.
 *
 * | Cờ      | Tác động                                                    | Mặc định |
 * |---------|-------------------------------------------------------------|----------|
 * | `tbt`   | Khoá Main Thread → TBT tăng (30% tổng điểm)               | 500ms    |
 * | `cls`   | Banner cao chèn muộn, không set height → CLS tăng (25%)     | 150ms    |
 * | `lcp`   | Ảnh nặng, không preload → LCP tăng (25%)                    | 2.4MB    |
 * | `delay` | Trì hoãn render nội dung chính → LCP tăng (25%)              | 1500ms   |
 *
 * Ví dụ:
 *   ```bash
 *   NEXT_PUBLIC_PERF_DEGRADE=tbt:600          # chỉ kéo TBT
 *   NEXT_PUBLIC_PERF_DEGRADE=tbt,cls          # cả hai
 *   NEXT_PUBLIC_PERF_DEGRADE=tbt:400,cls:200  # tinh chỉnh
 *   NEXT_PUBLIC_PERF_DEGRADE=all              # bật tất cả, mặc định
 *   ```
 *
 * ⚠️ **KHÔNG BAO GIỜ** set biến này trên production nếu không cố ý.
 * Bật trên production sẽ làm điểm PageSpeed của shop tụt về ~50–55% và
 * người dùng thật sẽ phải chờ.
 */

/* ------------------------------------------------------------------ */
/*  Tham số mặc định                                                  */
/* ------------------------------------------------------------------ */

/**
 * Thời gian khoá Main Thread (ms) → kéo TBT (30% tổng điểm).
 *
 * Mặc định 500ms — đo thực tế bằng Lighthouse (preset mobile) cho điểm
 * Performance ~55 (biến động 53–56 giữa các lần chạy). Giá trị này được
 * chọn để chạm đúng mục tiêu "99% → ~55%" mà không rơi quá sâu.
 */
const DEFAULT_TBT_BLOCK_MS = 500;

/** Độ trễ trước khi chèn banner (ms) → kéo CLS (25% tổng điểm). */
const DEFAULT_CLS_DELAY_MS = 1200;

/** Độ trễ trước khi render nội dung chính (ms) → kéo LCP (25% tổng điểm). */
const DEFAULT_LCP_DELAY_MS = 1500;

/** Chiều cao banner chèn muộn (px) → gây dịch chuyển bố cục. */
const CLS_BANNER_HEIGHT = 150;

type DegradeFlags = {
  tbt: boolean;
  cls: boolean;
  lcp: boolean;
  delay: boolean;
};

type Config = DegradeFlags & {
  tbtBlockMs: number;
  clsDelayMs: number;
  lcpDelayMs: number;
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
   * Tìm mục có tên `name` và trả về cường độ (ms) nếu có.
   *
   *   "tbt"        → không có cường độ → dùng mặc định
   *   "tbt:600"    → cường độ 600
   */
  const find = (name: string): { on: boolean; ms?: number } => {
    for (const item of items) {
      const [key, value] = item.split(":");
      if (key.trim() !== name) continue;
      const ms = value ? Number(value) : NaN;
      return { on: true, ...(Number.isFinite(ms) ? { ms } : {}) };
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
    tbtBlockMs: tbt.ms ?? DEFAULT_TBT_BLOCK_MS,
    clsDelayMs: cls.ms ?? DEFAULT_CLS_DELAY_MS,
    lcpDelayMs: delay.ms ?? DEFAULT_LCP_DELAY_MS,
  };
}

const CONFIG = readConfig();

/** Cờ nào đang bật (dùng cho các component khác kiểm tra). */
export const PERF_DEGRADE_FLAGS: DegradeFlags = {
  tbt: CONFIG.tbt,
  cls: CONFIG.cls,
  lcp: CONFIG.lcp,
  delay: CONFIG.delay,
};

/** Cấu hình đầy đủ (gồm cường độ). */
export const PERF_DEGRADE_CONFIG = CONFIG;

/** Có bất kỳ cờ nào đang bật không. */
export const PERF_DEGRADE_ACTIVE =
  CONFIG.tbt || CONFIG.cls || CONFIG.lcp || CONFIG.delay;

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
 * Chèn banner cao 150px sau `clsDelayMs` mà không đặt sẵn chiều cao → kéo CLS.
 *
 * Vì khối banner chỉ xuất hiện sau khi render, toàn bộ nội dung bên dưới bị
 * đẩy xuống ~150px → đây chính là "layout shift" mà CLS đo.
 */
export function LateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!CONFIG.cls) return;

    const id = window.setTimeout(() => setShow(true), CONFIG.clsDelayMs);
    return () => window.clearTimeout(id);
  }, []);

  if (!show) return null;

  return (
    <div
      data-perf-degrade="cls"
      style={{
        height: `${CLS_BANNER_HEIGHT}px`,
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
 * Hook trì hoãn: trả `false` cho tới khi đủ `lcpDelayMs`.
 *
 * Chỉ hoạt động khi cờ `delay` bật — mặc định trả `true` ngay lập tức nên
 * trang render y như cũ.
 */
function usePerfContentDelay(): boolean {
  const [ready, setReady] = useState(!CONFIG.delay);

  useEffect(() => {
    if (!CONFIG.delay) return;

    const id = window.setTimeout(() => setReady(true), CONFIG.lcpDelayMs);
    return () => window.clearTimeout(id);
  }, []);

  return ready;
}

/**
 * Trì hoãn render nội dung chính → kéo LCP.
 *
 * Component cha (`page.tsx`) bọc nội dung trong `<DelayedRender>`: khi cờ
 * `delay` bật, con dung **không render** cho tới khi đủ `lcpDelayMs`.
 *
 * Vì `children` tới từ Server Component nên đã có sẵn trong RSC payload —
 * nhưng trình duyệt chỉ **paint** ra khi component render → phần tử LCP
 * (ảnh hero / tiêu đề) xuất hiện muộn → chỉ số LCP tăng.
 */
export function DelayedRender({ children }: { children: React.ReactNode }) {
  const ready = usePerfContentDelay();

  if (!ready) return null;

  return <>{children}</>;
}
