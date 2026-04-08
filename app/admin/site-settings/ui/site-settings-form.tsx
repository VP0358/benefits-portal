"use client";

import { useEffect, useState } from "react";
import ProductImageUpload from "@/app/admin/products/ui/product-image-upload";

type Settings = {
  faviconUrl: string;
  siteTitle: string;
  btnBuyImageUrl: string;
  btnPointsImageUrl: string;
  btnReferralImageUrl: string;
  vpPhoneMailSubject: string;
  vpPhoneMailText: string;
  vpPhoneMailHtml: string;
};

const DEFAULT_MAIL_SUBJECT = "【VP未来phone】お申し込みありがとうございます";
const DEFAULT_MAIL_TEXT = `{name} 様

この度は、VP未来phoneにお申し込みいただきありがとうございます。

お申し込み内容を確認いたしましたので、ご連絡いたします。

【重要なお知らせ】
事務局よりKYC申請フォームが改めて届きます。
届き次第、フォームのご記入・ご提出をお願いいたします。
KYCの審査が完了しましたら、ご契約手続きを進めてまいります。

ご不明な点がございましたら、お気軽にお問い合わせください。

Quality Of Life   -人生の質を上げよう-

-----------------------------------------
CLAIRホールディングス株式会社
VIOLA-Pure
〒020-0026 岩手県盛岡市開運橋通5-6第五菱和ビル5F
TEL.019-681-3667 / FAX.050-3385-7788
営業時間.10:00-18:00
-----------------------------------------`;

