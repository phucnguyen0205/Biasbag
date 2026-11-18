"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/auth";
import { hasAuthCookie } from "@/lib/auth/auth-cookie";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
};

type AuthState = {
  /** User hiện tại, `null` nếu chưa đăng nhập. */
  user: AuthUser | null;
  /** Đang tải trạng thái đăng nhập — chưa kết luận được thì `true`. */
  loading: boolean;
};

/**
 * ════════════════════════════════════════════════════════════════════════
 * AUTH CLIENT — SINGLETON (dùng chung cho toàn bộ component)
 * ════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Vì sao phải là singleton?
 *
 * Trước đây mỗi component gọi `useAuthUser()` đều tạo MỘT Supabase client
 * riêng + MỘT listener `onAuthStateChange`. Trang chủ có tới ~8 nút "Thêm
 * vào giỏ" → 8 client + 8 listener + 8 lần đọc session.
 *
 * Hậu quả:
 *   • Nhiều listener cùng đọc cookie ⇒ main thread bận, TBT tăng.
 *   • `getSession()` gọi lặp lại ⇒ nhiều round-trip không cần thiết.
 *
 * Nay chỉ có **1 client + 1 listener** dùng chung; các hook chỉ subscribe
 * vào kết quả.
 *
 * ── Tối ưu băng thông ────────────────────────────────────────────────────
 *
 * `supabase-js` + `@supabase/ssr` (~260KB uncompressed) được **dynamic
 * import** ⇒ không nằm trong bundle tải ngay, chỉ tải sau khi trang đã
 * render xong (sau LCP/FCP) ⇒ không ảnh hưởng LCP/TBT.
 *
 * ── Tối ưu #2: KHÔNG tải thư viện cho khách chưa đăng nhập ───────────────
 *
 * Đa số khách KHÔNG đăng nhập. Tải 260KB `supabase-js` chỉ để biết
 * "chưa đăng nhập" là lãng phí hoàn toàn.
 *
 * Nhờ `hasAuthCookie()` (đọc `document.cookie`, 0 byte JS) ta biết ngay
 * khách có phiên hay không:
 *   • Không có cookie phiên → kết luận "chưa đăng nhập" NGAY, **không nạp
 *     thư viện** ⇒ tiết kiệm 260KB + ~150ms main thread ⇒ TBT & LCP giảm.
 *   • Có cookie phiên → nạp `supabase-js` như cũ (lấy role, nghe
 *     `onAuthStateChange`).
 */
type Listener = (state: AuthState) => void;

let currentState: AuthState = { user: null, loading: true };
let listeners: Listener[] = [];
/** Đảm bảo chỉ khởi tạo 1 lần cho toàn phiên (client-side). */
let initPromise: Promise<void> | null = null;

function emit(next: AuthState) {
  currentState = next;
  for (const l of listeners) l(next);
}

function subscribe(l: Listener) {
  listeners.push(l);
  // Đồng bộ trạng thái hiện tại cho subscriber mới.
  l(currentState);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

function ensureStarted() {
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve) => {
    /**
     * ⏳ TRÌ HOÃN tải `supabase-js` tới khi trình duyệt rảnh.
     *
     * `supabase-js` + `@supabase/ssr` (~260KB uncompressed) là chunk LỚN
     * nhất của trang. Nếu tải ngay khi hydrate, nó tranh giành băng thông
     * với **ảnh LCP** (hero) → LCP chậm hơn.
     *
     * `requestIdleCallback` ⇒ chỉ tải khi main thread rảnh và sau khi
     * trình duyệt đã vẽ xong phần nhìn thấy đầu tiên.
     *
     * Fallback `setTimeout` cho trình duyệt không hỗ trợ.
     */
    const start = () => {
      void (async () => {
        try {
          /**
           * ⚡ CHỐT: khách chưa đăng nhập → không nạp thư viện 260KB.
           *
           * `document.cookie` cho biết có phiên hay không (0 byte JS tải
           * thêm). Nếu không có cookie phiên ⇒ chắc chắn chưa đăng nhập ⇒
           * kết luận luôn, khỏi nạp `supabase-js`.
           */
          if (!hasAuthCookie()) {
            emit({ user: null, loading: false });
            return;
          }

          const { createClient, isSupabaseConfigured } = await import(
            "@/lib/supabase/client"
          );

          if (!isSupabaseConfigured()) {
            emit({ user: null, loading: false });
            return;
          }

          const supabase = createClient();

          async function load() {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session?.user) {
              emit({ user: null, loading: false });
              return;
            }

            // Role lấy từ bảng `profiles` (RLS cho user đọc hồ sơ của chính mình).
            const { data: profile } = await supabase
              .from("profiles")
              .select("role, full_name")
              .eq("id", session.user.id)
              .maybeSingle();

            emit({
              user: {
                id: session.user.id,
                email: session.user.email ?? null,
                name: profile?.full_name ?? null,
                role: (profile?.role as Role | undefined) ?? "customer",
              },
              loading: false,
            });
          }

          void load();

          supabase.auth.onAuthStateChange(() => {
            void load();
          });
        } catch {
          // Supabase lỗi (mạng, config) → coi như chưa đăng nhập.
          emit({ user: null, loading: false });
        } finally {
          resolve();
        }
      })();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const ric = window.requestIdleCallback as (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      ric(start, { timeout: 3000 });
    } else {
      setTimeout(start, 1200);
    }
  });

  return initPromise;
}

/**
 * Theo dõi trạng thái đăng nhập ở phía client.
 *
 * Dùng `auth.getSession()` (đọc cookie phiên do `@supabase/ssr` ghi) thay vì
 * `getUser()` (gọi mạng) → trả kết quả tức thì, không chặn render.
 *
 * Hook dùng chung cho các component cần biết "khách đã đăng nhập chưa":
 * nút thêm vào giỏ, trang giỏ hàng, trang thanh toán…
 */
export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>(currentState);

  useEffect(() => {
    const unsub = subscribe(setState);
    void ensureStarted();
    return unsub;
  }, []);

  return state;
}

/**
 * Hook cho menu tài khoản ở header.
 *
 * Dùng chung singleton với `useAuthUser` ⇒ không tạo client/ listener thứ 2.
 */
export function useAuthProfile(): AuthUser | null {
  const { user } = useAuthUser();
  return user;
}
