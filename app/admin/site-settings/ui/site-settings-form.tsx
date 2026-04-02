"use client";

import { useEffect, useState } from "react";
import ProductImageUpload from "@/app/admin/products/ui/product-image-upload";

export default function SiteSettingsForm() {
  const [faviconUrl, setFaviconUrl] = useState("");
  const [siteTitle, setSiteTitle] = useState("福利厚生ポータル");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/site-settings").then(r => r.json()).then(data => {
      setFaviconUrl(data.faviconUrl || "");
      setSiteTitle(data.siteTitle || "福利厚生ポータル");
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true); setError(""); setMessage("");
    const res = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faviconUrl: faviconUrl || null, siteTitle: siteTitle || null }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(()=>null); setError(d?.error || "保存に失敗しました。"); return; }
    setMessage("保存しました。ページ再読み込み後に反映されます。");
  }

  if (loading) return <div className="text-slate-500">読み込み中...</div>;

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">サイトタイトル</label>
        <input className="w-full rounded-xl border px-4 py-3 text-sm" value={siteTitle} onChange={e => setSiteTitle(e.target.value)} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">ファビコン（ブラウザタブのアイコン）</label>
        <ProductImageUpload value={faviconUrl} onChange={setFaviconUrl} />
      </div>
      {faviconUrl && (
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="mb-2 text-sm text-slate-500">現在のファビコン</div>
          <img src={faviconUrl} alt="favicon" className="h-10 w-10 rounded object-cover" />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50">{saving ? "保存中..." : "保存する"}</button>
      </div>
    </div>
  );
}
