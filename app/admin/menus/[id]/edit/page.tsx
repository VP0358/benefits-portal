"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ImageUpload from "../../ui/image-upload";

const iconOptions = [
  { value: "smartphone", emoji: "📱", label: "スマホ" },
  { value: "plane",      emoji: "✈️", label: "旅行" },
  { value: "smile",      emoji: "😊", label: "笑顔" },
  { value: "cart",       emoji: "🛒", label: "カート" },
  { value: "message",    emoji: "💬", label: "相談" },
  { value: "jar",        emoji: "🫙", label: "予約" },
  { value: "star",       emoji: "⭐", label: "スター" },
  { value: "heart",      emoji: "❤️", label: "ハート" },
];

const menuTypes = [
  { value: "url",     label: "🔗 URLリンク",         desc: "VPphone / 旅行 / ショッピング / 細胞浴予約" },
  { value: "skin",    label: "💆 肌診断",             desc: "全国代理店一覧を表示" },
  { value: "contact", label: "📞 相談窓口",           desc: "お問い合わせフォームを表示" },
];

type SkinShop = { name: string; area: string; address: string; phone: string; url?: string };

type MenuForm = {
  title: string;
  subtitle: string;
  iconType: string;
  imageUrl: string;
  menuType: string;
  linkUrl: string;
  skinShops: SkinShop[];
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
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<MenuForm>({
    title: "", subtitle: "", iconType: "smartphone", imageUrl: "",
    menuType: "url", linkUrl: "", skinShops: [{ ...defaultShop }],
    contactNote: "", isActive: true, isHighlight: false, sortOrder: 0,
  });

  useEffect(() => {
    fetch(`/api/admin/menus/${params.id}`)
      .then(r => r.json())
      .then(data => {
        const menuType = data.menuType ?? "url";
        let skinShops: SkinShop[] = [{ ...defaultShop }];
        let contactNote = "";
        if (data.contentData) {
          try {
            const parsed = JSON.parse(data.contentData);
            if (menuType === "skin" && Array.isArray(parsed.shops)) skinShops = parsed.shops;
            if (menuType === "contact" && parsed.note) contactNote = parsed.note;
          } catch { /* ignore */ }
        }
        setForm({
          title:       data.title      ?? "",
          subtitle:    data.subtitle   ?? "",
          iconType:    data.iconType   ?? "smartphone",
          imageUrl:    data.imageUrl   ?? "",
          menuType,
          linkUrl:     data.linkUrl    ?? "",
          skinShops,
          contactNote,
          isActive:    Boolean(data.isActive),
          isHighlight: Boolean(data.isHighlight),
          sortOrder:   data.sortOrder  ?? 0,
        });
        setLoading(false);
      });
  }, [params.id]);

  function updateShop(idx: number, field: keyof SkinShop, value: string) {
    setForm(f => ({ ...f, skinShops: f.skinShops.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  }
  function addShop()          { setForm(f => ({ ...f, skinShops: [...f.skinShops, { ...defaultShop }] })); }
  function removeShop(idx: number) { setForm(f => ({ ...f, skinShops: f.skinShops.filter((_, i) => i !== idx) })); }

  function buildContentData() {
    if (form.menuType === "skin")    return JSON.stringify({ shops: form.skinShops.filter(s => s.name) });
    if (form.menuType === "contact") return JSON.stringify({ note: form.contactNote });
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    const res = await fetch(`/api/admin/menus/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       form.title,
        subtitle:    form.subtitle   || null,
        iconType:    form.iconType,
        imageUrl:    form.imageUrl   || null,
        menuType:    form.menuType,
        linkUrl:     form.menuType === "url" ? form.linkUrl : "",
        contentData: buildContentData(),
        isActive:    form.isActive,
        isHighlight: form.isHighlight,
        sortOrder:   form.sortOrder,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError("更新に失敗しました。"); return; }
    setSuccess("更新しました！");
    setTimeout(() => router.push("/admin/menus"), 800);
  }

  async function onDelete() {
    if (!confirm(`「${form.title}」を削除しますか？`)) return;
    const res = await fetch(`/api/admin/menus/${params.id}`, { method: "DELETE" });
    if (!res.ok) { setError("削除に失敗しました。"); return; }
    router.push("/admin/menus");
  }

  if (loading) return (
    <div className="rounded-3xl bg-white p-10 shadow-sm text-center text-slate-600">読み込み中...</div>
  );

  const ic = iconOptions.find(o => o.value === form.iconType);

  return (
    <div className="space-y-5">

      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">📋 メニュー編集</h1>
          <p className="text-sm text-slate-600 mt-0.5">変更後「更新する」を押してください</p>
        </div>
        <button type="button" onClick={() => router.push("/admin/menus")}
          className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
          ← 一覧に戻る
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">

        {/* ━━━ ① 名称・表示設定 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">1</span>
            名称・表示設定
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>メニュー名 <span className="text-red-500">*</span></label>
              <input required className={inputClass} placeholder="例：VPphone"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>サブテキスト（小さく表示）</label>
              <input className={inputClass} placeholder="例：契約・確認"
                value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} />
            </div>
          </div>

          {/* アイコン選択 */}
          <div>
            <label className={labelClass}>アイコン</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {iconOptions.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({ ...form, iconType: opt.value })}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    form.iconType === opt.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:border-slate-400"
                  }`}>
                  <span>{opt.emoji}</span><span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 公開設定 */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                className="rounded" />
              <span>公開する</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${form.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {form.isActive ? "公開中" : "非公開"}
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.isHighlight}
                onChange={e => setForm({ ...form, isHighlight: e.target.checked })}
                className="rounded" />
              <span>強調表示</span>
            </label>
          </div>
        </div>

        {/* ━━━ ② 画像設定 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">2</span>
            メニュー画像
            <span className="text-xs font-normal text-slate-600">（設定しない場合はアイコンで表示）</span>
          </h2>

          {/* 現在の画像プレビュー */}
          {form.imageUrl && (
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-3">
              <img src={form.imageUrl} alt="現在の画像"
                className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-700 mb-1">現在の画像</div>
                <div className="text-xs text-slate-600 truncate">{form.imageUrl}</div>
              </div>
              <button type="button"
                onClick={() => setForm({ ...form, imageUrl: "" })}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                削除
              </button>
            </div>
          )}

          <ImageUpload value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} />
        </div>

        {/* ━━━ ③ メニュー種別・URL設定 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">3</span>
            メニュー種別・URL設定
          </h2>

          {/* 種別選択 */}
          <div className="grid gap-2 md:grid-cols-3">
            {menuTypes.map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm({ ...form, menuType: t.value })}
                className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                  form.menuType === t.value
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-100 hover:border-slate-300"
                }`}>
                <div className="font-semibold text-sm text-slate-800">{t.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* URLリンク入力 */}
          {form.menuType === "url" && (
            <div className="rounded-2xl bg-blue-50 p-4 space-y-2">
              <label className="block text-sm font-bold text-blue-800">
                🔗 リンク先URL <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-blue-600">
                タップすると外部サイトへ移動します。契約先・格安サイト・ショッピングサイトなどのURLを貼り付けてください。
              </p>
              <input
                required={form.menuType === "url"}
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
                placeholder="https://example.com"
                value={form.linkUrl}
                onChange={e => setForm({ ...form, linkUrl: e.target.value })}
              />
              {form.linkUrl && (
                <a href={form.linkUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 underline">
                  ↗ URLを確認する
                </a>
              )}
            </div>
          )}

          {/* 肌診断：代理店リスト */}
          {form.menuType === "skin" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">全国代理店リスト</span>
                <button type="button" onClick={addShop}
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700">
                  ＋ 代理店を追加
                </button>
              </div>
              {form.skinShops.map((shop, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">代理店 {idx + 1}</span>
                    {form.skinShops.length > 1 && (
                      <button type="button" onClick={() => removeShop(idx)}
                        className="text-xs text-red-500 hover:text-red-700">削除</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { field: "name"    as const, label: "店舗名 *",    placeholder: "○○美容院" },
                      { field: "area"    as const, label: "エリア",       placeholder: "東京都" },
                      { field: "address" as const, label: "住所",         placeholder: "渋谷区○○1-2-3", span: true },
                      { field: "phone"   as const, label: "電話番号",     placeholder: "03-1234-5678" },
                      { field: "url"     as const, label: "予約URL（任意）", placeholder: "https://..." },
                    ].map(({ field, label, placeholder, span }) => (
                      <div key={field} className={span ? "col-span-2" : ""}>
                        <label className="mb-1 block text-xs text-slate-700">{label}</label>
                        <input className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-slate-400 bg-white"
                          placeholder={placeholder}
                          value={shop[field] ?? ""}
                          onChange={e => updateShop(idx, field, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 相談窓口 */}
          {form.menuType === "contact" && (
            <div className="rounded-2xl bg-purple-50 p-4 space-y-2">
              <label className="block text-sm font-bold text-purple-800">📝 フォーム上部の説明文（任意）</label>
              <p className="text-xs text-purple-600">会員がフォームを開いたときに表示するメッセージです。</p>
              <textarea rows={4}
                className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm focus:outline-none focus:border-purple-400 resize-none"
                placeholder="お気軽にご相談ください。担当者より折り返しご連絡いたします。"
                value={form.contactNote}
                onChange={e => setForm({ ...form, contactNote: e.target.value })} />
            </div>
          )}
        </div>

        {/* ━━━ ④ プレビュー ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">4</span>
            プレビュー（会員画面での表示イメージ）
          </h2>
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-5 w-28">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt={form.title}
                  className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                  {ic?.emoji ?? "🔗"}
                </div>
              )}
              <div className="text-xs font-bold text-slate-700 text-center">{form.title || "タイトル"}</div>
              {form.subtitle && <div className="text-[10px] text-slate-600 text-center">{form.subtitle}</div>}
            </div>
          </div>
        </div>

        {/* メッセージ */}
        {error   && <div className="rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>}
        {success && <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-sm text-emerald-700 font-medium">✅ {success}</div>}

        {/* ボタン */}
        <div className="flex justify-between gap-3">
          <button type="button" onClick={onDelete}
            className="rounded-2xl border border-red-200 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
            🗑 削除する
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 max-w-xs rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? "更新中..." : "✓ 更新する"}
          </button>
        </div>

      </form>
    </div>
  );
}

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
const inputClass  = "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";
