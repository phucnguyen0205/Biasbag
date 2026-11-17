"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export default function ContactForm() {
  const [status, setStatus] = useState<ContactState>({ status: "idle" });
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    setPending(true);
    setStatus({ status: "idle" });

    try {
      // Gửi qua endpoint nội bộ — sẽ ghi vào bảng `contact_messages`.
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          subject: data.get("subject"),
          message: data.get("message"),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setStatus({
          status: "error",
          message: result.message ?? "Không thể gửi. Vui lòng thử lại.",
        });
        return;
      }

      setStatus({
        status: "success",
        message:
          result.message ??
          "Đã gửi! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.",
      });
      form.reset();
    } catch {
      setStatus({
        status: "error",
        message:
          "Không thể kết nối tới máy chủ. Vui lòng gọi hotline hoặc nhắn Facebook.",
      });
    } finally {
      setPending(false);
    }
  }

  if (status.status === "success") {
    return (
      <div className="card flex flex-col items-center gap-3 py-14 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="font-display text-xl text-ink-900">Gửi thành công</h2>
        <p className="max-w-sm text-sm text-ink-600">{status.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Họ và tên *
          </label>
          <input id="name" name="name" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Số điện thoại
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="input"
            placeholder="0901234567"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="subject">
          Chủ đề
        </label>
        <select id="subject" name="subject" className="input" defaultValue="Tư vấn sản phẩm">
          <option>Tư vấn sản phẩm</option>
          <option>Tra cứu đơn hàng</option>
          <option>Đổi trả / bảo hành</option>
          <option>Hợp tác bán hàng</option>
          <option>Khác</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="message">
          Nội dung *
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="input resize-none"
          required
          placeholder="Nhập nội dung cần hỗ trợ…"
        />
      </div>

      {status.status === "error" && status.message && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {status.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-accent w-full py-3">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi…
          </>
        ) : (
          "Gửi tin nhắn"
        )}
      </button>
    </form>
  );
}
