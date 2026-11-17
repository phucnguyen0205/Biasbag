"use client";

import { useEffect, useState } from "react";
import { useCart, selectCartCount } from "@/lib/store/cart";

/** Hook an toàn hydration: giá trị null cho tới khi client đã mount. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** Số lượng sản phẩm trong giỏ, an toàn SSR. */
export function useCartCount() {
  const count = useCart(selectCartCount);
  const hydrated = useHydrated();
  return hydrated ? count : 0;
}
