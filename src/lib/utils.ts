import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number, locale = "vi-VN") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPriceShort(value: number, locale = "vi-VN") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Giá thực sự khách phải trả.
 *
 * `sale_price` là giá bán thật do admin đặt trong CMS (không phải giá gốc
 * bị gạch ngang để tạo cảm giác giảm giá). Nếu không có giá khuyến mại
 * hoặc giá khuyến mại ≥ giá gốc → dùng giá gốc.
 */
export function finalPrice(price: number, salePrice: number | null) {
  return salePrice && salePrice < price ? salePrice : price;
}

export function formatDate(iso: string, locale = "vi-VN") {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}
