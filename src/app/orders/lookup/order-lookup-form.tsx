"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { lookupOrder, type LookupState } from "./actions";

const initialState: LookupState = { status: "idle" };

export default function OrderLookupForm() {
  const [state, formAction, pending] = useActionState(
    lookupOrder,
    initialState,
  );

  return (
    <form action={formAction} className="card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="orderCode">
            Mã đơn hàng *
          </label>
          <input
            id="orderCode"
            name="orderCode"
            className="input font-mono uppercase"
            placeholder="BB-241117-000123"
            autoComplete="off"
            required
          />
          {state.fieldErrors?.orderCode && (
            <p className="mt-1 text-xs text-rose-600">
              {state.fieldErrors.orderCode}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="contact">
            Email hoặc số điện thoại *
          </label>
          <input
            id="contact"
            name="contact"
            className="input"
            placeholder="email@example.com"
            autoComplete="email"
            required
          />
          {state.fieldErrors?.contact && (
            <p className="mt-1 text-xs text-rose-600">
              {state.fieldErrors.contact}
            </p>
          )}
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-accent mt-5 w-full py-3 sm:w-auto sm:px-8"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tra cứu…
          </>
        ) : (
          <>
            <Search className="h-4 w-4" /> Tra cứu đơn hàng
          </>
        )}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Bạn không cần đăng nhập. Hãy nhập mã đơn hàng (mã đơn được hiển thị
        ngay sau khi đặt hàng) cùng email hoặc số điện thoại bạn đã dùng để
        đặt. Nếu bạn đã có tài khoản, hãy{" "}
        <Link href="/orders" className="underline">
          đăng nhập để xem toàn bộ lịch sử đơn hàng
        </Link>
        .
      </p>
    </form>
  );
}
