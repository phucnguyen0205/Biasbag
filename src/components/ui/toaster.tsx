"use client";

import { useEffect } from "react";
import { useToast } from "@/lib/store/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`card flex items-start gap-3 px-4 py-3 text-sm shadow-lg ${
            t.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : t.tone === "info"
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-xs font-semibold opacity-60 hover:opacity-100"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
