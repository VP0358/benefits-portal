"use client";

import { FormEvent, useEffect, useState } from "react";

const DEFAULT_PAYMENT_OPTIONS  = ["現金", "ローン", "どちらでも"];
const DEFAULT_DRIVE_OPTIONS    = ["二駆", "四駆", "どちらでも"];
const DEFAULT_STUDLESS_OPTIONS = ["あり（希望）", "なし（不要）", "在庫があれば欲しい"];
const DEFAULT_REQUIRED_FIELDS: { key: string; label: string; enabled: boolean }[] = [
  { key: "carType",  label: "希望車種",         enabled: true },
  { key: "grade",    label: "希望グレード",      enabled: true },
  { key: "year",     label: "希望年式",          enabled: true },
  { key: "mileage",  label: "希望走行距離",      enabled: true },
  { key: "colors",   label: "希望色（3色程度）", enabled: true },
  { key: "budget",   label: "予算",              enabled: true },
  { key: "payment",  label: "支払い方法",        enabled: true },
  { key: "drive",    label: "駆動方式",          enabled: false },
  { key: "studless", label: "スタッドレス",      enabled: false },
  { key: "note",     label: "その他ご要望",      enabled: false },
];

const lbl  = "block text-xs font-semibold text-slate-700 mb-1";
const inp  = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none";

