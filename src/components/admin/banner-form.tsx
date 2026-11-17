"use client";

import { useActionState, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import {
  addBanner,
  updateBanner,
  type BannerState,
} from "@/app/admin/banner-actions";
import BannerImagePicker from "@/components/admin/banner-image-picker";
import BannerLibrary from "@/components/admin/banner-library";
import type { Banner } from "@/lib/types";

const initialState: BannerState = { status: "idle" };

export default function BannerForm({ banner }: { banner?: Banner }) {
  const isEdit = Boolean(banner);

  // Giá trị ảnh do admin chọn (từ thư viện hoặc upload).
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? "");

  // Ảnh riêng cho màn hình dọc (mobile). Rỗng = dùng chung ảnh desktop.
  const [imageUrlMobile, setImageUrlMobile] = useState(
    banner?.image_url_mobile ?? "",
  );

  // Form thêm và form sửa dùng hai action khác nhau.
  const [addState, addAction, addPending] = useActionState(
    addBanner,
    initialState,
  );
  const [editState, editAction, editPending] = useActionState(
    updateBanner,
    initialState,
  );

  const state = isEdit ? editState : addState;
  const pending = isEdit ? editPending : addPending;

  return (
    <form
      action={isEdit ? editAction : addAction}
      className="card space-y-4 p-5"
      key={banner?.id ?? "new"}
    >
      {banner && <input type="hidden" name="id" value={banner.id} />}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-900">
          {isEdit ? "Cập nhật banner" : "Thêm banner mới"}
        </h2>
      </div>

      <div>
        <label className="label" htmlFor="banner-imageUrl">
          Ảnh banner (desktop) *
        </label>
        <BannerImagePicker
          name="imageUrl"
          defaultUrl={banner?.image_url ?? ""}
          value={imageUrl}
          onChange={setImageUrl}
          hint="Ảnh nền ngang, kích thước tối thiểu 1920px rộng."
        />
      </div>

      {/* ── Ảnh riêng cho mobile ────────────────────────────────────────
          Ảnh ngang bị cắt trên màn hình dọc nên admin có thể upload thêm
          1 ảnh dọc riêng. Bỏ trống = dùng chung ảnh desktop. */}
      <div className="rounded-xl border border-dashed border-blush-300 bg-blush-50/40 p-4">
        <div className="mb-3 flex items-start gap-2">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-blush-600" />
          <div>
            <p className="text-sm font-semibold text-ink-900">
              Ảnh riêng cho giao diện mobile
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
              Dùng trên màn hình dọc (điện thoại). Nên có tỉ lệ dọc, ví dụ
              1080×1350px — chủ thể sẽ không bị cắt. Để trống thì mọi thiết bị
              dùng chung ảnh desktop.
            </p>
          </div>
        </div>

        <BannerImagePicker
          name="imageUrlMobile"
          defaultUrl={banner?.image_url_mobile ?? ""}
          value={imageUrlMobile}
          onChange={setImageUrlMobile}
          aspect="portrait"
          hint="Ảnh dọc, ví dụ 1080×1350px."
        />
      </div>

      <BannerLibrary current={imageUrl} onSelect={setImageUrl} />

      <div>
        <label className="label" htmlFor="altText">
          Mô tả ảnh (alt text)
        </label>
        <input
          id="altText"
          name="altText"
          defaultValue={banner?.alt_text ?? ""}
          maxLength={160}
          className="input"
          placeholder="Túi xách BIAS BAG — bộ sưu tập mùa hè"
        />
        <p className="mt-1 text-xs text-ink-400">
          Dùng cho SEO và trình đọc màn hình.
        </p>
      </div>

      {isEdit && banner && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={banner.is_active}
            className="h-4 w-4 rounded border-ink-300 text-blush-600"
          />
          Hiển thị trên trang chủ
        </label>
      )}

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

      <button type="submit" disabled={pending} className="btn-accent">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isEdit ? "Lưu thay đổi" : "Thêm banner"}
      </button>
    </form>
  );
}
