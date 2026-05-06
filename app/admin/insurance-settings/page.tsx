"use client";

import { FormEvent, useEffect, useState } from "react";

// ── デフォルト値 ──────────────────────────────────────────
const DEFAULT_LIFE: LifeInsuranceSettings = {
  headline:    "生命保険 無料相談申込",
  description: "下記内容をご記入の上、送信してください。\n確認後、担当より記載メールアドレスへご連絡いたします。",
  badges:      "🛡️ 安心の保障,💰 無料相談,📞 オンライン対応,✅ 専門FP在籍",
  footerNote:  "※初回ご相談はオンラインでのご相談となります",
  adminEmail:  "",
  adminNote:   "",
};

const DEFAULT_NON_LIFE_PRODUCTS = [
  "ずっとスマイル",
  "安全運TEN",
  "わんにゃんスマイル",
];

const DEFAULT_NON_LIFE: NonLifeInsuranceSettings = {
  headline:    "損害保険 無料相談申込",
  description: "下記内容をご記入の上、送信してください。\n確認後、担当より記載メールアドレスへご連絡いたします。",
  badges:      "🚗 自動車保険,🏠 火災保険,🐾 ペット保険,✅ 専門FP在籍",
  footerNote:  "※初回ご相談はオンラインでのご相談となります",
  products:    DEFAULT_NON_LIFE_PRODUCTS,
  adminEmail:  "",
  adminNote:   "",
};

// ── 型定義 ────────────────────────────────────────────────
interface LifeInsuranceSettings {
  headline:    string;
  description: string;
  badges:      string;
  footerNote:  string;
  adminEmail:  string;
  adminNote:   string;
}

interface NonLifeInsuranceSettings {
  headline:    string;
  description: string;
  badges:      string;
  footerNote:  string;
  products:    string[];
  adminEmail:  string;
  adminNote:   string;
}

// ── スタイル ─────────────────────────────────────────────
const lbl  = "block text-xs font-semibold text-slate-700 mb-1";
const inp  = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none";
const tArea = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none resize-none";

// ── タブ型 ────────────────────────────────────────────────
type Tab = "life" | "non_life";