export default function UsedCarSettingsPage() {
  const [loading, setLoading]  = useState(true);
  const [saving,  setSaving]   = useState(false);
  const [msg,     setMsg]      = useState("");
  const [isError, setIsError]  = useState(false);

  // フォーム状態
  const [headline,      setHeadline]      = useState("中古車購入申込フォーム");
  const [description,   setDescription]   = useState("下記内容をご記入の上、送信してください。\n確認後、担当より記載メールアドレスへご連絡いたします。");
  const [badges,        setBadges]        = useState("💰 お得な価格,🔍 豊富な在庫,🛡️ 安心サポート,🚚 全国対応");
  const [footerNote,    setFooterNote]    = useState("通常2〜3営業日以内にご連絡いたします");
  const [paymentOpts,   setPaymentOpts]   = useState<string[]>(DEFAULT_PAYMENT_OPTIONS);
  const [driveOpts,     setDriveOpts]     = useState<string[]>(DEFAULT_DRIVE_OPTIONS);
  const [studlessOpts,  setStudlessOpts]  = useState<string[]>(DEFAULT_STUDLESS_OPTIONS);
  const [requiredFields, setRequiredFields] = useState(DEFAULT_REQUIRED_FIELDS);
  const [notifyEmails,  setNotifyEmails]  = useState<string[]>([""]);
  const [adminNote,     setAdminNote]     = useState("");

  useEffect(() => {
    fetch("/api/admin/welfare-plans")
      .then(r => r.json())
      .then(d => {
        const uc = d.usedCarSettings;
        if (uc) {
          if (uc.headline)      setHeadline(uc.headline);
          if (uc.description)   setDescription(uc.description);
          if (uc.badges)        setBadges(Array.isArray(uc.badges) ? uc.badges.join(",") : uc.badges);
          if (uc.footerNote)    setFooterNote(uc.footerNote);
          if (Array.isArray(uc.paymentOptions))  setPaymentOpts(uc.paymentOptions);
          if (Array.isArray(uc.driveOptions))    setDriveOpts(uc.driveOptions);
          if (Array.isArray(uc.studlessOptions)) setStudlessOpts(uc.studlessOptions);
          if (Array.isArray(uc.requiredFields))  setRequiredFields(uc.requiredFields);
          if (Array.isArray(uc.notifyEmails) && uc.notifyEmails.length > 0) {
            setNotifyEmails(uc.notifyEmails);
          } else if (uc.adminEmail) {
            // 旧フォーマット互換
            setNotifyEmails([uc.adminEmail]);
          }
          if (uc.adminNote)     setAdminNote(uc.adminNote);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 選択肢の編集ヘルパー
  function updateOpt(arr: string[], setArr: (a: string[]) => void, idx: number, val: string) {
    setArr(arr.map((o, i) => i === idx ? val : o));
  }
  function removeOpt(arr: string[], setArr: (a: string[]) => void, idx: number) {
    setArr(arr.filter((_, i) => i !== idx));
  }
  function addOpt(arr: string[], setArr: (a: string[]) => void) {
    setArr([...arr, "新しい選択肢"]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(""); setIsError(false);
    const res = await fetch("/api/admin/welfare-plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usedCarSettings: {
          headline,
          description,
          badges: badges.split(",").map(s => s.trim()).filter(Boolean),
          footerNote,
          paymentOptions:  paymentOpts,
          driveOptions:    driveOpts,
          studlessOptions: studlessOpts,
          requiredFields,
          notifyEmails: notifyEmails.map(e => e.trim()).filter(Boolean),
          adminNote,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) { setIsError(true); setMsg("保存に失敗しました。"); return; }
    setMsg("✅ 保存しました！会員画面に反映されます。");
  }

  const previewBadges = badges.split(",").map(s => s.trim()).filter(Boolean);

  if (loading) return (
    <div className="rounded-3xl bg-white p-10 shadow-sm text-center text-slate-600">読み込み中...</div>
  );

  return (
    <div className="space-y-5">

      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-800">🚗 中古車販売 ページ設定</h1>
        <p className="text-sm text-slate-600 mt-1">
          会員向け中古車申込ページのテキスト・選択肢・注意書きをここから変更できます。
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">

        {/* ━━━ ページ表示内容 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800">📄 ページ表示内容</h2>

          <div>
            <label className={lbl}>ページ見出し</label>
            <input className={inp} value={headline}
              onChange={e => setHeadline(e.target.value)} />
          </div>

          <div>
            <label className={lbl}>説明文（ページ上部に表示）</label>
            <textarea rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)} />
          </div>

          <div>
            <label className={lbl}>特徴バッジ（カンマ区切りで入力）</label>
            <input className={inp}
              placeholder="💰 お得な価格,🔍 豊富な在庫,🛡️ 安心サポート,🚚 全国対応"
              value={badges}
              onChange={e => setBadges(e.target.value)} />
            {previewBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {previewBadges.map((b, i) => (
                  <span key={i} className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">{b}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1">例: 💰 お得な価格,🔍 豊富な在庫,🛡️ 安心サポート</p>
          </div>

          <div>
            <label className={lbl}>フッター注意書き（フォーム下部に表示）</label>
            <input className={inp}
              placeholder="通常2〜3営業日以内にご連絡いたします"
              value={footerNote}
              onChange={e => setFooterNote(e.target.value)} />
          </div>
        </div>

        {/* ━━━ フォーム項目の表示設定 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800">☑️ フォーム項目の表示・非表示</h2>
          <p className="text-xs text-slate-500">必須項目として表示するかどうか設定できます。</p>
          <div className="space-y-2">
            {requiredFields.map((f, idx) => (
              <label key={f.key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 cursor-pointer">
                <input type="checkbox" checked={f.enabled}
                  onChange={e => setRequiredFields(prev => prev.map((item, i) => i === idx ? { ...item, enabled: e.target.checked } : item))} />
                <span className="text-sm text-slate-700 font-medium">{f.label}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${f.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                  {f.enabled ? "表示" : "非表示"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* ━━━ 支払い方法の選択肢 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800">💳 支払い方法の選択肢</h2>
          <div className="space-y-2">
            {paymentOpts.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className={inp} value={opt}
                  onChange={e => updateOpt(paymentOpts, setPaymentOpts, idx, e.target.value)} />
                {paymentOpts.length > 1 && (
                  <button type="button" onClick={() => removeOpt(paymentOpts, setPaymentOpts, idx)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 whitespace-nowrap">削除</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addOpt(paymentOpts, setPaymentOpts)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ 選択肢を追加
          </button>
        </div>

        {/* ━━━ 駆動方式の選択肢 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800">🚙 駆動方式の選択肢</h2>
          <div className="space-y-2">
            {driveOpts.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className={inp} value={opt}
                  onChange={e => updateOpt(driveOpts, setDriveOpts, idx, e.target.value)} />
                {driveOpts.length > 1 && (
                  <button type="button" onClick={() => removeOpt(driveOpts, setDriveOpts, idx)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 whitespace-nowrap">削除</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addOpt(driveOpts, setDriveOpts)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ 選択肢を追加
          </button>
        </div>

        {/* ━━━ スタッドレスの選択肢 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800">❄️ スタッドレスタイヤの選択肢</h2>
          <div className="space-y-2">
            {studlessOpts.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className={inp} value={opt}
                  onChange={e => updateOpt(studlessOpts, setStudlessOpts, idx, e.target.value)} />
                {studlessOpts.length > 1 && (
                  <button type="button" onClick={() => removeOpt(studlessOpts, setStudlessOpts, idx)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 whitespace-nowrap">削除</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => addOpt(studlessOpts, setStudlessOpts)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
            ＋ 選択肢を追加
          </button>
        </div>

        {/* ━━━ 申込通知メール設定 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800">📧 申込通知メール送信先</h2>
          <p className="text-xs text-slate-500">
            お客様から申し込みがあった際に通知を受け取るメールアドレスを設定してください。<br />
            最大5件まで設定でき、設定されたアドレス全てに通知が届きます。
          </p>
          <div className="space-y-2">
            {notifyEmails.map((email, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-5 shrink-0 text-right">{idx + 1}</span>
                <input
                  type="email"
                  className={inp}
                  placeholder="example@email.com"
                  value={email}
                  onChange={e => setNotifyEmails(prev => prev.map((v, i) => i === idx ? e.target.value : v))}
                />
                {notifyEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setNotifyEmails(prev => prev.filter((_, i) => i !== idx))}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 hover:bg-red-50 whitespace-nowrap shrink-0"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
          {notifyEmails.length < 5 && (
            <button
              type="button"
              onClick={() => setNotifyEmails(prev => [...prev, ""])}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
            >
              ＋ メールアドレスを追加
            </button>
          )}
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              ⚠️ 未入力の場合はシステムデフォルトアドレスに通知されます。<br />
              申し込み内容（お名前・電話番号・希望車種など）が全て通知メールに記載されます。
            </p>
          </div>

          <div>
            <label className={lbl}>管理者向け内部メモ（会員には表示されません）</label>
            <textarea rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none resize-none"
              placeholder="運用上の注意事項などをメモできます"
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)} />
          </div>
        </div>

        {/* メッセージ・保存ボタン */}
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
