"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── デザイントークン
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";
const WARM_GRAY  = "#c8bfb0";

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

function NavyCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: `linear-gradient(150deg,${NAVY_CARD},${NAVY_CARD2})`, border: `1px solid ${GOLD}20`, boxShadow: `0 4px 20px rgba(10,22,40,0.18)` }}>
      {children}
    </div>
  );
}

function LinenCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ background: LINEN, border: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 4px 16px rgba(10,22,40,0.07)` }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `1px solid rgba(201,168,76,0.15)` }}>
      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
        {icon}
      </div>
      <h2 className="text-sm font-bold font-jp" style={{ color: NAVY }}>{title}</h2>
    </div>
  );
}

function InputField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold font-jp mb-1.5" style={{ color: `${NAVY}70` }}>
        {label} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: "rgba(10,22,40,0.05)",
  border: `1px solid rgba(10,22,40,0.12)`,
  color: NAVY,
  width: "100%",
  borderRadius: "12px",
  padding: "12px 16px",
  fontSize: "14px",
  outline: "none",
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError]     = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name,       setName]       = useState("");
  const [nameKana,   setNameKana]   = useState("");
  const [phone,      setPhone]      = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address,    setAddress]    = useState("");
  const [newEmail,   setNewEmail]   = useState("");
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [mlmPoints, setMlmPoints] = useState<{
    lastMonthPoints: number;
    currentMonthPoints: number;
    lastMonthPurchaseAmount: number;
    currentMonthPurchaseAmount: number;
  } | null>(null);

  const getReferralUrl = () => {
    if (!profile?.mlmMemberCode) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/admin/mlm-members/new?ref=${encodeURIComponent(profile.mlmMemberCode)}`;
  };

  const handleCopyUrl = async () => {
    const url = getReferralUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {}
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
        if (data.mlmMemberCode) {
          fetch("/api/my/mlm-points")
            .then(r => r.json())
            .then(p => { if (!p.error) setMlmPoints(p); })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));

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
    if (newPw && newPw !== confirmPw) { setError("新しいパスワードが一致しません。"); return; }
    if (newPw && newPw.length < 8) { setError("パスワードは8文字以上にしてください。"); return; }
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
    if (!res.ok) { setError(data.error ?? "更新に失敗しました。"); return; }
    setSuccess("登録情報を更新しました！");
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setProfile(data);
    if (data.emailChanged) {
      setSuccess("メールアドレスを変更しました。再ログインしてください。");
      setTimeout(() => {
        fetch("/api/auth/signout", { method: "POST" }).then(() => { window.location.href = "/login"; });
      }, 2000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}/>
          <p className="text-sm font-jp" style={{ color: `${NAVY}50` }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>

      {/* 背景グロー */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.12]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: "rgba(245,240,232,0.96)", backdropFilter: "blur(20px) saturate(160%)", borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>登録情報</h1>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg,${GOLD}35,transparent)` }}/>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4 relative">

        {/* 会員番号カード */}
        <NavyCard className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-label tracking-[0.18em] mb-0.5" style={{ color: `${GOLD}60` }}>MEMBER CODE</p>
            <p className="text-xl font-bold font-label tracking-widest text-white">{profile?.memberCode}</p>
          </div>
          {/* アバター */}
          <div className="relative">
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center"
              style={{ border: `2px solid ${GOLD}40`, background: NAVY_CARD3 }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover"/>
                : <span className="text-2xl">😊</span>}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
          </div>
        </NavyCard>

        {avatarError && (
          <p className="text-xs font-jp rounded-xl px-4 py-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>{avatarError}</p>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarUpload}/>
        {avatarUrl && (
          <button type="button" onClick={handleAvatarDelete} disabled={avatarUploading}
            className="w-full rounded-2xl py-2 text-xs font-semibold font-jp transition"
            style={{ border: `1px solid rgba(248,113,113,0.30)`, color: "#fca5a5", background: "rgba(239,68,68,0.06)" }}>
            {avatarUploading ? "削除中..." : "プロフィール画像を削除"}
          </button>
        )}

        {/* MLMポイント */}
        {profile?.mlmMemberCode && mlmPoints && (
          <NavyCard className="overflow-hidden">
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${GOLD}15` }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              </div>
              <h2 className="text-sm font-bold font-jp text-white">MLM購入ポイント</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
              {[
                { label: "先月", pts: mlmPoints.lastMonthPoints, amt: mlmPoints.lastMonthPurchaseAmount, color: GOLD_LIGHT },
                { label: "今月", pts: mlmPoints.currentMonthPoints, amt: mlmPoints.currentMonthPurchaseAmount, color: "#c4b5fd" },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-[9px] font-label tracking-wider mb-1" style={{ color: `${item.color}60` }}>{item.label}</p>
                  <p className="text-xl font-bold" style={{ color: item.color }}>{item.pts.toLocaleString()}<span className="text-xs font-normal ml-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>pt</span></p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>¥{item.amt.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <p className="px-5 pb-3 text-[10px] font-jp" style={{ color: "rgba(255,255,255,0.25)" }}>※ 1ポイント = 100円換算。今月は昨日までの集計です。</p>
          </NavyCard>
        )}

        {/* 紹介URL */}
        {profile?.mlmMemberCode && (
          <NavyCard className="overflow-hidden">
            <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: `1px solid ${GOLD}15` }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                </svg>
              </div>
              <h2 className="text-sm font-bold font-jp text-white">あなたの紹介URL</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl px-3 py-2.5 break-all text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)" }}>
                {getReferralUrl()}
              </div>
              <button type="button" onClick={handleCopyUrl}
                className="w-full py-3 rounded-xl text-sm font-semibold font-jp text-white transition"
                style={{ background: copySuccess ? "rgba(52,211,153,0.20)" : `linear-gradient(135deg,${GOLD},${ORANGE})`, border: copySuccess ? "1px solid rgba(52,211,153,0.35)" : "none", color: copySuccess ? "#34d399" : "white" }}>
                {copySuccess ? "✓ コピーしました！" : "URLをコピー"}
              </button>
              <p className="text-[10px] font-jp" style={{ color: "rgba(255,255,255,0.25)" }}>このURLを新規会員に共有すると、あなたの紹介者として自動登録されます</p>
            </div>
          </NavyCard>
        )}

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 基本情報 */}
          <LinenCard className="overflow-hidden">
            <SectionHeader
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
              title="基本情報"
            />
            <div className="px-5 py-4 space-y-4">
              <InputField label="お名前" required>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="山田 太郎"/>
              </InputField>
              <InputField label="フリガナ">
                <input type="text" value={nameKana} onChange={e => setNameKana(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="ヤマダ タロウ"/>
              </InputField>
              <InputField label="電話番号">
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="090-1234-5678"/>
              </InputField>
              <InputField label="郵便番号">
                <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="123-4567"/>
              </InputField>
              <InputField label="住所">
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: "none" } as React.CSSProperties} placeholder="東京都渋谷区..."/>
              </InputField>
            </div>
          </LinenCard>

          {/* メールアドレス */}
          <LinenCard className="overflow-hidden">
            <SectionHeader
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
              title="メールアドレス（ログインID）"
            />
            <div className="px-5 py-4">
              <InputField label="メールアドレス" required>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="example@email.com"/>
              </InputField>
            </div>
          </LinenCard>

          {/* パスワード */}
          <LinenCard className="overflow-hidden">
            <SectionHeader
              icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
              title="パスワード変更（変更する場合のみ）"
            />
            <div className="px-5 py-4 space-y-4">
              <InputField label="現在のパスワード">
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="現在のパスワード" autoComplete="current-password"/>
              </InputField>
              <InputField label="新しいパスワード">
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="8文字以上" autoComplete="new-password"/>
              </InputField>
              <InputField label="新しいパスワード（確認）">
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle as React.CSSProperties} placeholder="もう一度入力" autoComplete="new-password"/>
              </InputField>
            </div>
          </LinenCard>

          {/* メッセージ */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm font-jp"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", color: "#f87171" }}>
              ⚠ {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl px-4 py-3 text-sm font-jp font-semibold"
              style={{ background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
              ✓ {success}
            </div>
          )}

          {/* 送信ボタン */}
          <button type="submit" disabled={saving}
            className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 transition font-jp"
            style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})`, boxShadow: `0 4px 16px rgba(201,168,76,0.25)` }}>
            {saving ? "更新中..." : "登録情報を更新する"}
          </button>

          <button type="button" onClick={() => router.push("/dashboard")}
            className="w-full py-3.5 rounded-2xl text-sm font-medium font-jp transition"
            style={{ border: `1px solid rgba(10,22,40,0.15)`, color: `${NAVY}60`, background: "rgba(10,22,40,0.03)" }}>
            キャンセル
          </button>
        </form>

      </main>
    </div>
  );
}
