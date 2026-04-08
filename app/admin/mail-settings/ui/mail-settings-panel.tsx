"use client";

import { useEffect, useState, useCallback } from "react";

// -------------------------------------------------------
// 型定義
// -------------------------------------------------------
type MailType = "member" | "mlm" | "mobile_contract" | "travel" | "vp_phone";

interface MailCategory {
  key: MailType;
  label: string;
  icon: string;
  description: string;
  subjectKey: string;
  textKey: string;
  htmlKey: string;
  vars: string[];         // 使用可能なテンプレート変数
  bulkTarget?: string;    // 一括送信対象の説明
}

const MAIL_CATEGORIES: MailCategory[] = [
  {
    key: "member",
    label: "会員登録完了",
    icon: "👤",
    description: "会員登録フォームから新規登録した際に送信されます",
    subjectKey: "memberMailSubject",
    textKey: "memberMailText",
    htmlKey: "memberMailHtml",
    vars: ["{name}"],
    bulkTarget: "ステータスが「有効」の全会員",
  },
  {
    key: "mlm",
    label: "MLM会員登録完了",
    icon: "🌿",
    description: "MLM登録フォームからビジネス会員登録した際に送信されます",
    subjectKey: "mlmMailSubject",
    textKey: "mlmMailText",
    htmlKey: "mlmMailHtml",
    vars: ["{name}", "{memberCode}"],
    bulkTarget: "ステータスが「有効」の全MLM会員",
  },
  {
    key: "mobile_contract",
    label: "携帯契約完了",
    icon: "📱",
    description: "管理者が携帯契約を新規登録した際にユーザーへ送信されます",
    subjectKey: "mobileContractMailSubject",
    textKey: "mobileContractMailText",
    htmlKey: "mobileContractMailHtml",
    vars: ["{name}", "{planName}", "{contractNumber}"],
    bulkTarget: "ステータスが「有効」の携帯契約保有ユーザー",
  },
  {
    key: "travel",
    label: "旅行サブスク契約完了",
    icon: "✈️",
    description: "管理者が旅行サブスクを新規登録した際にユーザーへ送信されます",
    subjectKey: "travelMailSubject",
    textKey: "travelMailText",
    htmlKey: "travelMailHtml",
    vars: ["{name}", "{planName}"],
    bulkTarget: "ステータスが「有効」の旅行サブスク加入者",
  },
  {
    key: "vp_phone",
    label: "VP未来phone申し込み完了",
    icon: "📋",
    description: "VP未来phone申し込みフォームから申し込んだ際に送信されます（KYC案内含む）",
    subjectKey: "vpPhoneMailSubject",
    textKey: "vpPhoneMailText",
    htmlKey: "vpPhoneMailHtml",
    vars: ["{name}"],
    bulkTarget: undefined, // VP未来phoneは個別申し込み時のみ
  },
];

type Settings = Record<string, string>;

