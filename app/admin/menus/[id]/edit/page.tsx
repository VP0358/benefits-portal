"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ImageUpload from "../../ui/image-upload";

const iconOptions = [
  { value: "smartphone", label: "📱 スマホ" },
  { value: "plane", label: "✈️ 旅行" },
  { value: "smile", label: "😊 笑顔" },
  { value: "cart", label: "🛒 カート" },
  { value: "message", label: "💬 相談" },
  { value: "jar", label: "🫙 予約" },
  { value: "star", label: "⭐ スター" },
  { value: "heart", label: "❤️ ハート" },
];

// メニュータイプ定義
const menuTypes = [
  { value: "url",         label: "🔗 URLリンク（VPphone / 旅行 / ショッピング / 細胞浴予約）" },
  { value: "skin",        label: "💆 肌診断（全国代理店一覧）" },
  { value: "contact",     label: "📞 相談窓口（お問い合わせフォーム）" },
];

// 肌診断：代理店情報の型
type SkinShop = {
  name: string;
  area: string;
  address: string;
  phone: string;
  url?: string;
};

type MenuForm = {
  title: string;
  subtitle: string;
  iconType: string;
  imageUrl: string;
  menuType: string;
  // URL系
  linkUrl: string;
  // 肌診断：代理店リスト（JSON）
  skinShops: SkinShop[];
  // 相談窓口：追加説明テキスト
  contactNote: string;
  isActive: boolean;
  isHighlight: boolean;
  sortOrder: number;
};

const defaultShop: SkinShop = { name: "", area: "", address: "", phone: "", url: "" };

