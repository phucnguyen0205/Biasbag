import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find(
            (l) => l.productId === line.productId,
          );

          // Không cho thêm vượt quá tồn kho (nếu biết tồn kho).
          const max = line.stock ?? Number.MAX_SAFE_INTEGER;
          const wanted = (existing?.quantity ?? 0) + quantity;
          const capped = Math.min(wanted, max);

          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === line.productId
                  ? { ...l, quantity: capped, stock: line.stock ?? l.stock }
                  : l,
              ),
            };
          }

          return {
            lines: [
              ...state.lines,
              { ...line, quantity: Math.min(quantity, max) },
            ],
          };
        }),
      remove: (productId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.productId !== productId),
        })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId ? { ...l, quantity } : l,
                ),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "biasbag-cart" },
  ),
);

export const selectCartCount = (state: CartState) =>
  state.lines.reduce((sum, l) => sum + l.quantity, 0);

export const selectCartSubtotal = (state: CartState) =>
  state.lines.reduce(
    (sum, l) => sum + (l.salePrice ?? l.price) * l.quantity,
    0,
  );