// -------------------------------------------------------
// メインコンポーネント
// -------------------------------------------------------
export default function MailSettingsPanel() {
  const [activeTab, setActiveTab] = useState<MailType>("member");
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeMailTab, setActiveMailTab] = useState<"text" | "html">("text");

  // 一括送信
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkCount, setBulkCount] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const cat = MAIL_CATEGORIES.find(c => c.key === activeTab)!;

  // 設定読み込み
  useEffect(() => {
    fetch("/api/admin/mail-settings")
      .then(r => r.json())
      .then(data => { setSettings(data); setLoading(false); });
  }, []);

  // 送信対象件数取得
  const fetchCount = useCallback(async () => {
    if (!cat.bulkTarget) { setBulkCount(null); return; }
    const res = await fetch(`/api/admin/bulk-mail?mailType=${cat.key}`);
    const data = await res.json();
    setBulkCount(data.count ?? 0);
  }, [cat]);

  useEffect(() => {
    setBulkMsg("");
    setShowConfirm(false);
    fetchCount();
  }, [activeTab, fetchCount]);

  function update(key: string, val: string) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  async function save() {
    setSaving(true); setSaveMsg("");
    const res = await fetch("/api/admin/mail-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSaveMsg("✅ 保存しました");
    } else {
      setSaveMsg("❌ 保存に失敗しました");
    }
    setTimeout(() => setSaveMsg(""), 3000);
  }

  async function sendBulk(isTest: boolean) {
    setBulkLoading(true); setBulkMsg(""); setShowConfirm(false);
    const body: Record<string, string | null> = {
      mailType: cat.key,
      subject: settings[cat.subjectKey] || null,
      textBody: settings[cat.textKey] || null,
      htmlBody: settings[cat.htmlKey] || null,
    };
    if (isTest && testEmail) body.testEmail = testEmail;

    const res = await fetch("/api/admin/bulk-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBulkLoading(false);
    const data = await res.json();
    if (res.ok) {
      if (isTest) {
        setBulkMsg(`✅ テスト送信完了: ${testEmail} に送信しました`);
      } else {
        setBulkMsg(`✅ 一括送信完了: ${data.sent}件送信 / ${data.failed}件失敗`);
        if (data.errors?.length) {
          setBulkMsg(prev => prev + `\n⚠️ エラー: ${data.errors.join(", ")}`);
        }
      }
    } else {
      setBulkMsg("❌ 送信に失敗しました");
    }
  }

  if (loading) return <div className="text-slate-600 p-8">読み込み中...</div>;

  return (
    <div className="space-y-6">

      {/* タブ */}
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {MAIL_CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => { setActiveTab(c.key); setActiveMailTab("text"); }}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === c.key
                  ? "border-slate-900 text-slate-900 bg-slate-50"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* 説明 */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            <p className="font-bold mb-1">💡 {cat.icon} {cat.label}メール</p>
            <p>{cat.description}</p>
            <p className="mt-1">
              利用可能な変数:
              {cat.vars.map(v => (
                <code key={v} className="ml-1 bg-blue-100 px-1 rounded">{v}</code>
              ))}
              <span className="ml-2 text-blue-700">（空欄の場合はデフォルトテンプレートを使用）</span>
            </p>
          </div>

          {/* 件名 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">メール件名</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="空欄 = デフォルト件名を使用"
              value={settings[cat.subjectKey] ?? ""}
              onChange={e => update(cat.subjectKey, e.target.value)}
            />
          </div>

          {/* テキスト/HTML タブ */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveMailTab("text")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeMailTab === "text"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                📝 テキスト本文
              </button>
              <button
                type="button"
                onClick={() => setActiveMailTab("html")}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeMailTab === "html"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                🌐 HTML本文（上級者向け）
              </button>
            </div>

            {activeMailTab === "text" && (
              <div className="p-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  テキスト本文（空欄 = デフォルトを使用）
                </label>
                <textarea
                  rows={12}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="空欄の場合はデフォルトテンプレートを使用します"
                  value={settings[cat.textKey] ?? ""}
                  onChange={e => update(cat.textKey, e.target.value)}
                />
                {settings[cat.textKey] && (
                  <button
                    type="button"
                    onClick={() => update(cat.textKey, "")}
                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                  >
                    デフォルトに戻す
                  </button>
                )}
              </div>
            )}

            {activeMailTab === "html" && (
              <div className="p-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  HTML本文（空欄 = デフォルトHTMLを使用）
                </label>
                <textarea
                  rows={14}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="<!DOCTYPE html><html>...</html>"
                  value={settings[cat.htmlKey] ?? ""}
                  onChange={e => update(cat.htmlKey, e.target.value)}
                />
                {settings[cat.htmlKey] && (
                  <button
                    type="button"
                    onClick={() => update(cat.htmlKey, "")}
                    className="mt-2 text-xs text-red-500 hover:text-red-700"
                  >
                    デフォルトに戻す
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 保存ボタン */}
          <div className="flex items-center justify-between">
            {saveMsg && (
              <p className={`text-sm font-medium ${saveMsg.startsWith("✅") ? "text-emerald-700" : "text-red-600"}`}>
                {saveMsg}
              </p>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="ml-auto rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "💾 設定を保存"}
            </button>
          </div>
        </div>
      </div>

      {/* 一括送信セクション */}
      {cat.bulkTarget && (
        <div className="rounded-3xl bg-white shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              📨 {cat.icon} {cat.label}メール 一括送信
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              送信対象: <strong>{cat.bulkTarget}</strong>
              {bulkCount !== null && (
                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  現在 {bulkCount.toLocaleString()} 人
                </span>
              )}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <p className="font-bold mb-1">⚠️ 一括送信について</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>上記で設定・保存した件名・本文でメールを送信します</li>
              <li>空欄の場合はデフォルトテンプレートで送信されます</li>
              <li>送信前に必ずテスト送信で内容を確認してください</li>
              <li>大量送信は時間がかかる場合があります（300ms間隔で送信）</li>
            </ul>
          </div>

          {/* テスト送信 */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-sm font-bold text-slate-700">🧪 テスト送信</p>
            <div className="flex gap-2">
              <input
                type="email"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="テスト送信先メールアドレス"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
              />
              <button
                type="button"
                onClick={() => sendBulk(true)}
                disabled={bulkLoading || !testEmail}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
              >
                テスト送信
              </button>
            </div>
          </div>

          {/* 一括送信ボタン */}
          {!showConfirm ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={bulkLoading || bulkCount === 0}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {bulkLoading ? "送信中..." : `📨 ${bulkCount !== null ? `${bulkCount.toLocaleString()}人に` : ""}一括送信する`}
            </button>
          ) : (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
              <p className="text-sm font-bold text-red-800">
                ⚠️ 確認: 本当に {bulkCount?.toLocaleString() ?? "..."} 人にメールを一括送信しますか？
              </p>
              <p className="text-xs text-red-700">この操作は取り消せません。送信前にテスト送信で内容を確認してください。</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => sendBulk(false)}
                  disabled={bulkLoading}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkLoading ? "送信中..." : "送信する"}
                </button>
              </div>
            </div>
          )}

          {/* 送信結果 */}
          {bulkMsg && (
            <div className={`rounded-xl p-3 text-sm font-medium whitespace-pre-line ${
              bulkMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {bulkMsg}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