export default function AdminMenuEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<MenuForm>({
    title: "", subtitle: "", iconType: "smartphone", imageUrl: "",
    menuType: "url", linkUrl: "", skinShops: [{ ...defaultShop }], contactNote: "",
    isActive: true, isHighlight: false, sortOrder: 0,
  });

  useEffect(() => {
    fetch(`/api/admin/menus/${params.id}`)
      .then(r => r.json())
      .then(data => {
        let skinShops: SkinShop[] = [{ ...defaultShop }];
        let contactNote = "";
        const menuType = data.menuType ?? "url";
        if (data.contentData) {
          try {
            const parsed = JSON.parse(data.contentData);
            if (menuType === "skin" && Array.isArray(parsed.shops)) skinShops = parsed.shops;
            if (menuType === "contact" && parsed.note) contactNote = parsed.note;
          } catch { /* ignore */ }
        }
        setForm({
          title: data.title ?? "",
          subtitle: data.subtitle ?? "",
          iconType: data.iconType ?? "smartphone",
          imageUrl: data.imageUrl ?? "",
          menuType,
          linkUrl: data.linkUrl ?? "",
          skinShops,
          contactNote,
          isActive: Boolean(data.isActive),
          isHighlight: Boolean(data.isHighlight),
          sortOrder: data.sortOrder ?? 0,
        });
        setLoading(false);
      });
  }, [params.id]);

  // 代理店リスト操作
  function updateShop(idx: number, field: keyof SkinShop, value: string) {
    const updated = form.skinShops.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    setForm({ ...form, skinShops: updated });
  }
  function addShop() { setForm({ ...form, skinShops: [...form.skinShops, { ...defaultShop }] }); }
  function removeShop(idx: number) {
    setForm({ ...form, skinShops: form.skinShops.filter((_, i) => i !== idx) });
  }

  // contentDataをJSONシリアライズ
  function buildContentData(): string | null {
    if (form.menuType === "skin") {
      return JSON.stringify({ shops: form.skinShops.filter(s => s.name) });
    }
    if (form.menuType === "contact") {
      return JSON.stringify({ note: form.contactNote });
    }
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      title: form.title,
      subtitle: form.subtitle || null,
      iconType: form.iconType,
      imageUrl: form.imageUrl || null,
      menuType: form.menuType,
      linkUrl: form.menuType === "url" ? form.linkUrl : "",
      contentData: buildContentData(),
      isActive: form.isActive,
      isHighlight: form.isHighlight,
      sortOrder: form.sortOrder,
    };
    const res = await fetch(`/api/admin/menus/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) { setError("更新に失敗しました。"); return; }
    router.push("/admin/menus");
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("このメニューを削除しますか？")) return;
    const res = await fetch(`/api/admin/menus/${params.id}`, { method: "DELETE" });
    if (!res.ok) { setError("削除に失敗しました。"); return; }
    router.push("/admin/menus");
    router.refresh();
  }

  if (loading) return <main className="rounded-3xl bg-white p-6 shadow-sm text-slate-500">読み込み中...</main>;

  return (
    <main className="rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">メニュー編集</h1>
      <form onSubmit={onSubmit} className="space-y-6">

        {/* 基本情報 */}
        <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">基本情報</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">タイトル <span className="text-red-500">*</span></label>
              <input required className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">補足テキスト</label>
              <input className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400"
                value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">アイコン</label>
              <select className="w-full rounded-xl border px-4 py-3"
                value={form.iconType} onChange={e => setForm({ ...form, iconType: e.target.value })}>
                {iconOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">並び順</label>
              <input className="w-full rounded-xl border px-4 py-3" type="number"
                value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive}
                  onChange={e => setForm({ ...form, isActive: e.target.checked })} />公開する
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isHighlight}
                  onChange={e => setForm({ ...form, isHighlight: e.target.checked })} />強調表示
              </label>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">画像</label>
            <ImageUpload value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} />
          </div>
        </section>

        {/* メニュータイプ選択 */}
        <section className="rounded-2xl border border-slate-100 p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">メニュー種別・コンテンツ設定</h2>
          <div>
            <label className="mb-2 block text-sm font-medium">メニュー種別 <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {menuTypes.map(t => (
                <label key={t.value} className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input type="radio" name="menuType" value={t.value}
                    checked={form.menuType === t.value}
                    onChange={() => setForm({ ...form, menuType: t.value })} />
                  <span className="text-sm">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* URL系 */}
          {form.menuType === "url" && (
            <div>
              <label className="mb-1 block text-sm font-medium">リンクURL <span className="text-red-500">*</span></label>
              <p className="text-xs text-slate-400 mb-2">VPphone契約先・格安旅行サイト・ショッピングサイト・細胞浴予約サイトのURLを貼り付けてください</p>
              <input required={form.menuType === "url"}
                className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:border-slate-400"
                placeholder="https://example.com"
                value={form.linkUrl}
                onChange={e => setForm({ ...form, linkUrl: e.target.value })} />
            </div>
          )}

          {/* 肌診断：代理店リスト */}
          {form.menuType === "skin" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">全国代理店リスト</label>
                <button type="button" onClick={addShop}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700">
                  ＋ 代理店を追加
                </button>
              </div>
              {form.skinShops.map((shop, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">代理店 {idx + 1}</span>
                    {form.skinShops.length > 1 && (
                      <button type="button" onClick={() => removeShop(idx)}
                        className="text-xs text-red-500 hover:text-red-700">削除</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">店舗名 *</label>
                      <input className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        placeholder="○○美容院" value={shop.name}
                        onChange={e => updateShop(idx, "name", e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">エリア</label>
                      <input className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        placeholder="東京都" value={shop.area}
                        onChange={e => updateShop(idx, "area", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">住所</label>
                      <input className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        placeholder="東京都渋谷区○○1-2-3" value={shop.address}
                        onChange={e => updateShop(idx, "address", e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">電話番号</label>
                      <input className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        placeholder="03-1234-5678" value={shop.phone}
                        onChange={e => updateShop(idx, "phone", e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">予約URL（任意）</label>
                      <input className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                        placeholder="https://..." value={shop.url ?? ""}
                        onChange={e => updateShop(idx, "url", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 相談窓口 */}
          {form.menuType === "contact" && (
            <div>
              <label className="mb-1 block text-sm font-medium">フォーム上部の説明文（任意）</label>
              <p className="text-xs text-slate-400 mb-2">会員がフォームを開いたときに表示するメッセージです</p>
              <textarea rows={4}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                placeholder="お気軽にご相談ください。担当者より折り返しご連絡いたします。"
                value={form.contactNote}
                onChange={e => setForm({ ...form, contactNote: e.target.value })} />
            </div>
          )}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between gap-3">
          <button type="button" onClick={onDelete}
            className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
            削除する
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={() => router.push("/admin/menus")}
              className="rounded-xl border px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
              戻る
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white disabled:opacity-50 hover:bg-slate-800">
              {saving ? "保存中..." : "更新する"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
