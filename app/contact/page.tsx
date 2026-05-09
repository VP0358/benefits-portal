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
const PAGE_BG    = "#eee8e0";
const LINEN      = "#f5f0e8";

// 固定カテゴリ（フォールバック）
const DEFAULT_CATEGORIES = [
  "VPphone（携帯契約）",
  "格安旅行",
  "肌診断",
  "ショッピング",
  "細胞浴予約",
  "中古車相談",
  "ポイントについて",
  "その他",
];

export default function ContactPage() {
  const [loading,    setLoading]    = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState("");
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [form, setForm] = useState({
    memberId: "",
    name:     "",
    phone:    "",
    email:    "",
    category: "",
    content:  "",
  });

  // ログイン中の会員IDを自動セット
  useEffect(() => {
    fetch("/api/my/profile")
      .then(r => r.json())
      .then((data: { memberCode?: string }) => {
        if (data?.memberCode) setForm(f => ({ ...f, memberId: data.memberCode ?? "" }));
      })
      .catch(() => {});
  }, []);

  // 福利厚生メニューからカテゴリを動的取得
  useEffect(() => {
    fetch("/api/my/menus")
      .then(r => r.json())
      .then((data: { title: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const titles = data.map((m) => m.title);
          // 重複削除し、固定項目を追加
          const merged = Array.from(new Set([...titles, "ポイントについて", "その他"]));
          setCategories(merged);
        }
      })
      .catch(() => {
        // フォールバックのまま
      });
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
          menuTitle: form.category,
          content:   `【会員ID: ${form.memberId}】\n${form.content}`,
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
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold font-jp mb-2" style={{ color: "#34d399" }}>送信完了しました</h2>
              <p className="text-sm font-jp mb-6" style={{ color: "rgba(255,255,255,0.65)" }}>
                お問い合わせありがとうございます。<br />
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

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${GOLD}25`,
    color: NAVY,
    borderRadius: "12px",
  };
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
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#c4b5fd" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <div>
              <h1 className="font-semibold font-jp text-sm leading-none" style={{ color: NAVY }}>相談窓口</h1>
              <p className="text-[10px] font-jp mt-0.5" style={{ color: `${NAVY}55` }}>各種サービスのご相談はこちら</p>
            </div>
          </div>
          <div className="flex-1 h-px ml-2" style={{ background: "linear-gradient(90deg,rgba(196,181,253,0.35),transparent)" }}/>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-4 relative">

        {/* 説明カード */}
        <div className="rounded-2xl p-4"
          style={{
            background: `linear-gradient(155deg,${NAVY_CARD} 0%,${NAVY_CARD2} 100%)`,
            border: `1px solid ${GOLD}28`,
            boxShadow: "0 8px 28px rgba(10,22,40,0.20)"
          }}>
          <div className="h-px mb-3" style={{ background: `linear-gradient(90deg,transparent,${GOLD}70,${GOLD_LIGHT}80,${GOLD}70,transparent)` }}/>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ background: "rgba(196,181,253,0.15)", border: "1px solid rgba(196,181,253,0.25)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#c4b5fd" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <div>
              <p className="font-jp font-semibold text-sm text-white mb-1">各種サービスのご相談</p>
              <p className="font-jp text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                ご相談内容を入力して送信してください。担当者より折り返しご連絡いたします。
              </p>
            </div>
          </div>
        </div>

        {/* フォームカード */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: LINEN,
            border: `1px solid rgba(201,168,76,0.22)`,
            boxShadow: "0 4px 20px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset"
          }}>
          <div className="h-0.5" style={{ background: `linear-gradient(90deg,transparent,${GOLD}50,${GOLD}70,${GOLD}50,transparent)` }}/>
          <form onSubmit={onSubmit} className="p-5 space-y-4">

            {/* 会員ID */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                会員ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={inputClass}
                placeholder="例：M0001"
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
                電話番号
              </label>
              <input
                type="tel"
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

            {/* 相談カテゴリ（福利厚生メニューから動的取得） */}
            <div>
              <label className={labelClass} style={{ color: `${NAVY}80` }}>
                相談カテゴリ
              </label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ background: "white" }}
              >
                <option value="">選択してください（任意）</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
                placeholder="ご相談内容を詳しくご記入ください"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <p className="text-right text-xs mt-1" style={{ color: `${NAVY}40` }}>
                {form.content.length} 文字
              </p>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${GOLD},${ORANGE})` }}
            >
              {loading ? "送信中..." : "相談を送信する"}
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
