"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { saveProduct, type AdminState } from "@/app/admin/actions";
import ImageUploader from "@/components/admin/image-uploader";
import type { Category, ProductWithCategory } from "@/lib/types";

const initialState: AdminState = { status: "idle" };

export default function ProductForm({
  product,
  categories,
}: {
  product?: ProductWithCategory;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState);
  const isEdit = Boolean(product);

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <section className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Thông tin chính</h2>

        <div>
          <label className="label" htmlFor="name">
            Tên sản phẩm *
          </label>
          <input
            id="name"
            name="name"
            defaultValue={product?.name}
            className="input"
            placeholder="Túi Tote Canvas Hàn Quốc — Dây Khoang Dài"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="description">
            Mô tả
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={product?.description ?? ""}
            className="input resize-none"
            placeholder="Chi tiết về sản phẩm…"
          />
        </div>

        <ImageUploader
          name="imageUrl"
          defaultUrl={product?.image_url ?? ""}
        />

        <div>
          <label className="label" htmlFor="categoryId">
            Dòng sản phẩm
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={product?.category_id ?? ""}
            className="input"
          >
            <option value="">— Chưa phân loại —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="features">
            Đặc điểm (mỗi dòng một mục)
          </label>
          <textarea
            id="features"
            name="features"
            rows={4}
            defaultValue={(product?.features ?? []).join("\n")}
            className="input resize-none"
            placeholder={"Chất liệu canvas dày, chịu lực tốt\nDây khoang dài đeo vai"}
          />
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Giá & kho</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">
              Giá (VNĐ) *
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min={0}
              step={1000}
              defaultValue={product?.price ?? 0}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="salePrice">
              Giá khuyến mãi
            </label>
            <input
              id="salePrice"
              name="salePrice"
              type="number"
              min={0}
              step={1000}
              defaultValue={product?.sale_price ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="stock">
              Tồn kho *
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              defaultValue={product?.stock ?? 0}
              className="input"
              required
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Thuộc tính</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["brand", "Thương hiệu"],
              ["material", "Chất liệu"],
              ["color", "Màu sắc"],
              ["size", "Kích thước"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={key}>
                {label}
              </label>
              <input
                id={key}
                name={key}
                defaultValue={product?.[key] ?? ""}
                className="input"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={product?.is_active ?? true}
              className="h-4 w-4 rounded border-ink-300 text-blush-600"
            />
            Hiển thị trên cửa hàng
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={product?.is_featured ?? false}
              className="h-4 w-4 rounded border-ink-300 text-blush-600"
            />
            Sản phẩm nổi bật
          </label>
        </div>
      </section>

      {state.message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn-accent">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Lưu thay đổi" : "Tạo sản phẩm"}
        </button>
        <Link href="/admin/products" className="btn-secondary">
          Hủy
        </Link>
      </div>
    </form>
  );
}
