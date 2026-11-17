import { create } from "zustand";
import { persist } from "zustand/middleware";

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };

type ToastState = {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
};

let counter = 0;

export const useToast = create<ToastState>()(
  persist(
    (set) => ({
      toasts: [],
      push: (message, tone = "success") =>
        set((state) => ({
          toasts: [...state.toasts, { id: ++counter, message, tone }],
        })),
      dismiss: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    { name: "biasbag-toasts" },
  ),
);
