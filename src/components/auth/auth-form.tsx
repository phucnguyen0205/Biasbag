"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { signIn, signUp } from "@/app/login/actions";
import { initialAuthState, type AuthState } from "@/app/login/state";
import { passwordStrength } from "@/lib/validation/auth";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

/**
 * Form đăng nhập / đăng ký — MỘT form duy nhất cho cả khách hàng và admin.
 *
 * Khác biệt giữa user và admin nằm ở TÀI KHOẢN, không nằm ở form:
 * - Khách tự đăng ký → role `customer` (server tự quyết, client không chọn được).
 * - Admin là tài khoản riêng biệt, được tạo sẵn và nâng role thủ công.
 *
 * Sau khi xác thực thành công, server trả về `redirectTo` đúng theo role:
 * admin/staff → `/admin`, khách → `/account`.
 */
export default function AuthForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  // Hai form độc lập: `useActionState` của login và của register không đứa
  // lẫn state lỗi của nhau.
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    initialAuthState,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    signUp,
    initialAuthState,
  );

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const state = mode === "login" ? loginState : registerState;

  const strength = useMemo(() => passwordStrength(password), [password]);

  // Điều hướng sau khi xác thực thành công.
  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state.redirectTo, router]);

  // Đổi tab → reset lỗi cũ để không hiện "Email đã tồn tại" ở tab đăng nhập.
  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setPassword("");
  }

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-blush-200/60 ring-1 ring-blush-100 lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------- Cột trái: thương hiệu ---------------- */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blush-100 via-blush-200 to-blush-300 p-10 lg:flex lg:flex-col">
        {/* Vòng tròn trang trí */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-blush-400/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Image
            src={SITE.logo}
            alt={SITE.name}
            width={60}
            height={38}
            className="h-auto w-15 object-contain"
            unoptimized
          />
          <span className="font-script text-2xl tracking-wide text-blush-700">
            BIAS BAG
          </span>
        </div>

        <div className="relative mt-12 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blush-700">
            <Sparkles className="h-3.5 w-3.5" />
            Phụ kiện nhỏ, phong cách riêng
          </span>

          <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-ink-900">
            Túi in hình,
            <br />
            <span className="text-blush-600">style của riêng bạn.</span>
          </h2>

          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
            Tạo tài khoản để lưu đơn hàng, theo dõi hành trình đơn và nhận
            mẫu mới mỗi tuần — nhanh hơn, gọn hơn, dễ phối hơn.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-ink-700">
            {[
              "Theo dõi đơn hàng theo thời gian thực",
              "Lưu địa chỉ giao hàng cho lần sau",
              "Nhận thông báo khi có mẫu mới",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush-500 text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-500">
          &copy; {new Date().getFullYear()} {SITE.name}. Hẹn gặp bạn ở{" "}
          <span className="font-semibold text-blush-600">Shopee</span> và{" "}
          <span className="font-semibold text-blush-600">Facebook</span>.
        </p>
      </aside>

      {/* ---------------- Cột phải: form ---------------- */}
      <div className="p-6 sm:p-9">
        {/* Logo trên mobile (cột trái bị ẩn ở màn nhỏ) */}
        <div className="mb-6 flex items-center gap-2.5 lg:hidden">
          <Image
            src={SITE.logo}
            alt={SITE.name}
            width={48}
            height={30}
            className="h-auto w-12 object-contain"
            unoptimized
          />
          <span className="font-script text-xl tracking-wide text-blush-700">
            BIAS BAG
          </span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {mode === "login"
            ? "Đăng nhập để xem đơn hàng và quản lý tài khoản của bạn."
            : "Đăng ký miễn phí — chỉ mất 30 giây."}
        </p>

        {/* Chuyển tab Đăng nhập / Đăng ký */}
        <div
          role="tablist"
          aria-label="Đăng nhập hoặc đăng ký"
          className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-blush-50 p-1"
        >
          {(
            [
              { id: "login", label: "Đăng nhập" },
              { id: "register", label: "Đăng ký" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => switchMode(tab.id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-all",
                mode === tab.id
                  ? "bg-white text-blush-700 shadow-sm"
                  : "text-ink-500 hover:text-blush-600",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "login" ? (
          <LoginForm
            state={loginState}
            action={loginAction}
            pending={loginPending}
            next={next}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((v) => !v)}
          />
        ) : (
          <RegisterForm
            state={registerState}
            action={registerAction}
            pending={registerPending}
            next={next}
            password={password}
            onPasswordChange={setPassword}
            strength={strength}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((v) => !v)}
            showConfirm={showConfirm}
            onToggleConfirm={() => setShowConfirm((v) => !v)}
          />
        )}

        {state.status === "error" && state.message && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {state.message}
          </p>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-400">
          Bằng việc đăng nhập / đăng ký, bạn đồng ý với{" "}
          <Link href="/policies" className="font-medium text-blush-600 underline">
            điều khoản sử dụng
          </Link>{" "}
          của BIAS BAG.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form đăng nhập                                                       */
/* ------------------------------------------------------------------ */

function LoginForm({
  state,
  action,
  pending,
  next,
  showPassword,
  onTogglePassword,
}: {
  state: AuthState;
  action: (formData: FormData) => void;
  pending: boolean;
  next?: string;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      <Field
        id="login-email"
        label="Email"
        icon={AtSign}
        error={state.fieldErrors?.email}
      >
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="email@example.com"
          required
          className="input"
        />
      </Field>

      <Field
        id="login-password"
        label="Mật khẩu"
        icon={Lock}
        error={state.fieldErrors?.password}
        action={
          <button
            type="button"
            onClick={onTogglePassword}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="flex items-center gap-1 text-xs font-medium text-ink-400 transition-colors hover:text-blush-600"
          >
            {showPassword ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        }
      >
        <input
          id="login-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          required
          className="input pr-16"
        />
      </Field>

      <div className="flex items-center justify-between pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="h-4 w-4 rounded border-ink-300 text-blush-500 focus:ring-blush-300"
          />
          Ghi nhớ đăng nhập
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn w-full bg-blush-500 py-3 text-base font-semibold text-white shadow-lg shadow-blush-200 hover:bg-blush-600"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập…
          </>
        ) : (
          "Đăng nhập"
        )}
      </button>

    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Form đăng ký                                                         */
/* ------------------------------------------------------------------ */

function RegisterForm({
  state,
  action,
  pending,
  next,
  password,
  onPasswordChange,
  strength,
  showPassword,
  onTogglePassword,
  showConfirm,
  onToggleConfirm,
}: {
  state: AuthState;
  action: (formData: FormData) => void;
  pending: boolean;
  next?: string;
  password: string;
  onPasswordChange: (v: string) => void;
  strength: { score: number; label: string };
  showPassword: boolean;
  onTogglePassword: () => void;
  showConfirm: boolean;
  onToggleConfirm: () => void;
}) {
  const barColor = [
    "bg-ink-200",
    "bg-rose-400",
    "bg-amber-400",
    "bg-lime-500",
    "bg-emerald-500",
  ][strength.score];

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      <Field
        id="reg-name"
        label="Họ và tên"
        icon={User}
        error={state.fieldErrors?.fullName}
      >
        <input
          id="reg-name"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Nguyễn Thị A"
          required
          className="input"
        />
      </Field>

      <Field
        id="reg-email"
        label="Email"
        icon={AtSign}
        error={state.fieldErrors?.email}
      >
        <input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="email@example.com"
          required
          className="input"
        />
      </Field>

      <Field
        id="reg-phone"
        label="Số điện thoại"
        icon={Phone}
        error={state.fieldErrors?.phone}
        hint="Dùng để giao hàng nhanh hơn"
      >
        <input
          id="reg-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="0901234567"
          required
          className="input"
        />
      </Field>

      <Field
        id="reg-password"
        label="Mật khẩu"
        icon={Lock}
        error={state.fieldErrors?.password}
        action={
          <button
            type="button"
            onClick={onTogglePassword}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="flex items-center gap-1 text-xs font-medium text-ink-400 transition-colors hover:text-blush-600"
          >
            {showPassword ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        }
      >
        <input
          id="reg-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Tối thiểu 6 ký tự"
          required
          minLength={6}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="input pr-16"
        />
      </Field>

      {/* Thanh độ mạnh mật khẩu */}
      {password.length > 0 && (
        <div className="-mt-1">
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i < strength.score ? barColor : "bg-ink-150 bg-ink-200",
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-500">
            Độ mạnh mật khẩu:{" "}
            <span className="font-semibold text-ink-700">{strength.label}</span>
          </p>
        </div>
      )}

      <Field
        id="reg-confirm"
        label="Xác nhận mật khẩu"
        icon={Lock}
        error={state.fieldErrors?.confirmPassword}
        action={
          <button
            type="button"
            onClick={onToggleConfirm}
            aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="flex items-center gap-1 text-xs font-medium text-ink-400 transition-colors hover:text-blush-600"
          >
            {showConfirm ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showConfirm ? "Ẩn" : "Hiện"}
          </button>
        }
      >
        <input
          id="reg-confirm"
          name="confirmPassword"
          type={showConfirm ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          required
          className="input pr-16"
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm text-ink-600">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-blush-500 focus:ring-blush-300"
        />
        <span>
          Tôi đồng ý với{" "}
          <Link href="/policies" className="font-medium text-blush-600 underline">
            điều khoản sử dụng
          </Link>{" "}
          và chính sách bảo mật của BIAS BAG.
        </span>
      </label>
      {state.fieldErrors?.acceptTerms && (
        <p className="-mt-2 text-xs text-rose-600">
          {state.fieldErrors.acceptTerms}
        </p>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className="h-4 w-4 rounded border-ink-300 text-blush-500 focus:ring-blush-300"
        />
        Ghi nhớ đăng nhập
      </label>

      <button
        type="submit"
        disabled={pending}
        className="btn w-full bg-blush-500 py-3 text-base font-semibold text-white shadow-lg shadow-blush-200 hover:bg-blush-600"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tạo tài khoản…
          </>
        ) : (
          "Tạo tài khoản"
        )}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Field dùng chung                                                     */
/* ------------------------------------------------------------------ */

function Field({
  id,
  label,
  icon: Icon,
  error,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label mb-0">
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-blush-500" />
            {label}
          </span>
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}
