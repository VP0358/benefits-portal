"use client";

import { useEffect, useState } from "react";
import ProductImageUpload from "@/app/admin/products/ui/product-image-upload";

type Settings = {
  faviconUrl: string;
  siteTitle: string;
  btnBuyImageUrl: string;
  btnPointsImageUrl: string;
  btnReferralImageUrl: string;
};

export default function SiteSettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    faviconUrl: "",
    siteTitle: "福利厚生ポータル",
    btnBuyImageUrl: "",
    btnPointsImageUrl: "",
    btnReferralImageUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  if (loading) return <div className="text-slate-500">読み込み中...</div>;

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
              <div className="text-sm text-slate-500">現在のファビコン</div>
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
        <p className="text-xs text-slate-500">
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
              <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
            </div>
            <ProductImageUpload value={settings[item.key]} onChange={v => update(item.key, v)} />
            {settings[item.key] && (
              <div className="rounded-xl bg-slate-50 p-3 flex items-center gap-3">
                <img
                  src={settings[item.key]}
                  alt={item.label}
                  className="h-12 w-auto max-w-[200px] rounded object-contain"
                />
                <span className="text-xs text-slate-500">現在の画像</span>
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
