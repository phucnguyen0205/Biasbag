"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/admin/actions";
import { useToast } from "@/lib/store/toast";

export default function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const push = useToast((s) => s.push);

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="btn-ghost h-9 w-9 px-0 hover:text-rose-600"
        aria-label={`Xóa ${name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await deleteProduct(id);
            push(res.message ?? "", res.status === "error" ? "error" : "success");
            setConfirming(false);
          })
        }
        className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
      >
        Xóa
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="btn-ghost h-9 px-2 text-xs"
      >
        Hủy
      </button>
    </div>
  );
}
