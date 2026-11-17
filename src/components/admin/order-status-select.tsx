"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateOrderStatus } from "@/app/admin/actions";
import { ORDER_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-blue-100 text-blue-800",
  indigo: "bg-indigo-100 text-indigo-800",
  emerald: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
};

export default function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(status);

  const tone = ORDER_STATUS[status as keyof typeof ORDER_STATUS]?.tone;

  function handleChange(next: string) {
    const prev = value;
    setValue(next);
    setError(null);

    startTransition(async () => {
      const result = await updateOrderStatus(orderId, next);
      if (result.status === "error") {
        setValue(prev);
        setError(result.message ?? "Không thể cập nhật trạng thái.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={pending}
          aria-label="Trạng thái đơn hàng"
          className={cn(
            "input w-auto py-1.5 text-xs",
            TONE_CLASS[tone ?? ""] ?? "",
          )}
        >
          {Object.entries(ORDER_STATUS).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
        </select>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />}
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
