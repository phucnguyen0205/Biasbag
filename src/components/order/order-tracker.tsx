import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

const STEPS = [
  { key: "pending", label: "Đã đặt" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "shipping", label: "Đang giao" },
  { key: "delivered", label: "Đã giao" },
] as const;

export default function OrderTracker({ status }: { status: string }) {
  // Đơn bị huỷ không hiển thị timeline.
  if (status === "cancelled") {
    return (
      <p className="text-sm text-rose-600">
        Đơn hàng này đã được huỷ. Vui lòng liên hệ hotline{" "}
        <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="underline">
          {SITE.phone}
        </a>{" "}
        để được hỗ trợ.
      </p>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);
  const safeIndex = currentIndex < 0 ? 0 : currentIndex;

  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i <= safeIndex;
        const isCurrent = i === safeIndex;

        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition",
                  done
                    ? "bg-blush-600 text-white"
                    : "border border-ink-200 bg-white text-ink-400",
                  isCurrent && "ring-2 ring-blush-200",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] sm:text-xs",
                  done ? "text-ink-800" : "text-ink-400",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  i < safeIndex ? "bg-blush-400" : "bg-ink-200",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