export default function SiteSettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    faviconUrl: "",
    siteTitle: "福利厚生ポータル",
    btnBuyImageUrl: "",
    btnPointsImageUrl: "",
    btnReferralImageUrl: "",
    vpPhoneMailSubject: "",
    vpPhoneMailText: "",
    vpPhoneMailHtml: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeMailTab, setActiveMailTab] = useState<"text" | "html">("text");

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then(r => r.json())
      .then(data => {
        setSettings({
          faviconUrl: data.faviconUrl || "",
          siteTitle: data.siteTitle || "福利厚生ポータル",
          btnBuyImageUrl: data.btnBuyImageUrl || "",
          btnPointsImageUrl: data.btnPointsImageUrl || "",
          btnReferralImageUrl: data.btnReferralImageUrl || "",
          vpPhoneMailSubject: data.vpPhoneMailSubject || "",
          vpPhoneMailText: data.vpPhoneMailText || "",
          vpPhoneMailHtml: data.vpPhoneMailHtml || "",
        });
        setLoading(false);
      });
  }, []);

  function update(key: keyof Settings, val: string) {
    setSettings(prev => ({ ...prev, [key]: val }));
  }

  async function save() {
    setSaving(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        faviconUrl: settings.faviconUrl || null,
        siteTitle: settings.siteTitle || null,
        btnBuyImageUrl: settings.btnBuyImageUrl || null,
        btnPointsImageUrl: settings.btnPointsImageUrl || null,
        btnReferralImageUrl: settings.btnReferralImageUrl || null,
        vpPhoneMailSubject: settings.vpPhoneMailSubject || null,
        vpPhoneMailText: settings.vpPhoneMailText || null,
        vpPhoneMailHtml: settings.vpPhoneMailHtml || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "保存に失敗しました。");
      return;
    }
    setMessage("保存しました。ページ再読み込み後に反映されます。");
  }

  if (loading) return <div className="text-slate-700">読み込み中...</div>;

  return (
    <div className="space-y-8">

      {/* 基本設定 */}
      <section className="space-y-5">
        <h3 className="font-semibold text-slate-700 border-b pb-2">基本設定</h3>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">サイトタイトル</label>
          <input
            className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800"
            value={settings.siteTitle}
            onChange={e => update("siteTitle", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            ファビコン（ブラウザタブのアイコン）
          </label>
          <ProductImageUpload value={settings.faviconUrl} onChange={v => update("faviconUrl", v)} />
          {settings.faviconUrl && (
            <div className="mt-3 rounded-2xl border bg-slate-50 p-4 flex items-center gap-3">
              <img src={settings.faviconUrl} alt="favicon" className="h-10 w-10 rounded object-cover" />
              <div className="text-sm text-slate-700">現在のファビコン</div>
              <button
                type="button"
                onClick={() => update("faviconUrl", "")}
                className="ml-auto text-xs text-red-500 hover:text-red-700"
              >
                削除
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ボタン画像設定 */}
      <section className="space-y-5">
        <h3 className="font-semibold text-slate-700 border-b pb-2">ボタン画像設定</h3>
        <p className="text-xs text-slate-700">
          会員ダッシュボードのボタンに表示する画像を設定できます。<br />
          未設定の場合はデフォルトのテキストボタンが表示されます。
        </p>

        {[
          {
            key: "btnBuyImageUrl" as keyof Settings,
            label: "🛒 「商品を購入」ボタン画像",
            desc: "推奨サイズ: 横幅 400px 以上",
          },
          {
            key: "btnPointsImageUrl" as keyof Settings,
            label: "💳 「ポイントを使う」ボタン画像",
            desc: "推奨サイズ: 横幅 400px 以上",
          },
          {
            key: "btnReferralImageUrl" as keyof Settings,
            label: "🎁 「友達を紹介する」ボタン画像",
            desc: "推奨サイズ: 横幅 800px 以上（横長）",
          },
        ].map(item => (
          <div key={item.key} className="rounded-2xl border p-4 space-y-3">
            <div>
              <div className="text-sm font-medium text-slate-700">{item.label}</div>
              <div className="text-xs text-slate-700 mt-0.5">{item.desc}</div>
            </div>
            <ProductImageUpload value={settings[item.key]} onChange={v => update(item.key, v)} />
            {settings[item.key] && (
              <div className="rounded-xl bg-slate-50 p-3 flex items-center gap-3">
                <img
                  src={settings[item.key]}
                  alt={item.label}
                  className="h-12 w-auto max-w-[200px] rounded object-contain"
                />
                <span className="text-xs text-slate-700">現在の画像</span>
                <button
                  type="button"
                  onClick={() => update(item.key, "")}
                  className="ml-auto text-xs text-red-500 hover:text-red-700"
                >
                  削除
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* VP未来phone 申し込み完了メールテンプレート */}
      <section className="space-y-5">
        <h3 className="font-semibold text-slate-700 border-b pb-2">📱 VP未来phone 申し込み完了メール</h3>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <p className="font-bold mb-1">💡 メールテンプレートについて</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>空白の場合はシステムのデフォルトテンプレートが使用されます</li>
            <li>テキスト本文内で <code className="bg-blue-100 px-1 rounded">{"{name}"}</code> を使うと申込者氏名に置換されます</li>
            <li>HTMLテンプレートは空の場合テキスト本文から自動生成されます</li>
          </ul>
        </div>

        {/* 件名 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            メール件名
            <span className="text-xs font-normal text-slate-500 ml-2">（空白 = デフォルト: {DEFAULT_MAIL_SUBJECT}）</span>
          </label>
          <input
            className="w-full rounded-xl border px-4 py-3 text-sm text-slate-800"
            placeholder={DEFAULT_MAIL_SUBJECT}
            value={settings.vpPhoneMailSubject}
            onChange={e => update("vpPhoneMailSubject", e.target.value)}
          />
        </div>

        {/* テキスト/HTML タブ */}
        <div className="rounded-2xl border overflow-hidden">
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => setActiveMailTab("text")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeMailTab === "text" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              テキスト本文
            </button>
            <button
              type="button"
              onClick={() => setActiveMailTab("html")}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeMailTab === "html" ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              HTML本文（上級者向け）
            </button>
          </div>

          {activeMailTab === "text" && (
            <div className="p-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                テキスト本文（空白 = デフォルトテンプレートを使用）
              </label>
              <textarea
                rows={12}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder={DEFAULT_MAIL_TEXT}
                value={settings.vpPhoneMailText}
                onChange={e => update("vpPhoneMailText", e.target.value)}
              />
              {settings.vpPhoneMailText && (
                <button
                  type="button"
                  onClick={() => update("vpPhoneMailText", "")}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                >
                  テキスト本文をデフォルトに戻す
                </button>
              )}
            </div>
          )}

          {activeMailTab === "html" && (
            <div className="p-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                HTML本文（空白 = デフォルトHTMLテンプレートを使用）
              </label>
              <textarea
                rows={14}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="<!DOCTYPE html><html>...</html>"
                value={settings.vpPhoneMailHtml}
                onChange={e => update("vpPhoneMailHtml", e.target.value)}
              />
              {settings.vpPhoneMailHtml && (
                <button
                  type="button"
                  onClick={() => update("vpPhoneMailHtml", "")}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                >
                  HTML本文をデフォルトに戻す
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
