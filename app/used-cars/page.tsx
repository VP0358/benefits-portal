"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";

const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const GOLD_DARK  = "#a88830";
const ORANGE     = "#d4703a";
const NAVY       = "#0a1628";
const NAVY_CARD  = "#0d1e38";
const NAVY_CARD2 = "#122444";
const NAVY_CARD3 = "#162c50";
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

interface UserInfo {
  name: string;
  memberCode: string;
  email: string;
  phone: string;
}

export default function UsedCarsPage() {
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");
  const [userInfo,  setUserInfo]  = useState<UserInfo | null>(null);

  const [form, setForm] = useState({
    memberId:  "",
    name:      "",
    phone:     "",
    email:     "",
    content:   "",
  });

  // ログインユーザー情報を自動入力
  useEffect(() => {
    fetch("/api/my/profile")
      .then(r => r.json())
      .then((d) => {
        if (d && d.name) {
          setUserInfo(d);
          setForm(prev => ({
            ...prev,
            memberId: d.memberCode ?? "",
            name:     d.name ?? "",
            phone:    d.phone ?? "",
            email:    d.email ?? "",
          }));
        }
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.memberId.trim()) {
      setError("会員IDを入力してください。");
      setLoading(false);
      return;
    }
    if (!form.name.trim()) {
      setError("お名前を入力してください。");
      setLoading(false);
      return;
    }
    if (!form.phone.trim()) {
      setError("電話番号を入力してください。");
      setLoading(false);
      return;
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("正しいメールアドレスを入力してください。");
      setLoading(false);
      return;
    }
    if (!form.content.trim()) {
      setError("相談内容を入力してください。");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      form.name,
          phone:     form.phone,
          email:     form.email,
          menuTitle: "中古車相談",
          content:   `【中古車販売お問い合わせ】\n会員ID: ${form.memberId}\n氏名: ${form.name}\n電話番号: ${form.phone}\nメール: ${form.email}\n\n相談内容:\n${form.content}`,
        }),
      });
      if (!res.ok) throw new Error("送信失敗");
      setSubmitted(true);
    } catch {
      setError("送信に失敗しました。しばらく経ってからもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  // 送信完了画面
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: PAGE_BG }}>
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.12]"
            style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        </div>
        <div className="w-full max-w-md relative">
          <div className="rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(150deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
              border: `1px solid rgba(52,211,153,0.35)`,
              boxShadow: "0 20px 60px rgba(10,22,40,0.30)"
            }}>
            <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(52,211,153,0.9) 50%,transparent)" }}/>
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">🚗</div>
              <h2 className="text-xl font-bold font-jp mb-2" style={{ color: "#34d399" }}>お問い合わせを受け付けました</h2>
              <p className="text-sm font-jp mb-6" style={{ color: "rgba(255,255,255,0.65)" }}>
                中古車販売のご相談ありがとうございます。<br />
                担当者より折り返しご連絡いたします。
              </p>
              <Link href="/dashboard"
                className="inline-block rounded-2xl px-6 py-3 text-sm font-bold font-jp text-white"
                style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
                マイページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 text-sm font-medium focus:outline-none transition placeholder-gray-400 bg-white rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200";
  const labelClass = "block text-xs font-bold mb-1.5";

  return (
    <div className="min-h-screen pb-16" style={{ background: PAGE_BG }}>
      {/* 背景装飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.12]"
          style={{ background: `radial-gradient(circle,${GOLD}55,transparent 70%)` }}/>
        <div className="absolute bottom-20 -left-20 w-64 h-64 rounded-full opacity-[0.08]"
          style={{ background: `radial-gradient(circle,${NAVY}33,transparent 70%)` }}/>
        <div className="absolute top-1/2 right-0 w-48 h-48 rounded-full opacity-[0.06]"
          style={{ background: `radial-gradient(circle,${ORANGE}44,transparent 70%)` }}/>
      </div>

      {/* ヘッダー */}
      <header className="sticky top-0 z-30"
        style={{
          background: "rgba(245,240,232,0.96)",
          backdropFilter: "blur(20px) saturate(160%)",
          borderBottom: `1px solid rgba(201,168,76,0.22)`,
          boxShadow: "0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset"
        }}>
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.55)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#fdba74" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
            <div>
              <h1 className="font-semibold font-jp text-sm leading-none" style={{ color: NAVY }}>中古車販売</h1>
              <p className="text-[10px] font-jp mt-0.5" style={{ color: `${NAVY}55` }}>お問い合わせフォーム</p>
            </div>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(90deg,rgba(253,186,116,0.35),transparent)" }}/>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4 relative">

        {/* ヒーローカード */}
        <div className="rounded-3xl overflow-hidden relative"
          style={{
            background: `linear-gradient(150deg,${NAVY} 0%,${NAVY_CARD} 45%,${NAVY_CARD2} 100%)`,
            border: `1px solid ${GOLD}35`,
            boxShadow: `0 16px 48px rgba(10,22,40,0.30),0 0 0 1px ${GOLD}12 inset`
          }}>
          <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}90 30%,${GOLD_LIGHT} 50%,${GOLD}90 70%,transparent)` }}/>
          <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.10] pointer-events-none"
            style={{ background: `radial-gradient(circle at 100% 0%,${GOLD_LIGHT},transparent 70%)` }}/>

          <div className="px-5 pt-5 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,rgba(253,186,116,0.20),rgba(212,112,58,0.15))",
                  border: `2px solid rgba(253,186,116,0.35)`
                }}>
                🚗
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-label text-[9px] tracking-[0.22em] mb-0.5" style={{ color: `${GOLD}80` }}>USED CAR SALES</p>
                <h2 className="text-white text-xl font-jp font-semibold leading-tight">中古車販売</h2>
                <p className="text-xs mt-1 font-jp" style={{ color: `${GOLD}70` }}>お問い合わせ・ご相談</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: "💰", label: "お得な価格" },
                { icon: "🔍", label: "豊富な在庫" },
                { icon: "🛡️", label: "安心サポート" },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-2.5 text-center"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-lg mb-1">{item.icon}</div>
                  <p className="text-[10px] font-jp text-white/70">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${GOLD}30,transparent)` }}/>
        </div>

        {/* フォームカード */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: LINEN,
            border: `1px solid rgba(201,168,76,0.22)`,
            boxShadow: "0 4px 20px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset"
          }}>
          <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}50,${GOLD}70,${GOLD}50,transparent)` }}/>

          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${GOLD}18` }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p className="font-jp font-semibold text-sm" style={{ color: NAVY }}>お問い合わせフォーム</p>
            </div>
          </div>

          {userInfo && (
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5 text-xs"
              style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}30`, color: GOLD_DARK }}>
              ✓ ログイン情報から自動入力されました
            </div>
          )}

          <form onSubmit={onSubmit} className="p-4 space-y-4">

            {/* 会員ID */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                会員ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={inputClass}
                placeholder="例: M0001"
                value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })}
              />
            </div>

            {/* お名前 */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                お名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={inputClass}
                placeholder="山田 太郎"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                autoComplete="tel"
                className={inputClass}
                placeholder="090-1234-5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                placeholder="example@mail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* 相談内容 */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                相談内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={6}
                className={inputClass + " resize-none"}
                placeholder="ご希望の車種・予算・その他ご相談内容をご記入ください"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <p className="text-right text-xs mt-1" style={{ color: `${NAVY}40` }}>
                {form.content.length} 文字
              </p>
            </div>

            {/* 注意書き */}
            <div className="rounded-xl px-4 py-3"
              style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
              <p className="text-xs font-jp" style={{ color: GOLD_DARK }}>
                ⚠️ ご記入いただいた情報は中古車販売のご相談にのみ使用いたします。
                担当者より1〜3営業日以内にご連絡いたします。
              </p>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#ef4444" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl py-4 text-base font-bold text-white transition disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}
            >
              {loading ? "送信中..." : "🚗 お問い合わせを送信する"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs pb-4" style={{ color: `${NAVY}45` }}>
          通常1〜3営業日以内にご返答いたします
        </p>
      </main>
    </div>
  );
}
