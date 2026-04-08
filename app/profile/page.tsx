"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ViolaLogo from "@/app/components/viola-logo";

type Profile = {
  memberCode: string;
  name: string;
  nameKana: string;
  email: string;
  phone: string;
  postalCode: string;
  address: string;
  mlmMemberCode?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  // プロフィール画像
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError]     = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // フォーム状態
  const [name,       setName]       = useState("");
  const [nameKana,   setNameKana]   = useState("");
  const [phone,      setPhone]      = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address,    setAddress]    = useState("");
  const [newEmail,   setNewEmail]   = useState("");
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");

  // 紹介者URL関連
  const [copySuccess, setCopySuccess] = useState(false);

  // 紹介者URLを生成
  const getReferralUrl = () => {
    if (!profile?.mlmMemberCode) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/admin/mlm-members/new?ref=${encodeURIComponent(profile.mlmMemberCode)}`;
  };

  // URLをクリップボードにコピー
  const handleCopyUrl = async () => {
    const url = getReferralUrl();
    if (!url) return;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  useEffect(() => {
    fetch("/api/my/profile")
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setName(data.name ?? "");
        setNameKana(data.nameKana ?? "");
        setPhone(data.phone ?? "");
        setPostalCode(data.postalCode ?? "");
        setAddress(data.address ?? "");
        setNewEmail(data.email ?? "");
      })
      .finally(() => setLoading(false));

    // アバター取得
    fetch("/api/my/avatar")
      .then(r => r.json())
      .then(d => setAvatarUrl(d.avatarUrl ?? null))
      .catch(() => {});
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setAvatarUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/my/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setAvatarError(data.error ?? "アップロードに失敗しました"); }
      else {
        setAvatarUrl(data.avatarUrl);
        // localStorageにも保存してダッシュボードに即反映
        localStorage.setItem("profileAvatarUrl", data.avatarUrl);
        window.dispatchEvent(new Event("avatarUpdated"));
      }
    } catch { setAvatarError("通信エラーが発生しました"); }
    setAvatarUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAvatarDelete() {
    if (!confirm("プロフィール画像を削除しますか？")) return;
    setAvatarUploading(true);
    await fetch("/api/my/avatar", { method: "DELETE" });
    setAvatarUrl(null);
    localStorage.removeItem("profileAvatarUrl");
    window.dispatchEvent(new Event("avatarUpdated"));
    setAvatarUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");

    if (newPw && newPw !== confirmPw) {
      setError("新しいパスワードが一致しません。"); return;
    }
    if (newPw && newPw.length < 8) {
      setError("パスワードは8文字以上にしてください。"); return;
    }
    // メール変更 or パスワード変更時は現在のパスワード必須
    if ((newEmail !== profile?.email || newPw) && !currentPw) {
      setError("メールアドレスまたはパスワードを変更する場合は現在のパスワードが必要です。"); return;
    }

    setSaving(true);
    const res = await fetch("/api/my/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, nameKana, phone, postalCode, address,
        newEmail:        newEmail !== profile?.email ? newEmail : undefined,
        currentPassword: currentPw || undefined,
        newPassword:     newPw || undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "更新に失敗しました。"); return;
    }

    setSuccess("登録情報を更新しました！");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setProfile(data);

    // メールアドレスを変更した場合は再ログインが必要
    if (data.emailChanged) {
      setSuccess("メールアドレスを変更しました。再ログインしてください。");
      setTimeout(() => {
        fetch("/api/auth/signout", { method: "POST" }).then(() => {
          window.location.href = "/login";
        });
      }, 2000);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#e6f2dc] flex items-center justify-center">
        <div className="text-slate-500">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#e6f2dc]">
      <div className="mx-auto max-w-md px-4 py-6 space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")}
            className="text-slate-500 hover:text-slate-700 text-2xl leading-none">‹</button>
          <div>
            <ViolaLogo size="sm" />
            <div className="text-sm font-bold text-slate-800 mt-0.5">登録情報の変更</div>
          </div>
        </div>

        {/* 会員番号表示 */}
        <div className="rounded-2xl bg-white px-5 py-3 shadow-sm flex items-center gap-3">
          <span className="text-xs text-slate-400">会員番号</span>
          <span className="font-bold text-slate-700">{profile?.memberCode}</span>
        </div>

        {/* 紹介者URL */}
        {profile?.mlmMemberCode && (
          <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-share-alt text-blue-600"></i>
              <span className="text-sm font-bold text-slate-800">あなたの紹介URL</span>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 mb-3 break-all text-xs text-slate-600">
              {getReferralUrl()}
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-copy"></i>
              {copySuccess ? 'コピーしました！' : 'URLをコピー'}
            </button>
            <p className="text-xs text-slate-500 mt-2">
              このURLを新規会員に共有すると、あなたの紹介者として自動登録されます
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── 基本情報 ── */}
          <div className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 border-b pb-2">基本情報</h2>

            <Field label="お名前 *">
              <input type="text" required value={name}
                onChange={e => setName(e.target.value)}
                className={inputClass}
                placeholder="山田 太郎" />
            </Field>

            <Field label="フリガナ">
              <input type="text" value={nameKana}
                onChange={e => setNameKana(e.target.value)}
                className={inputClass}
                placeholder="ヤマダ タロウ" />
            </Field>

            <Field label="電話番号">
              <input type="tel" value={phone}
                onChange={e => setPhone(e.target.value)}
                className={inputClass}
                placeholder="090-1234-5678" />
            </Field>

            <Field label="郵便番号">
              <input type="text" value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                className={inputClass}
                placeholder="123-4567" />
            </Field>

            <Field label="住所">
              <textarea value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
                className={inputClass + " resize-none"}
                placeholder="東京都渋谷区..." />
            </Field>
          </div>

          {/* ── メールアドレス変更 ── */}
          <div className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 border-b pb-2">
              メールアドレス
              <span className="ml-2 text-xs font-normal text-slate-400">（ログインIDになります）</span>
            </h2>

            <Field label="メールアドレス *">
              <input type="email" required value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className={inputClass}
                placeholder="example@email.com" />
            </Field>
          </div>

          {/* ── パスワード変更 ── */}
          <div className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 border-b pb-2">
              パスワード変更
              <span className="ml-2 text-xs font-normal text-slate-400">（変更する場合のみ入力）</span>
            </h2>

            <Field label={`現在のパスワード${newEmail !== profile?.email || newPw ? " *" : ""}`}>
              <input type="password" value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                className={inputClass}
                placeholder="現在のパスワード"
                autoComplete="current-password" />
            </Field>

            <Field label="新しいパスワード">
              <input type="password" value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className={inputClass}
                placeholder="8文字以上"
                autoComplete="new-password" />
            </Field>

            <Field label="新しいパスワード（確認）">
              <input type="password" value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                className={inputClass}
                placeholder="もう一度入力"
                autoComplete="new-password" />
            </Field>
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
              ✅ {success}
            </div>
          )}

          {/* 送信ボタン */}
          <button type="submit" disabled={saving}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? "更新中..." : "登録情報を更新する"}
          </button>

          <button type="button" onClick={() => router.push("/dashboard")}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            キャンセル
          </button>
        </form>

        {/* ── プロフィール画像 ── */}
        <div className="rounded-3xl bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-700 border-b pb-2">
            プロフィール画像
            <span className="ml-2 text-xs font-normal text-slate-400">（ダッシュボードのアイコンに反映）</span>
          </h2>

          {/* 現在の画像プレビュー */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full border-2 border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="プロフィール画像"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl">😊</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-slate-500">
                JPEG / PNG / WebP / GIF（最大5MB）
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {avatarUploading ? "アップロード中..." : "画像を選択"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarDelete}
                    disabled={avatarUploading}
                    className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>

          {avatarError && (
            <p className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{avatarError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

      </div>
    </main>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</label>
      {children}
    </div>
  );
}
