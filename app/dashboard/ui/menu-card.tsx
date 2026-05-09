"use client";

import { FormEvent, useState } from "react";

type SkinShop = {
  name: string;
  area: string;
  address: string;
  phone: string;
  url?: string;
  websiteUrl?: string;
  photos?: string[]; // 写真最大5枚
};

type MenuCardProps = {
  id: string;
  title: string;
  subtitle?: string | null;
  iconType?: string | null;
  menuType: string;
  linkUrl?: string | null;
  contentData?: string | null;
};

const iconMap: Record<string, string> = {
  smartphone: "📱", plane: "✈️", smile: "😊", cart: "🛒",
  message: "💬", jar: "🫙", star: "⭐", heart: "❤️",
};

// ─── ③ Googleマップ URL 生成 ─────────────────────────────
function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ─── 肌診断モーダル ───────────────────────────────────────
function SkinModal({ title, shops, onClose }: { title: string; shops: SkinShop[]; onClose: () => void }) {
  const [photoIdx, setPhotoIdx] = useState<{ shopIdx: number; imgIdx: number } | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">😊 {title} — 全国代理店</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        {shops.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">代理店情報は準備中です。</p>
        ) : (
          <div className="space-y-4">
            {shops.map((shop, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-4 bg-slate-50 space-y-2">
                {/* 店舗名 */}
                <div className="font-semibold text-slate-800 text-sm">{shop.name}</div>

                {/* エリア */}
                {shop.area && (
                  <div className="text-xs text-slate-400">📍 {shop.area}</div>
                )}

                {/* ③ 住所 → Googleマップリンク */}
                {shop.address && (
                  <a
                    href={googleMapsUrl(shop.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <span className="mt-0.5 shrink-0">🗺️</span>
                    <span>{shop.address}</span>
                  </a>
                )}

                {/* 電話・予約URL */}
                <div className="flex flex-wrap gap-3 mt-1">
                  {shop.phone && (
                    <a href={`tel:${shop.phone}`} className="text-xs text-emerald-700 underline">
                      📞 {shop.phone}
                    </a>
                  )}
                  {shop.url && (
                    <a href={shop.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline">
                      📅 ご予約はこちら
                    </a>
                  )}
                  {shop.websiteUrl && (
                    <a href={shop.websiteUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-slate-500 underline">
                      🔗 ウェブサイト
                    </a>
                  )}
                </div>

                {/* ② 写真ギャラリー */}
                {shop.photos && shop.photos.length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {shop.photos.map((src, pi) => (
                      <button
                        key={pi}
                        onClick={() => setPhotoIdx({ shopIdx: i, imgIdx: pi })}
                        className="shrink-0 rounded-xl overflow-hidden border border-slate-200 w-20 h-20 bg-slate-100"
                      >
                        <img src={src} alt={`${shop.name} 写真${pi + 1}`}
                          className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ② 写真フルスクリーンビューア */}
      {photoIdx !== null && (() => {
        const shop = shops[photoIdx.shopIdx];
        const photos = shop?.photos ?? [];
        const cur = photoIdx.imgIdx;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
            onClick={() => setPhotoIdx(null)}
          >
            <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
              <img src={photos[cur]} alt={`${shop.name} 写真${cur + 1}`}
                className="w-full rounded-2xl object-contain max-h-[70vh]" />
              {/* 前後ボタン */}
              {cur > 0 && (
                <button
                  onClick={() => setPhotoIdx({ shopIdx: photoIdx.shopIdx, imgIdx: cur - 1 })}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-9 h-9 flex items-center justify-center text-slate-700 text-lg shadow"
                >‹</button>
              )}
              {cur < photos.length - 1 && (
                <button
                  onClick={() => setPhotoIdx({ shopIdx: photoIdx.shopIdx, imgIdx: cur + 1 })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full w-9 h-9 flex items-center justify-center text-slate-700 text-lg shadow"
                >›</button>
              )}
              {/* 枚数インジケーター */}
              <div className="text-center mt-2 text-white text-xs">
                {cur + 1} / {photos.length}
              </div>
              <button
                onClick={() => setPhotoIdx(null)}
                className="absolute top-2 right-2 bg-white/80 rounded-full w-8 h-8 flex items-center justify-center text-slate-600 text-base shadow"
              >✕</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── 相談窓口モーダル ─────────────────────────────────────
function ContactModal({
  title, note, onClose,
  userName, userPhone, userEmail, userMemberCode,
}: {
  title: string; note: string; onClose: () => void;
  userName: string; userPhone: string; userEmail: string; userMemberCode: string;
}) {
  const [form, setForm] = useState({
    memberId: userMemberCode, name: userName, phone: userPhone, email: userEmail, content: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      form.name,
          phone:     form.phone,
          email:     form.email,
          menuTitle: title,
          content:   `【会員ID: ${form.memberId}】\n${form.content}`,
        }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">💬 {title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        {done ? (
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl">✅</div>
            <div className="text-base font-bold text-slate-800">送信完了！</div>
            <div className="text-sm text-slate-500">ご相談内容を受け付けました。<br />担当者より折り返しご連絡いたします。</div>
            <button onClick={onClose}
              className="mt-4 rounded-xl bg-slate-900 px-6 py-3 text-sm text-white hover:bg-slate-800">
              閉じる
            </button>
          </div>
        ) : (
          <>
            {note && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
                {note}
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">会員ID <span className="text-red-500">*</span></label>
                <input required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  placeholder="例：M0001"
                  value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">お名前 <span className="text-red-500">*</span></label>
                <input required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">電話番号 <span className="text-red-500">*</span></label>
                <input required type="tel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  placeholder="090-1234-5678"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス <span className="text-red-500">*</span></label>
                <input required type="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-400"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">相談内容 <span className="text-red-500">*</span></label>
                <textarea required rows={5}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:border-slate-400 resize-none"
                  placeholder="ご相談内容をご記入ください"
                  value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-slate-800">
                {loading ? "送信中..." : "送信する"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── メニューカード（メイン） ─────────────────────────────
export default function MenuCard({
  title, subtitle, iconType, menuType, linkUrl, contentData,
  userName, userPhone, userEmail, userMemberCode,
}: MenuCardProps & { userName: string; userPhone: string; userEmail: string; userMemberCode: string }) {
  const [showModal, setShowModal] = useState(false);

  const icon = iconMap[iconType || "star"] || "⭐";

  // contentDataをパース
  let skinShops: SkinShop[] = [];
  let contactNote = "";
  if (contentData) {
    try {
      const parsed = JSON.parse(contentData);
      if (menuType === "skin" && Array.isArray(parsed.shops)) skinShops = parsed.shops;
      if (menuType === "contact" && parsed.note) contactNote = parsed.note;
    } catch { /* ignore */ }
  }

  // ① skin で linkUrl がある場合は外部リンクに飛ぶ（代理店リストではなくURLで飛ぶ）
  // ── ページ遷移系（href で直接飛ぶ） ──────────────────────
  const pageHref: string | null =
    menuType === "contact"              ? "/contact"
    : menuType === "vp_phone"           ? "/vp-phone"
    : menuType === "used_car"           ? "/used-cars"
    : menuType === "life_insurance"     ? "/insurance?tab=life"
    : menuType === "non_life_insurance" ? "/insurance?tab=non_life"
    : menuType === "url"                ? (linkUrl || "#")
    : menuType === "skin" && linkUrl    ? linkUrl   // ① skinでURLがあれば外部リンク
    : null;

  if (pageHref !== null) {
    const isExternal = menuType === "url" || menuType === "skin";
    return (
      <a
        href={pageHref}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="rounded-2xl bg-white p-4 shadow-sm text-center hover:shadow-md transition-shadow active:scale-95 cursor-pointer block"
      >
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </a>
    );
  }

  // 肌診断（代理店リストあり）/ 相談窓口 → モーダル表示
  return (
    <>
      <button onClick={() => setShowModal(true)}
        className="rounded-2xl bg-white p-4 shadow-sm text-center hover:shadow-md transition-shadow active:scale-95 cursor-pointer w-full">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </button>

      {showModal && menuType === "skin" && (
        <SkinModal title={title} shops={skinShops} onClose={() => setShowModal(false)} />
      )}
      {showModal && menuType === "contact" && (
        <ContactModal
          title={title} note={contactNote}
          userName={userName} userPhone={userPhone} userEmail={userEmail} userMemberCode={userMemberCode}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
