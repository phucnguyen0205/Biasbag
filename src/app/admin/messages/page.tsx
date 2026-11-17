import Link from "next/link";
import { ArrowLeft, Inbox, Mail } from "lucide-react";
import { getContactMessages } from "@/lib/data/products";
import { formatDate } from "@/lib/utils";
import { markMessageRead } from "@/app/admin/actions";

export const metadata = {
  title: "Tin nhắn",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Mới",
  read: "Đã đọc",
  replied: "Đã trả lời",
  archived: "Lưu trữ",
};

export default async function AdminMessagesPage() {
  const messages = await getContactMessages();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">
            Hộp thư liên hệ
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            {messages.length} tin nhắn ·{" "}
            {messages.filter((m) => m.status === "new").length} chưa đọc
          </p>
        </div>
        <Link href="/admin" className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Về tổng quan
        </Link>
      </div>

      {messages.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="h-9 w-9 text-ink-300" />
          <p className="text-sm text-ink-600">
            Chưa có tin nhắn nào. Tin nhắn từ form liên hệ sẽ hiển thị ở đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`card p-5 ${m.status === "new" ? "border-blush-300 bg-blush-50/40" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{m.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    <a href={`mailto:${m.email}`} className="hover:underline">
                      {m.email}
                    </a>
                    {m.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${m.phone}`} className="hover:underline">
                          {m.phone}
                        </a>
                      </>
                    )}
                    {" · "}
                    {formatDate(m.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-ink-100 text-ink-700">
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                  {m.subject && (
                    <span className="badge bg-blush-100 text-blush-700">
                      {m.subject}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                {m.message}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                <a
                  href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject ?? "Liên hệ từ BIAS BAG")}`}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  <Mail className="h-3.5 w-3.5" /> Trả lời
                </a>
                {m.status === "new" && (
                  <form action={markMessageRead}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
                      Đánh dấu đã đọc
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
