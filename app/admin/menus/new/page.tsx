"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "../ui/image-upload";

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
  { value: "url",                label: "🔗 外部URLリンク",   desc: "管理ページで設定したURLを開く（肌診断・細胞浴・ショッピングなど）" },
  { value: "vp_phone",           label: "📱 VPphone",          desc: "VP未来phone申込ページへ遷移（内容を管理で変更可）" },
  { value: "travel_sub",         label: "✈️ 格安旅行",          desc: "格安旅行申込モーダルを表示" },
  { value: "used_car",           label: "🚗 中古車販売",        desc: "中古車専用問い合わせページへ遷移（内容を管理で変更可）" },
  { value: "contact",            label: "📞 相談窓口",          desc: "相談窓口フォームへ遷移" },
  { value: "skin",               label: "💆 肌診断",            desc: "全国代理店リストを表示（都道府県別・種別管理）" },
  { value: "life_insurance",     label: "🛡️ 生命保険相談",       desc: "生命保険相談申込ページへ遷移（内容を管理で変更可）" },
  { value: "non_life_insurance", label: "🚗 損害保険相談",       desc: "損害保険相談申込ページへ遷移（内容を管理で変更可）" },
];

// ── 都道府県リスト（北海道→沖縄順）──
export const PREFECTURES = [
  "北海道",
  "青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

// ── 店舗種別（管理画面フォーム用：全国対応は除外）──
export const SHOP_TYPES = [
  { value: "hq",         label: "本部",       badge: "🏢 本部",       color: "#7c3aed", sortOrder: 0 },
  { value: "direct",     label: "直営",       badge: "🏪 直営",       color: "#2563eb", sortOrder: 1 },
  { value: "authorized", label: "正規代理店", badge: "✅ 正規代理店", color: "#d97706", sortOrder: 3 },
  { value: "agent",      label: "代理店",     badge: "📍 代理店",     color: "#6b7280", sortOrder: 4 },
];

export type SkinShop = {
  name: string;
  area: string;
  address: string;
  phone: string;
  url?: string;
  websiteUrl?: string;
  photos?: string[];
  prefecture?: string;   // 都道府県
  shopType?: string;     // hq / direct / authorized / agent（全国対応は除外）
};

type MenuForm = {
  title: string;
  subtitle: string;
  iconType: string;
  imageUrl: string;
  menuType: string;
  linkUrl: string;
  skinShops: SkinShop[];
  contactNote: string;
  vpHeadline: string;
  vpDescription: string;
  vpBadges: string;
  vpNote: string;
  carHeadline: string;
  carDescription: string;
  carBadges: string;
  carNote: string;
  isActive: boolean;
  isHighlight: boolean;
  sortOrder: number;
};

const defaultShop: SkinShop = {
  name: "", area: "", address: "", phone: "", url: "", websiteUrl: "", photos: [],
  prefecture: "", shopType: "agent",
};

// 表示順でshopsをソート
function sortShops(shops: SkinShop[]): SkinShop[] {
  return [...shops].sort((a, b) => {
    const aTypeOrder = SHOP_TYPES.find(t => t.value === a.shopType)?.sortOrder ?? 99;
    const bTypeOrder = SHOP_TYPES.find(t => t.value === b.shopType)?.sortOrder ?? 99;
    if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder;
    // 都道府県順
    const aPrefOrder = PREFECTURES.indexOf(a.prefecture ?? "");
    const bPrefOrder = PREFECTURES.indexOf(b.prefecture ?? "");
    const aP = aPrefOrder === -1 ? 999 : aPrefOrder;
    const bP = bPrefOrder === -1 ? 999 : bPrefOrder;
    return aP - bP;
  });
}

export default function AdminMenuNewPage() {
  const router = useRouter();
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm] = useState<MenuForm>({
    title: "", subtitle: "", iconType: "smartphone", imageUrl: "",
    menuType: "url", linkUrl: "", skinShops: [{ ...defaultShop }],
    contactNote: "",
    vpHeadline: "VP未来phone",
    vpDescription: "下記内容をご確認の上、お申し込みください。担当者よりご連絡いたします。",
    vpBadges: "💰 お得な料金,📶 安定した通信,🛡️ 安心サポート,📱 最新機種対応",
    vpNote: "※ 審査結果によってはご希望に添えない場合がございます。",
    carHeadline: "中古車購入申込フォーム",
    carDescription: "下記内容をご記入の上、送信してください。確認後、担当より記載メールアドレスへご連絡いたします。",
    carBadges: "💰 お得な価格,🔍 豊富な在庫,🛡️ 安心サポート,🚚 全国対応",
    carNote: "通常2〜3営業日以内にご連絡いたします。",
    isActive: true, isHighlight: false, sortOrder: 0,
  });

  function updateShop(idx: number, field: keyof SkinShop, value: string) {
    setForm(f => ({ ...f, skinShops: f.skinShops.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  }
  function addShop() { setForm(f => ({ ...f, skinShops: [...f.skinShops, { ...defaultShop }] })); }
  function removeShop(idx: number) { setForm(f => ({ ...f, skinShops: f.skinShops.filter((_, i) => i !== idx) })); }
  function moveShop(idx: number, dir: -1 | 1) {
    setForm(f => {
      const shops = [...f.skinShops];
      const target = idx + dir;
      if (target < 0 || target >= shops.length) return f;
      [shops[idx], shops[target]] = [shops[target], shops[idx]];
      return { ...f, skinShops: shops };
    });
  }
  function updateShopPhoto(shopIdx: number, photoIdx: number, url: string) {
    setForm(f => ({ ...f, skinShops: f.skinShops.map((s, i) => {
      if (i !== shopIdx) return s;
      const photos = [...(s.photos ?? [])];
      photos[photoIdx] = url;
      return { ...s, photos };
    }) }));
  }
  function addShopPhoto(shopIdx: number) {
    setForm(f => ({ ...f, skinShops: f.skinShops.map((s, i) =>
      i === shopIdx ? { ...s, photos: [...(s.photos ?? []), ""] } : s
    ) }));
  }
  function removeShopPhoto(shopIdx: number, photoIdx: number) {
    setForm(f => ({ ...f, skinShops: f.skinShops.map((s, i) =>
      i === shopIdx ? { ...s, photos: (s.photos ?? []).filter((_, pi) => pi !== photoIdx) } : s
    ) }));
  }

  function buildContentData() {
    if (form.menuType === "skin") {
      const sorted = sortShops(form.skinShops.filter(s => s.name));
      return JSON.stringify({ shops: sorted });
    }
    if (form.menuType === "contact") return JSON.stringify({ note: form.contactNote });
    if (form.menuType === "vp_phone") return JSON.stringify({
      headline:    form.vpHeadline,
      description: form.vpDescription,
      badges:      form.vpBadges.split(",").map(s => s.trim()).filter(Boolean),
      note:        form.vpNote,
    });
    if (form.menuType === "used_car") return JSON.stringify({
      headline:    form.carHeadline,
      description: form.carDescription,
      badges:      form.carBadges.split(",").map(s => s.trim()).filter(Boolean),
      note:        form.carNote,
    });
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/admin/menus", {
      method: "POST",
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
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ? JSON.stringify(data.error) : "作成に失敗しました。");
      return;
    }
    router.push("/admin/menus");
  }

  const ic = iconOptions.find(o => o.value === form.iconType);

  return (
    <div className="space-y-5">

      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">➕ メニュー新規作成</h1>
          <p className="text-sm text-slate-800 mt-0.5">入力後「作成する」を押してください</p>
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

          {/* 並び順・公開設定 */}
          <div className="flex items-center gap-6 flex-wrap pt-1">
            <div>
              <label className={labelClass}>並び順</label>
              <input type="number" min="0" className="w-24 rounded-xl border border-slate-400 px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-500"
                value={form.sortOrder}
                onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none mt-4">
              <input type="checkbox" checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                className="rounded" />
              <span>公開する</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${form.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                {form.isActive ? "公開中" : "非公開"}
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none mt-4">
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
            <span className="text-xs font-normal text-slate-800">（設定しない場合はアイコンで表示）</span>
          </h2>
          <ImageUpload value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} />
        </div>

        {/* ━━━ ③ メニュー種別・URL設定 ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">3</span>
            メニュー種別・コンテンツ設定
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
                <div className="text-xs text-slate-800 mt-0.5">{t.desc}</div>
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
                タップすると移動します。外部サイトは https://〜 で入力してください。
              </p>
              <input
                required={form.menuType === "url"}
                className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-400"
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
            <SkinShopEditor
              shops={form.skinShops}
              onUpdate={(idx, field, val) => updateShop(idx, field, val)}
              onAdd={addShop}
              onRemove={removeShop}
              onMove={moveShop}
              onAddPhoto={addShopPhoto}
              onRemovePhoto={removeShopPhoto}
              onUpdatePhoto={updateShopPhoto}
            />
          )}

          {/* 相談窓口 */}
          {form.menuType === "contact" && (
            <div className="rounded-2xl bg-purple-50 p-4 space-y-2">
              <label className="block text-sm font-bold text-purple-800">📝 フォーム上部の説明文（任意）</label>
              <p className="text-xs text-purple-600">会員がフォームを開いたときに表示するメッセージです。</p>
              <textarea rows={4}
                className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-purple-400 resize-none"
                placeholder="お気軽にご相談ください。担当者より折り返しご連絡いたします。"
                value={form.contactNote}
                onChange={e => setForm({ ...form, contactNote: e.target.value })} />
            </div>
          )}

          {/* VPphone 設定 */}
          {form.menuType === "vp_phone" && (
            <WelfareContentEditor
              color="green"
              headline={form.vpHeadline}
              description={form.vpDescription}
              badges={form.vpBadges}
              note={form.vpNote}
              onChange={(field, val) => setForm(f => ({ ...f, [`vp${field}`]: val }))}
              badgePlaceholder="💰 お得な料金,📶 安定した通信,🛡️ 安心サポート"
              descPlaceholder="下記内容をご確認の上、お申し込みください。"
              notePlaceholder="※ 審査結果によってはご希望に添えない場合がございます。"
            />
          )}

          {/* 中古車販売 設定 */}
          {form.menuType === "used_car" && (
            <WelfareContentEditor
              color="amber"
              headline={form.carHeadline}
              description={form.carDescription}
              badges={form.carBadges}
              note={form.carNote}
              onChange={(field, val) => setForm(f => ({ ...f, [`car${field}`]: val }))}
              badgePlaceholder="💰 お得な価格,🔍 豊富な在庫,🛡️ 安心サポート,🚚 全国対応"
              descPlaceholder="下記内容をご記入の上、送信してください。"
              notePlaceholder="通常2〜3営業日以内にご連絡いたします。"
            />
          )}
        </div>

        {/* ━━━ ④ プレビュー ━━━ */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <span className="rounded-full bg-slate-900 text-white text-xs px-2 py-0.5">4</span>
            プレビュー（会員画面での表示イメージ）
          </h2>
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-400 p-5 w-28">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt={form.title}
                  className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                  {ic?.emoji ?? "🔗"}
                </div>
              )}
              <div className="text-xs font-bold text-slate-700 text-center">{form.title || "タイトル"}</div>
              {form.subtitle && <div className="text-[10px] text-slate-800 text-center">{form.subtitle}</div>}
            </div>
          </div>
        </div>

        {/* メッセージ */}
        {error && <div className="rounded-2xl bg-red-50 px-5 py-3 text-sm text-red-600">{error}</div>}

        {/* ボタン */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/admin/menus")}
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 transition-colors">
            キャンセル
          </button>
          <button type="submit" disabled={saving}
            className="rounded-2xl bg-slate-900 px-8 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? "作成中..." : "➕ 作成する"}
          </button>
        </div>

      </form>
    </div>
  );
}

// ── 肌診断 代理店エディター ──────────────────────────────────────────
type SkinShopEditorProps = {
  shops: SkinShop[];
  onUpdate: (idx: number, field: keyof SkinShop, val: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onAddPhoto: (shopIdx: number) => void;
  onRemovePhoto: (shopIdx: number, photoIdx: number) => void;
  onUpdatePhoto: (shopIdx: number, photoIdx: number, url: string) => void;
};

function SkinShopEditor({ shops, onUpdate, onAdd, onRemove, onMove, onAddPhoto, onRemovePhoto, onUpdatePhoto }: SkinShopEditorProps) {
  return (
    <div className="space-y-3">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-slate-700">代理店リスト</span>
          <p className="text-xs text-slate-500 mt-0.5">保存時に「種別 → 都道府県」の順に自動並び替えされます</p>
        </div>
        <button type="button" onClick={onAdd}
          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700">
          ＋ 代理店を追加
        </button>
      </div>

      {shops.map((shop, idx) => {
        const typeInfo = SHOP_TYPES.find(t => t.value === shop.shopType);
        return (
          <div key={idx} className="rounded-2xl border border-slate-300 p-4 bg-slate-50 space-y-4">

            {/* ── ヘッダー行：番号・種別バッジ・移動・削除 ── */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex-1">
                代理店 {idx + 1}
                {typeInfo && (
                  <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: typeInfo.color }}>
                    {typeInfo.label}
                  </span>
                )}
                {shop.prefecture && (
                  <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-700">
                    {shop.prefecture}
                  </span>
                )}
              </span>
              <button type="button" onClick={() => onMove(idx, -1)} disabled={idx === 0}
                className="px-2 py-1 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="上へ">▲</button>
              <button type="button" onClick={() => onMove(idx, 1)} disabled={idx === shops.length - 1}
                className="px-2 py-1 rounded-lg border border-slate-300 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="下へ">▼</button>
              {shops.length > 1 && (
                <button type="button" onClick={() => onRemove(idx)}
                  className="px-2 py-1 rounded-lg border border-red-200 text-xs text-red-500 hover:bg-red-50">削除</button>
              )}
            </div>

            {/* ── ① 店舗名 ── */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                店舗名 <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400 bg-white"
                placeholder="例：○○美容院"
                value={shop.name}
                onChange={e => onUpdate(idx, "name", e.target.value)}
              />
            </div>

            {/* ── ② 店舗種別ボタン ── */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">種別 <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-1.5">
                {SHOP_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => onUpdate(idx, "shopType", t.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                      shop.shopType === t.value
                        ? "text-white border-transparent"
                        : "border-slate-200 text-slate-600 hover:border-slate-400 bg-white"
                    }`}
                    style={shop.shopType === t.value ? { background: t.color, borderColor: t.color } : {}}>
                    {t.badge}
                  </button>
                ))}
              </div>
            </div>

            {/* ── ③ 都道府県ピッカー（正規代理店・代理店のみ） ── */}
            {(shop.shopType === "authorized" || shop.shopType === "agent") && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">都道府県</label>
                <div className="flex flex-wrap gap-1 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  {PREFECTURES.map(pref => (
                    <button key={pref} type="button"
                      onClick={() => onUpdate(idx, "prefecture", shop.prefecture === pref ? "" : pref)}
                      className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                        shop.prefecture === pref
                          ? "bg-slate-900 text-white font-bold"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}>
                      {pref}
                    </button>
                  ))}
                </div>
                {shop.prefecture && (
                  <p className="mt-1 text-xs text-slate-500">選択中: <strong>{shop.prefecture}</strong></p>
                )}
              </div>
            )}

            {/* ── ④⑤⑥ 電話番号・予約URL・ウェブサイトURL ── */}
            <div className="grid grid-cols-1 gap-3">
              {[
                { field: "phone"      as const, label: "電話番号",       placeholder: "03-1234-5678" },
                { field: "url"        as const, label: "予約URL",        placeholder: "https://..." },
                { field: "websiteUrl" as const, label: "ウェブサイトURL", placeholder: "https://..." },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-slate-700">{label}</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-400 bg-white"
                    placeholder={placeholder}
                    value={shop[field] ?? ""}
                    onChange={e => onUpdate(idx, field, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* ── ⑦ 写真アップロード（最大5枚） ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">📷 写真（最大5枚）</label>
                {(shop.photos ?? []).length < 5 && (
                  <button type="button" onClick={() => onAddPhoto(idx)}
                    className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs text-white hover:bg-slate-800">
                    ＋ 写真を追加
                  </button>
                )}
              </div>
              {(shop.photos ?? []).length === 0 && (
                <p className="text-xs text-slate-400">写真はまだ登録されていません。「＋ 写真を追加」から追加できます。</p>
              )}
              {(shop.photos ?? []).map((photoUrl, pi) => (
                <div key={`${idx}-${pi}-${photoUrl}`} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-2">
                  <div className="text-xs text-slate-500 font-medium mt-2 w-5 shrink-0">{pi + 1}</div>
                  {photoUrl && (
                    <img src={photoUrl} alt={`写真${pi + 1}`}
                      className="h-14 w-14 rounded-lg object-cover shrink-0 border border-slate-200" />
                  )}
                  <div className="flex-1 space-y-1.5">
                    <ImageUpload value={photoUrl} onChange={url => onUpdatePhoto(idx, pi, url)} />
                  </div>
                  <button type="button" onClick={() => onRemovePhoto(idx, pi)}
                    className="mt-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-500 hover:bg-red-50 shrink-0">
                    削除
                  </button>
                </div>
              ))}
            </div>

          </div>
        );
      })}
    </div>
  );
}

// ── 共通: VPphone / 中古車 コンテンツ編集コンポーネント ──────────────
type WelfareEditorProps = {
  color: "green" | "amber";
  headline: string;
  description: string;
  badges: string;
  note: string;
  onChange: (field: "Headline" | "Description" | "Badges" | "Note", val: string) => void;
  badgePlaceholder: string;
  descPlaceholder: string;
  notePlaceholder: string;
};

function WelfareContentEditor({ color, headline, description, badges, note, onChange, badgePlaceholder, descPlaceholder, notePlaceholder }: WelfareEditorProps) {
  const colors = {
    green: { bg: "bg-emerald-50", border: "border-emerald-200", label: "text-emerald-800", focus: "focus:border-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
    amber: { bg: "bg-amber-50",   border: "border-amber-200",   label: "text-amber-800",   focus: "focus:border-amber-400",   badge: "bg-amber-100 text-amber-700" },
  }[color];

  const previewBadges = badges.split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div className={`rounded-2xl ${colors.bg} p-5 space-y-4`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-sm font-bold ${colors.label}`}>
          {color === "green" ? "📱 VP未来phone ページ内容設定" : "🚗 中古車販売 ページ内容設定"}
        </span>
        <span className="text-xs text-slate-500">（会員が見るページに反映されます）</span>
      </div>

      <div>
        <label className={`block text-xs font-bold mb-1 ${colors.label}`}>ページ見出し</label>
        <input
          className={`w-full rounded-xl border ${colors.border} bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none ${colors.focus}`}
          placeholder="例: VP未来phone"
          value={headline}
          onChange={e => onChange("Headline", e.target.value)}
        />
      </div>

      <div>
        <label className={`block text-xs font-bold mb-1 ${colors.label}`}>説明文（ページ上部に表示）</label>
        <textarea rows={3}
          className={`w-full rounded-xl border ${colors.border} bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none ${colors.focus} resize-none`}
          placeholder={descPlaceholder}
          value={description}
          onChange={e => onChange("Description", e.target.value)}
        />
      </div>

      <div>
        <label className={`block text-xs font-bold mb-1 ${colors.label}`}>特徴バッジ（カンマ区切りで入力）</label>
        <input
          className={`w-full rounded-xl border ${colors.border} bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none ${colors.focus}`}
          placeholder={badgePlaceholder}
          value={badges}
          onChange={e => onChange("Badges", e.target.value)}
        />
        {previewBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {previewBadges.map((b, i) => (
              <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}>{b}</span>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-1">例: 💰 お得な料金,📶 安定した通信,🛡️ 安心サポート</p>
      </div>

      <div>
        <label className={`block text-xs font-bold mb-1 ${colors.label}`}>注意書き・フッター文（ページ下部に表示）</label>
        <input
          className={`w-full rounded-xl border ${colors.border} bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none ${colors.focus}`}
          placeholder={notePlaceholder}
          value={note}
          onChange={e => onChange("Note", e.target.value)}
        />
      </div>
    </div>
  );
}

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";
const inputClass  = "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";
