"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "pending" | "reviewing" | "contracted" | "rejected" | "canceled";

const STATUS_OPTS: { value: Status; label: string }[] = [
  { value: "pending",    label: "⏳ 審査待ち" },
  { value: "reviewing",  label: "🔍 審査中" },
  { value: "contracted", label: "✅ 契約済み" },
  { value: "rejected",   label: "❌ 審査不可" },
  { value: "canceled",   label: "🚫 キャンセル" },
];

export default function VpPhoneAdminActions({
  applicationId,
  currentStatus,
  adminNote: initialNote,
  userName,
  userId,
  applicationSubmitted: initialSubmitted,
  officeEmail: initialOfficeEmail,
}: {
  applicationId: string;
  currentStatus: string;
  adminNote: string;
  userName: string;
  userId: string;
  applicationSubmitted: boolean;
  officeEmail: string;
}) {
  const [open, setOpen]     = useState(false);
  const [status, setStatus] = useState<Status>(currentStatus as Status);
  const [note, setNote]     = useState(initialNote);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [officeEmail, setOfficeEmail] = useState(initialOfficeEmail);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/admin/vp-phone/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        adminNote: note || null,
        applicationSubmitted: submitted,
        officeEmail: officeEmail || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg("❌ 更新に失敗しました");
      return;
    }
    setMsg("✅ 更新しました");
    setOpen(false);
    setTimeout(() => window.location.reload(), 500);
  }

  return (
    <div className="flex gap-2 items-center">
      <Link href={`/admin/users/${userId}`}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap">
        会員詳細
      </Link>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 whitespace-nowrap"
      >
        対応する
      </button>

      {/* モーダル */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">📱 申し込み対応</h2>
            <p className="text-sm text-slate-600 mb-4">申込者: <strong>{userName}</strong></p>

            <div className="space-y-4">
              {/* ステータス */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ステータス</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={status}
                  onChange={e => setStatus(e.target.value as Status)}
                >
                  {STATUS_OPTS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 手動申請ステータス */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">手動申請ステータス</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center gap-2 rounded-xl border-2 p-3 cursor-pointer transition-all ${!submitted ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50 opacity-60"}`}>
                    <input
                      type="radio"
                      name={`submitted-${applicationId}`}
                      checked={!submitted}
                      onChange={() => setSubmitted(false)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-700">⏳ 未申請</p>
                      <p className="text-[10px] text-slate-500">事務局へ未送付</p>
                    </div>
                  </label>
                  <label className={`flex-1 flex items-center gap-2 rounded-xl border-2 p-3 cursor-pointer transition-all ${submitted ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <input
                      type="radio"
                      name={`submitted-${applicationId}`}
                      checked={submitted}
                      onChange={() => setSubmitted(true)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-700">✅ 申請済み</p>
                      <p className="text-[10px] text-emerald-600">事務局へ送付済み</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 事務局側申請メールアドレス */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  事務局側申請メールアドレス
                  <span className="text-[10px] font-normal text-slate-500 ml-1">（事務局に申請したメールアドレス）</span>
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="office@example.com"
                  value={officeEmail}
                  onChange={e => setOfficeEmail(e.target.value)}
                />
              </div>

              {/* 担当者メモ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">担当者メモ（会員に表示）</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="例: 来週担当者よりご連絡します"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              {/* contracted になる場合の説明 */}
              {status === "contracted" && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  💡 「契約済み」に変更すると会員に契約完了が通知されます。<br />
                  管理メニューの「携帯契約管理」から契約情報を登録してください。
                </div>
              )}

              {msg && (
                <p className={`text-sm font-medium ${msg.startsWith("✅") ? "text-emerald-700" : "text-red-600"}`}>
                  {msg}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
