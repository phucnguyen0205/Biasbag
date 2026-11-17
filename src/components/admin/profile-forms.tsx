"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import {
  updateAdminEmail,
  updateAdminPassword,
  type ProfileState,
} from "@/app/admin/profile-actions";

const initialState: ProfileState = { status: "idle" };

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-accent">
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}

function Message({
  tone,
  text,
}: {
  tone: "success" | "error";
  text?: string;
}) {
  if (!text) return null;
  return (
    <p
      className={`rounded-lg px-4 py-3 text-sm ${
        tone === "success"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {text}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Đổi email                                                            */
/* ------------------------------------------------------------------ */

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action] = useActionState(updateAdminEmail, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Thành công → xoá ô nhập để admin nhập email mới lần sau.
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email mới (gmail) *
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={currentEmail}
            placeholder="admin@gmail.com"
            className="input pl-9"
            autoComplete="email"
          />
        </div>
        <p className="mt-1 text-xs text-ink-400">
          Sau khi đổi, hãy đăng nhập lại bằng email mới. Email được xác nhận
          tự động nên không cần chờ link xác nhận.
        </p>
        {state.fieldErrors?.email && (
          <p className="mt-1 text-xs text-rose-600">{state.fieldErrors.email}</p>
        )}
      </div>

      <Message tone={state.status === "success" ? "success" : "error"} text={state.message} />

      <SubmitButton label="Lưu email mới" pendingLabel="Đang lưu…" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Đổi mật khẩu                                                         */
/* ------------------------------------------------------------------ */

export function PasswordForm() {
  const [state, action] = useActionState(updateAdminPassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="currentPassword">
          Mật khẩu hiện tại *
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            className="input pl-9"
            autoComplete="current-password"
          />
        </div>
        {state.fieldErrors?.currentPassword && (
          <p className="mt-1 text-xs text-rose-600">
            {state.fieldErrors.currentPassword}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="newPassword">
          Mật khẩu mới *
        </label>
        <div className="relative">
          <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            className="input pl-9"
            autoComplete="new-password"
            placeholder="Tối thiểu 8 ký tự, có chữ và số"
          />
        </div>
        {state.fieldErrors?.newPassword && (
          <p className="mt-1 text-xs text-rose-600">
            {state.fieldErrors.newPassword}
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="confirmPassword">
          Xác nhận mật khẩu mới *
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="input"
          autoComplete="new-password"
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="mt-1 text-xs text-rose-600">
            {state.fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <Message
        tone={state.status === "success" ? "success" : "error"}
        text={state.passwordMessage ?? state.message}
      />

      <SubmitButton label="Đổi mật khẩu" pendingLabel="Đang đổi…" />
    </form>
  );
}
