"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { updatePaymentStatus } from "@/app/admin/actions";
import { PAYMENT_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800",
  emerald: "bg-emerald-100 text-emerald-800",
  rose: "bg-rose-100 text-rose-800",
};

/**
 * Nút đánh dấu đã thu tiền.
 *
 * Thanh toán là trạng thái RIÊNG biệt với trạng thái xử lý đơn:
 *   - `status`         → đơn đang ở bước nào (chờ xác nhận / đang giao / đã giao)
 *   - `payment_status` → đã thu được tiền chưa
 *
 * Admin bấm "Đã thu tiền" sau khi nhận tiền mặt (COD) hoặc xác nhận
 * chuyển khoản / MoMo đã về tài khoản.
 */
export default function PaymentStatusButton({
  orderId,
  paymentStatus,
}: {
  orderId: string;
  paymentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(paymentStatus);

  const info = PAYMENT_STATUS[value as keyof typeof PAYMENT_STATUS];
  const isPaid = value === "paid";

  function handleClick() {
    const prev = value;
    const next = isPaid ? "unpaid" : "paid";
    setValue(next);
    setError(null);

    startTransition(async () => {
      const result = await updatePaymentStatus(orderId, next);
      if (result.status === "error") {
        setValue(prev);
        setError(result.message ?? "Không thể cập nhật trạng thái thanh toán.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={
          isPaid
            ? "Bấm để chuyển sang chưa thanh toán"
            : "Bấm để xác nhận đã thu tiền"
        }
        className={cn(
          "badge inline-flex items-center gap-1.5 transition disabled:opacity-60",
          TONE_CLASS[info?.tone ?? ""] ?? "bg-ink-100 text-ink-700",
          !isPaid && "hover:brightness-95",
        )}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isPaid ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : null}
        {info?.label ?? value}
      </button>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
