"use client";

import { useEffect, useState } from "react";

type AdminInfo = { name: string; email: string; role: string; };

const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

export default function AdminAccountPanel() {
  const [info, setInfo]       = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const [newName,    setNewName]    = useState("");
  const [newEmail,   setNewEmail]   = useState("");
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");

  useEffect(() => {
    fetch("/api/admin/account")
      .then(r => r.json())
      .then(data => {
        setInfo(data);
        setNewName(data.name ?? "");
        setNewEmail(data.email ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (newPw && newPw !== confirmPw) {
      setError("新しいパスワードが一致しません。"); return;
    }
    if (newPw && newPw.length < 8) {
      setError("パスワードは8文字以上にしてください。"); return;
    }

    setSaving(true);
    const res = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newName:         newName !== info?.name  ? newName  : undefined,
        newEmail:        newEmail !== info?.email ? newEmail : undefined,
        currentPassword: currentPw,
        newPassword:     newPw || undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "更新に失敗しました。"); return;
    }

    setCurrentPw(""); setNewPw(""); setConfirmPw("");

    if (data.emailChanged) {
      setSuccess("メールアドレスを変更しました。再ログインしてください。");
      setTimeout(() => {
        fetch("/api/auth/signout", { method: "POST" }).then(() => {
          window.location.href = "/login";
        });
      }, 2000);
    } else {
      setSuccess("ログイン情報を更新しました！");
      setInfo({ name: newName, email: newEmail, role: info?.role ?? "" });
    }
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-8 text-center text-slate-700 shadow-sm">読み込み中...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* 現在の情報 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4">現在のログイン情報</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="w-32 text-slate-500 shrink-0">管理者名</span>
            <span className="font-medium text-slate-800">{info?.name}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-32 text-slate-500 shrink-0">メール</span>
            <span className="font-medium text-slate-800">{info?.email}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-32 text-slate-500 shrink-0">権限</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-800">{info?.role}</span>
          </div>
        </div>
      </div>

      {/* 名前変更 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 border-b pb-2">管理者名の変更</h2>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">新しい管理者名</label>
          <input
            type="text"
            required
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className={inputClass}
            placeholder="管理者名"
          />
        </div>
      </div>

      {/* メール変更 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 border-b pb-2">ログインID（メールアドレス）の変更</h2>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">新しいメールアドレス</label>
          <input
            type="email"
            required
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className={inputClass}
            placeholder="admin@example.com"
          />
        </div>
      </div>

      {/* パスワード変更 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 border-b pb-2">
          パスワード変更
          <span className="ml-2 text-xs font-normal text-slate-500">（変更する場合のみ入力）</span>
        </h2>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">現在のパスワード *</label>
          <input
            type="password"
            required
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            className={inputClass}
            placeholder="現在のパスワード"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">新しいパスワード</label>
          <input
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            className={inputClass}
            placeholder="8文字以上（変更しない場合は空欄）"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">新しいパスワード（確認）</label>
          <input
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className={inputClass}
            placeholder="もう一度入力"
            autoComplete="new-password"
          />
        </div>
      </div>

      {error   && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">✅ {success}</div>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
      >
        {saving ? "更新中..." : "ログイン情報を更新する"}
      </button>
    </form>
  );
}