export default function InsuranceSettingsPage() {
  const [tab,     setTab]     = useState<Tab>("life");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [isError, setIsError] = useState(false);

  // ── 生命保険フォーム ──────────────────────────────────
  const [life, setLife] = useState<LifeInsuranceSettings>(DEFAULT_LIFE);

  // ── 損害保険フォーム ──────────────────────────────────
  const [nonLife, setNonLife] = useState<NonLifeInsuranceSettings>(DEFAULT_NON_LIFE);

  // ── 初期データ取得 ────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/welfare-plans")
      .then(r => r.json())
      .then(d => {
        if (d.lifeInsuranceSettings) {
          const s = d.lifeInsuranceSettings;
          setLife({
            headline:    s.headline    ?? DEFAULT_LIFE.headline,
            description: s.description ?? DEFAULT_LIFE.description,
            badges:      Array.isArray(s.badges) ? s.badges.join(",") : (s.badges ?? DEFAULT_LIFE.badges),
            footerNote:  s.footerNote  ?? DEFAULT_LIFE.footerNote,
            adminEmail:  s.adminEmail  ?? "",
            adminNote:   s.adminNote   ?? "",
          });
        }
        if (d.nonLifeInsuranceSettings) {
          const s = d.nonLifeInsuranceSettings;
          setNonLife({
            headline:    s.headline    ?? DEFAULT_NON_LIFE.headline,
            description: s.description ?? DEFAULT_NON_LIFE.description,
            badges:      Array.isArray(s.badges) ? s.badges.join(",") : (s.badges ?? DEFAULT_NON_LIFE.badges),
            footerNote:  s.footerNote  ?? DEFAULT_NON_LIFE.footerNote,
            products:    Array.isArray(s.products) && s.products.length > 0 ? s.products : DEFAULT_NON_LIFE_PRODUCTS,
            adminEmail:  s.adminEmail  ?? "",
            adminNote:   s.adminNote   ?? "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── 保存処理 ──────────────────────────────────────────
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(""); setIsError(false);

    const payload: Record<string, unknown> = {};

    if (tab === "life") {
      payload.lifeInsuranceSettings = {
        headline:    life.headline,
        description: life.description,
        badges:      life.badges.split(",").map(s => s.trim()).filter(Boolean),
        footerNote:  life.footerNote,
        adminEmail:  life.adminEmail,
        adminNote:   life.adminNote,
      };
    } else {
      payload.nonLifeInsuranceSettings = {
        headline:    nonLife.headline,
        description: nonLife.description,
        badges:      nonLife.badges.split(",").map(s => s.trim()).filter(Boolean),
        footerNote:  nonLife.footerNote,
        products:    nonLife.products.filter(Boolean),
        adminEmail:  nonLife.adminEmail,
        adminNote:   nonLife.adminNote,
      };
    }

    const res = await fetch("/api/admin/welfare-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { setIsError(true); setMsg("保存に失敗しました。"); return; }
    setMsg("✅ 保存しました！会員画面に反映されます。");
  }

  // ── 損害保険商品の選択肢操作 ─────────────────────────
  function updateProduct(idx: number, val: string) {
    setNonLife(p => ({ ...p, products: p.products.map((o, i) => i === idx ? val : o) }));
  }
  function removeProduct(idx: number) {
    setNonLife(p => ({ ...p, products: p.products.filter((_, i) => i !== idx) }));
  }
  function addProduct() {
    setNonLife(p => ({ ...p, products: [...p.products, "新しい商品"] }));
  }

  if (loading) return (
    <div className="rounded-3xl bg-white p-10 shadow-sm text-center text-slate-600">読み込み中...</div>
  );

  const lifePreviewBadges    = life.badges.split(",").map(s => s.trim()).filter(Boolean);
  const nonLifePreviewBadges = nonLife.badges.split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div className="space-y-5">

      {/* ── ヘッダー ── */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-800">🛡️ 保険 ページ設定</h1>
        <p className="text-sm text-slate-600 mt-1">
          会員向けの生命保険・損害保険相談申込ページのテキスト・選択肢をここから変更できます。
        </p>
      </div>

      {/* ── タブ ── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setTab("life"); setMsg(""); }}
          className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
            tab === "life"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          🛡️ 生命保険
        </button>
        <button
          type="button"
          onClick={() => { setTab("non_life"); setMsg(""); }}
          className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-colors ${
            tab === "non_life"
              ? "bg-orange-500 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          🚗 損害保険
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">

        {/* ══════════════════════════════════
            生命保険タブ
        ══════════════════════════════════ */}
        {tab === "life" && (
          <>
            {/* ページ表示内容 */}
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800">📄 ページ表示内容（生命保険）</h2>

              <div>
                <label className={lbl}>ページ見出し</label>
                <input className={inp} value={life.headline}
                  onChange={e => setLife(p => ({ ...p, headline: e.target.value }))} />
              </div>

              <div>
                <label className={lbl}>説明文（ページ上部に表示）</label>
                <textarea rows={3} className={tArea} value={life.description}
                  onChange={e => setLife(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div>
                <label className={lbl}>特徴バッジ（カンマ区切りで入力）</label>
                <input className={inp}
                  placeholder="🛡️ 安心の保障,💰 無料相談,📞 オンライン対応"
                  value={life.badges}
                  onChange={e => setLife(p => ({ ...p, badges: e.target.value }))} />
                {lifePreviewBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lifePreviewBadges.map((b, i) => (
                      <span key={i} className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">{b}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={lbl}>フッター注意書き（フォーム下部に表示）</label>
                <input className={inp}
                  placeholder="※初回ご相談はオンラインでのご相談となります"
                  value={life.footerNote}
                  onChange={e => setLife(p => ({ ...p, footerNote: e.target.value }))} />
              </div>
            </div>

            {/* 管理者向け設定 */}
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800">⚙️ 管理者向け設定（生命保険）</h2>
              <div>
                <label className={lbl}>申込通知メール送信先（空白 = デフォルトアドレス）</label>
                <input type="email" className={inp}
                  placeholder="admin@example.com"
                  value={life.adminEmail}
                  onChange={e => setLife(p => ({ ...p, adminEmail: e.target.value }))} />
                <p className="text-xs text-slate-400 mt-1">申込が来たときに通知するメールアドレスです</p>
              </div>
              <div>
                <label className={lbl}>管理者向け内部メモ（会員には表示されません）</label>
                <textarea rows={3} className={tArea}
                  placeholder="運用上の注意事項などをメモできます"
                  value={life.adminNote}
                  onChange={e => setLife(p => ({ ...p, adminNote: e.target.value }))} />
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════
            損害保険タブ
        ══════════════════════════════════ */}
        {tab === "non_life" && (
          <>
            {/* ページ表示内容 */}
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800">📄 ページ表示内容（損害保険）</h2>

              <div>
                <label className={lbl}>ページ見出し</label>
                <input className={inp} value={nonLife.headline}
                  onChange={e => setNonLife(p => ({ ...p, headline: e.target.value }))} />
              </div>

              <div>
                <label className={lbl}>説明文（ページ上部に表示）</label>
                <textarea rows={3} className={tArea} value={nonLife.description}
                  onChange={e => setNonLife(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div>
                <label className={lbl}>特徴バッジ（カンマ区切りで入力）</label>
                <input className={inp}
                  placeholder="🚗 自動車保険,🏠 火災保険,🐾 ペット保険"
                  value={nonLife.badges}
                  onChange={e => setNonLife(p => ({ ...p, badges: e.target.value }))} />
                {nonLifePreviewBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {nonLifePreviewBadges.map((b, i) => (
                      <span key={i} className="rounded-full bg-orange-100 text-orange-700 px-2.5 py-0.5 text-xs font-medium">{b}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={lbl}>フッター注意書き（フォーム下部に表示）</label>
                <input className={inp}
                  placeholder="※初回ご相談はオンラインでのご相談となります"
                  value={nonLife.footerNote}
                  onChange={e => setNonLife(p => ({ ...p, footerNote: e.target.value }))} />
              </div>
            </div>

            {/* 損害保険 商品選択肢 */}
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-800">📋 ご相談希望損保 選択肢</h2>
              <p className="text-xs text-slate-500">会員がフォームで選択できる損保商品名を設定します。追加・削除・名称変更が可能です。</p>
              <div className="space-y-2">
                {nonLife.products.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-slate-400 text-sm w-6 text-right flex-shrink-0">{idx + 1}.</span>
                    <input
                      className={inp}
                      value={product}
                      onChange={e => updateProduct(idx, e.target.value)}
                      placeholder="商品名を入力"
                    />
                    {nonLife.products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProduct(idx)}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 whitespace-nowrap flex-shrink-0"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addProduct}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
              >
                ＋ 商品を追加
              </button>
            </div>

            {/* 管理者向け設定 */}
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-800">⚙️ 管理者向け設定（損害保険）</h2>
              <div>
                <label className={lbl}>申込通知メール送信先（空白 = デフォルトアドレス）</label>
                <input type="email" className={inp}
                  placeholder="admin@example.com"
                  value={nonLife.adminEmail}
                  onChange={e => setNonLife(p => ({ ...p, adminEmail: e.target.value }))} />
                <p className="text-xs text-slate-400 mt-1">申込が来たときに通知するメールアドレスです</p>
              </div>
              <div>
                <label className={lbl}>管理者向け内部メモ（会員には表示されません）</label>
                <textarea rows={3} className={tArea}
                  placeholder="運用上の注意事項などをメモできます"
                  value={nonLife.adminNote}
                  onChange={e => setNonLife(p => ({ ...p, adminNote: e.target.value }))} />
              </div>
            </div>
          </>
        )}

        {/* ── メッセージ・保存ボタン ── */}
        {msg && (
          <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${isError ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
            {msg}
          </div>
        )}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? "保存中..." : "✓ 保存する"}
          </button>
        </div>

      </form>
    </div>
  );
}
