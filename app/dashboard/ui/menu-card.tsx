"use client";

import { FormEvent, useState } from "react";

type SkinShop = {
  name: string;
  area: string;
  address: string;
  phone: string;
  url?: string;
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

// ─── 肌診断モーダル ───────────────────────────────────────
function SkinModal({ title, shops, onClose }: { title: string; shops: SkinShop[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">😊 {title} — 全国代理店</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        {shops.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">代理店情報は準備中です。</p>
        ) : (
          <div className="space-y-3">
            {shops.map((shop, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-4 bg-slate-50">
                <div className="font-semibold text-slate-800 text-sm">{shop.name}</div>
                {shop.area && <div className="text-xs text-slate-400 mt-0.5">📍 {shop.area}</div>}
                {shop.address && <div className="text-xs text-slate-500 mt-1">{shop.address}</div>}
                <div className="flex gap-3 mt-2">
                  {shop.phone && (
                    <a href={`tel:${shop.phone}`}
                      className="text-xs text-emerald-700 underline">📞 {shop.phone}</a>
                  )}
                  {shop.url && (
                    <a href={shop.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline">🔗 予約サイト</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 相談窓口モーダル ─────────────────────────────────────
function ContactModal({
  title, note, onClose,
  userName, userPhone, userEmail,
}: {
  title: string; note: string; onClose: () => void;
  userName: string; userPhone: string; userEmail: string;
}) {
  const [form, setForm] = useState({
    name: userName, phone: userPhone, email: userEmail, content: "",
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
        body: JSON.stringify({ ...form, menuTitle: title }),
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
  userName, userPhone, userEmail,
}: MenuCardProps & { userName: string; userPhone: string; userEmail: string }) {
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

  if (menuType === "contact") {
  return (
    <a
      href="/contact"
      className="rounded-2xl bg-white p-4 shadow-sm text-center hover:shadow-md transition-shadow cursor-pointer block"
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-semibold text-slate-800">{title}</div>
      {subtitle && (
        <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
      )}
    </a>
  );
}

  if (menuType === "url") {
    return (
      <a href={linkUrl || "#"} target="_blank" rel="noopener noreferrer"
        className="rounded-2xl bg-white p-4 shadow-sm text-center hover:shadow-md transition-shadow active:scale-95 cursor-pointer">
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      </a>
    );
  }

  // 肌診断 / 相談窓口 → モーダル表示
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
          userName={userName} userPhone={userPhone} userEmail={userEmail}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
