"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Link from "next/link";

interface User { id:string; name:string; memberCode:string; email:string; phone:string; availablePoints:number; }
interface DashboardPoints {
  mlmLastMonthPoints: number;
  mlmCurrentMonthPoints: number;
  savingsBonusPoints: number;
  mobileReferralPoints: number;
}
interface Announcement { id:string; title:string; content:string; tag:string; isPublished:boolean; publishedAt:string|null; }
interface Menu { id:string; title:string; subtitle?:string; iconType?:string; menuType?:string; linkUrl?:string; }

const TAG_STYLE: Record<string,string> = {
  important: "bg-red-500 text-white",
  campaign:  "bg-yellow-400 text-yellow-900",
  new:       "bg-blue-500 text-white",
  notice:    "bg-gray-400 text-white",
};
const TAG_LABEL: Record<string,string> = {
  important:"重要", campaign:"キャンペーン", new:"新機能", notice:"お知らせ"
};
const SLIDE_BG = [
  "linear-gradient(135deg, #2563eb, #60a5fa)",
  "linear-gradient(135deg, #7c3aed, #a78bfa)",
  "linear-gradient(135deg, #ea580c, #fb923c)",
  "linear-gradient(135deg, #0891b2, #22d3ee)",
  "linear-gradient(135deg, #db2777, #f472b6)",
];
const ICON_MAP: Record<string,string> = {
  smartphone:"📱", plane:"✈️", smile:"😊", cart:"🛒",
  message:"💬", jar:"🫙", gift:"🎁", star:"⭐", heart:"❤️", home:"🏠"
};
const AVATAR_OPTIONS = ["😊","😎","🦁","🐯","🐼","🦊","🐸","🌸","⭐","🔥","💎","🎯"];

// ────────── 旅行サブスク料金体系 ──────────
const TRAVEL_FEES: Record<"early"|"standard", Record<number, number>> = {
  early:    { 1: 2000, 2: 1700, 3: 1500, 4: 1200, 5: 1000 },
  standard: { 1: 3000, 2: 2700, 3: 2500, 4: 2000, 5: 1500 },
};

// ────────── VpPhoneButton（ダッシュボード用・/vp-phoneへ直遷移） ──────────
type VpAppData = {
  id: string;
  status: string;
  contractType?: string;
  adminNote?: string;
  contractedAt?: string | null;
  createdAt?: string;
};

function VpPhoneButton() {
  const [appData, setAppData] = useState<VpAppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my/vp-phone")
      .then(r => r.json())
      .then(d => {
        setAppData(d.application ? {
          id:           d.application.id,
          status:       d.application.status,
          contractType: d.application.contractType ?? "",
          adminNote:    d.application.adminNote ?? "",
          contractedAt: d.application.contractedAt ?? null,
          createdAt:    d.application.createdAt ?? "",
        } : null);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  // ステータス別スタイル定義
  type SInfo = { label: string; icon: string; cardBg: string; cardBorder: string; badgeBg: string; badgeText: string; pulse?: boolean };
  const STATUS_INFO: Record<string, SInfo> = {
    pending:    { label: "審査待ち",  icon: "⏳", cardBg: "bg-yellow-50",  cardBorder: "border-yellow-300", badgeBg: "bg-yellow-400",  badgeText: "text-white", pulse: true },
    reviewing:  { label: "審査中",    icon: "🔍", cardBg: "bg-blue-50",    cardBorder: "border-blue-400",   badgeBg: "bg-blue-500",    badgeText: "text-white", pulse: true },
    contracted: { label: "契約済み",  icon: "✅", cardBg: "bg-emerald-50", cardBorder: "border-emerald-400",badgeBg: "bg-emerald-500", badgeText: "text-white" },
    rejected:   { label: "審査不可",  icon: "❌", cardBg: "bg-red-50",    cardBorder: "border-red-300",    badgeBg: "bg-red-500",     badgeText: "text-white" },
    canceled:   { label: "取消済み",  icon: "🚫", cardBg: "bg-gray-50",   cardBorder: "border-gray-300",   badgeBg: "bg-gray-400",    badgeText: "text-white" },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow border-2 border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">📱</div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">VP未来phone</p>
          <p className="text-xs text-gray-600 animate-pulse mt-0.5">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未申し込み
  if (!appData) {
    return (
      <Link href="/vp-phone"
        className="block rounded-2xl p-4 shadow border-2 border-dashed border-green-300 bg-white hover:shadow-md hover:border-green-400 transition flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)" }}>📱</div>
          <div>
            <p className="font-bold text-sm text-gray-800">VP未来phone</p>
            <p className="text-[10px] text-gray-700 mt-0.5">お得なスマートフォン回線</p>
          </div>
        </div>
        <span className="rounded-full bg-gray-400 text-white px-3 py-1 text-xs font-bold shadow">
          未申込
        </span>
      </Link>
    );
  }

  const info = STATUS_INFO[appData.status] ?? STATUS_INFO.pending;
  const contractTypeLabel = appData.contractType === "voice" ? "音声回線" : appData.contractType === "data" ? "データ回線" : "";
  // 申込済みかつ有効（再申込でない）なら「申し込み内容変更」
  const hasActiveApp = !["rejected", "canceled"].includes(appData.status);
  const cardTitle = hasActiveApp ? "申し込み内容変更" : "VP未来phone 再申し込み";

  return (
    <Link href="/vp-phone"
      className={`block rounded-2xl p-4 shadow border-2 hover:shadow-md transition ${info.cardBg} ${info.cardBorder}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)" }}>📱</div>
          <div>
            <p className="font-bold text-sm text-gray-800">{cardTitle}</p>
            {contractTypeLabel && (
              <p className="text-[10px] text-gray-700 mt-0.5">{contractTypeLabel}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 ${info.badgeBg} ${info.badgeText} ${info.pulse ? "animate-pulse" : ""}`}>
            <span>{info.icon}</span>
            <span>{info.label}</span>
          </span>
          <span className="text-gray-600 text-xs">タップして確認 →</span>
        </div>
      </div>
      {appData.status === "contracted" && (
        <div className="mt-2 bg-emerald-100 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-800">
          🎉 VP未来phone の契約が完了しています！
        </div>
      )}
      {(appData.status === "pending" || appData.status === "reviewing") && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-700 mb-1">
            <span>申込完了</span><span>審査中</span><span>契約完了</span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${
              appData.status === "reviewing" ? "bg-blue-500 w-2/3" : "bg-yellow-400 w-1/3"
            }`} />
          </div>
        </div>
      )}
    </Link>
  );
}

// ────────── 旅行サブスクボタン（申込モーダル付き） ──────────
type TravelSubData = {
  id?: string;
  displayStatus: "active" | "inactive" | "none";
  sub: {
    level: number;
    planName: string;
    monthlyFee: number;
    status: string;
    forceStatus: string;
    startedAt?: string | null;
    confirmedAt?: string | null;
  } | null;
};

const TravelSubButton = forwardRef<{ openModal: () => void }>(function TravelSubButton(_, ref) {
  const [travelSub, setTravelSub] = useState<TravelSubData | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // 外部からモーダルを開けるようにする
  useImperativeHandle(ref, () => ({
    openModal: () => setShowApplyModal(true),
  }));
  const [applyForm, setApplyForm] = useState({
    memberCode: "",
    name: "",
    phone: "",
    email: "",
    level: 1,
  });
  const [applyError, setApplyError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyDone, setApplyDone] = useState(false);

  const loadSub = () => {
    fetch("/api/my/travel-subscription")
      .then(r => r.json())
      .then(d => setTravelSub(d))
      .catch(() => setTravelSub({ displayStatus: "none", sub: null }));
  };

  useEffect(() => { loadSub(); }, []);

  // 旅行サブスク申込送信（現状はcontact送信、将来API対応）
  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!applyForm.name || !applyForm.phone || !applyForm.email) {
      setApplyError("氏名・電話番号・メールアドレスは必須です");
      return;
    }
    setApplying(true);
    setApplyError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: applyForm.name,
          phone: applyForm.phone,
          email: applyForm.email,
          content: `【旅行サブスク申込】\n会員コード: ${applyForm.memberCode || "未入力"}\n氏名: ${applyForm.name}\n電話番号: ${applyForm.phone}\nメール: ${applyForm.email}\n現在レベル: Lv${applyForm.level}（¥${TRAVEL_FEES.early[applyForm.level].toLocaleString()}/月 ※先着50名料金）\n\n※支払日：毎月15日（翌月前払い）\n※お支払い方法：銀行振込のみ`,
          menuTitle: "旅行サブスク申込",
        }),
      });
      if (res.ok) {
        setApplyDone(true);
      } else {
        const d = await res.json().catch(() => null);
        setApplyError(d?.error || "申込に失敗しました。");
      }
    } catch {
      setApplyError("通信エラーが発生しました。");
    }
    setApplying(false);
  }

  // Lv別カラー定義
  const LV_STYLE: Record<number, { bg: string; border: string; badge: string }> = {
    1: { bg: "bg-violet-50",  border: "border-violet-200", badge: "bg-violet-500 text-white" },
    2: { bg: "bg-blue-50",    border: "border-blue-200",   badge: "bg-blue-500 text-white" },
    3: { bg: "bg-emerald-50", border: "border-emerald-200",badge: "bg-emerald-500 text-white" },
    4: { bg: "bg-amber-50",   border: "border-amber-200",  badge: "bg-amber-500 text-white" },
    5: { bg: "bg-rose-50",    border: "border-rose-200",   badge: "bg-rose-500 text-white" },
  };

  const FORCE_STYLE: Record<string, { bg: string; border: string; badge: string; label: string }> = {
    forced_active:   { bg: "bg-cyan-50",   border: "border-cyan-300",   badge: "bg-cyan-500 text-white",   label: "✨ 特別アクティブ" },
    forced_inactive: { bg: "bg-orange-50", border: "border-orange-300", badge: "bg-orange-500 text-white", label: "⏸ 一時停止中" },
  };

  // ステータス別表示設定
  const DISPLAY_STATUS: Record<string, { label: string; badge: string; cardBg: string; cardBorder: string }> = {
    active:   { label: "✅ アクティブ",     badge: "bg-emerald-500 text-white",  cardBg: "bg-emerald-50",  cardBorder: "border-emerald-300" },
    inactive: { label: "❌ 非アクティブ",   badge: "bg-slate-400 text-white",    cardBg: "bg-slate-50",    cardBorder: "border-slate-200" },
    none:     { label: "💤 未登録",          badge: "bg-gray-200 text-gray-600",  cardBg: "bg-white",       cardBorder: "border-dashed border-gray-200" },
    pending:  { label: "⏳ 申込中",          badge: "bg-yellow-400 text-white",   cardBg: "bg-yellow-50",   cardBorder: "border-yellow-300" },
    canceled: { label: "🚫 退会済み",        badge: "bg-red-400 text-white",      cardBg: "bg-red-50",      cardBorder: "border-red-200" },
    suspended:{ label: "⏸ 支払い待ち",      badge: "bg-orange-400 text-white",   cardBg: "bg-orange-50",   cardBorder: "border-orange-200" },
  };

  if (!travelSub) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow border-2 border-gray-100 flex items-center gap-3">
        <span className="text-2xl">✈️</span>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">旅行サブスク</p>
          <p className="text-xs text-gray-600 animate-pulse mt-0.5">読み込み中...</p>
        </div>
      </div>
    );
  }

  const { displayStatus, sub } = travelSub;
  const lv = sub?.level ?? 1;
  const lvStyle = LV_STYLE[lv] ?? LV_STYLE[1];
  const forceStyle = sub?.forceStatus && sub.forceStatus !== "none"
    ? FORCE_STYLE[sub.forceStatus]
    : null;

  // カードスタイルを決定
  let cardBg = "bg-white";
  let cardBorder = "border-dashed border-gray-200";
  let statusBadge = DISPLAY_STATUS.none.badge;
  let statusLabel = DISPLAY_STATUS.none.label;

  if (forceStyle) {
    cardBg = forceStyle.bg;
    cardBorder = forceStyle.border;
    statusBadge = forceStyle.badge;
    statusLabel = forceStyle.label;
  } else if (sub) {
    const subStatus = sub.status as keyof typeof DISPLAY_STATUS;
    const ds = DISPLAY_STATUS[subStatus] ?? DISPLAY_STATUS[displayStatus];
    cardBg = ds.cardBg;
    cardBorder = ds.cardBorder;
    statusBadge = ds.badge;
    statusLabel = ds.label;
  } else {
    // none
    const ds = DISPLAY_STATUS.none;
    cardBg = ds.cardBg;
    cardBorder = ds.cardBorder;
    statusBadge = ds.badge;
    statusLabel = ds.label;
  }

  return (
    <>
      <button type="button"
        onClick={() => setShowApplyModal(true)}
        className={`w-full text-left rounded-2xl p-4 shadow border-2 hover:shadow-md transition ${cardBg} ${cardBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✈️</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">旅行サブスク</p>
              {sub ? (
                <p className="text-xs text-gray-700 mt-0.5">{sub.planName} · ¥{sub.monthlyFee.toLocaleString()}/月</p>
              ) : (
                <p className="text-xs text-gray-600 mt-0.5">タップして詳細・申込</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {sub && (
              <span className={`rounded-full text-xs font-bold px-2.5 py-0.5 ${lvStyle.badge}`}>
                Lv{lv}
              </span>
            )}
            <span className={`rounded-full text-xs font-semibold px-2.5 py-1 ${statusBadge}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </button>

      {/* 旅行サブスク詳細・申込モーダル */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
          onClick={() => { setShowApplyModal(false); setApplyDone(false); setApplyError(""); }}>
          <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}>
            {/* 固定ヘッダー */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">✈️</span>
                <h2 className="font-bold text-gray-800 text-sm">旅行サブスク</h2>
              </div>
              <button onClick={() => { setShowApplyModal(false); setApplyDone(false); setApplyError(""); }}
                className="text-gray-600 text-2xl hover:text-gray-600 leading-none">✕</button>
            </div>

            {/* スクロール可能なコンテンツ */}
            <div className="overflow-y-auto flex-1">
            <div className="px-5 py-4 space-y-4 pb-10 sm:px-8 sm:py-6">
              {/* 現在のステータス */}
              {sub && (
                <div className={`rounded-2xl border-2 p-4 ${cardBg} ${cardBorder}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-700">現在のプラン</p>
                      <p className="font-bold text-gray-800">{sub.planName}</p>
                      <p className="text-sm font-bold text-gray-600 mt-0.5">¥{sub.monthlyFee.toLocaleString()}/月</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`rounded-full text-xs font-bold px-2.5 py-0.5 ${lvStyle.badge}`}>Lv{lv}</span>
                      <span className={`rounded-full text-xs font-semibold px-2.5 py-1 ${statusBadge}`}>{statusLabel}</span>
                    </div>
                  </div>
                  {sub.confirmedAt && (
                    <p className="text-xs text-gray-600 mt-2">確定日: {new Date(sub.confirmedAt).toLocaleDateString("ja-JP")}</p>
                  )}
                </div>
              )}

              {/* 料金体系 */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold text-gray-700 mb-3">💴 料金体系</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-violet-50 p-3">
                    <p className="text-[10px] font-bold text-violet-700 mb-2">🌸 先着50名まで</p>
                    <div className="space-y-1">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="flex justify-between text-xs">
                          <span className="text-violet-700 font-semibold">Lv{l}</span>
                          <span className="font-bold text-gray-800">¥{TRAVEL_FEES.early[l].toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3">
                    <p className="text-[10px] font-bold text-blue-700 mb-2">📌 51名以降</p>
                    <div className="space-y-1">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="flex justify-between text-xs">
                          <span className="text-blue-700 font-semibold">Lv{l}</span>
                          <span className="font-bold text-gray-800">¥{TRAVEL_FEES.standard[l].toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 支払い情報 */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-bold text-amber-800 mb-2">💳 お支払い情報</p>
                <div className="space-y-1.5 text-xs text-amber-700">
                  <div className="flex items-start gap-2">
                    <span>📅</span>
                    <span>支払日：毎月<strong>15日</strong>（翌月分の前払い）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>🏦</span>
                    <span>お支払い方法：<strong>銀行振込のみ</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>振込期限を過ぎた場合、ステータスが「支払い待ち」になります</span>
                  </div>
                </div>
              </div>

              {/* 申込フォーム（未登録の場合） */}
              {!sub && !applyDone && (
                <div className="rounded-2xl bg-white border border-gray-200 p-4">
                  <p className="text-sm font-bold text-gray-800 mb-3">📝 旅行サブスクに申し込む</p>
                  <form onSubmit={handleApply} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">会員ID（任意）</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="例: M0001"
                        value={applyForm.memberCode}
                        onChange={e => setApplyForm({ ...applyForm, memberCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">氏名<span className="text-red-500 ml-1">*</span></label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="山田 太郎"
                        value={applyForm.name}
                        onChange={e => setApplyForm({ ...applyForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">電話番号<span className="text-red-500 ml-1">*</span></label>
                      <input
                        required
                        type="tel"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="090-1234-5678"
                        value={applyForm.phone}
                        onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">メールアドレス<span className="text-red-500 ml-1">*</span></label>
                      <input
                        required
                        type="email"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="example@email.com"
                        value={applyForm.email}
                        onChange={e => setApplyForm({ ...applyForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">現在の自身のレベル<span className="text-red-500 ml-1">*</span></label>
                      <p className="text-[10px] text-gray-700 mb-2">自身の現在実績レベルを選択してください</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1,2,3,4,5].map(l => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setApplyForm({ ...applyForm, level: l })}
                            className={`rounded-xl border-2 py-2 text-center transition-all ${
                              applyForm.level === l
                                ? "border-violet-500 bg-violet-500 text-white"
                                : "border-gray-200 bg-white text-gray-700 hover:border-violet-300"
                            }`}
                          >
                            <div className="text-xs font-bold">Lv{l}</div>
                            <div className="text-[9px] mt-0.5">
                              ¥{TRAVEL_FEES.early[l].toLocaleString()}
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1">※先着50名料金表示。実際の料金は担当者よりご案内します。</p>
                    </div>

                    {/* 選択プレビュー */}
                    <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 flex justify-between items-center">
                      <span className="text-xs text-violet-700">現在レベル: Lv{applyForm.level}</span>
                      <span className="font-bold text-violet-800">¥{TRAVEL_FEES.early[applyForm.level].toLocaleString()}/月〜</span>
                    </div>

                    {applyError && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{applyError}</p>
                    )}

                    <button type="submit" disabled={applying}
                      className="w-full rounded-xl bg-violet-600 text-white py-3 text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
                      {applying ? "申込中..." : "✈️ 旅行サブスクに申し込む"}
                    </button>
                  </form>
                </div>
              )}

              {/* 申込完了 */}
              {applyDone && (
                <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-5 text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-bold text-emerald-800 text-sm">申し込みを受け付けました！</p>
                  <p className="text-xs text-emerald-600 mt-1">担当者より銀行振込先などのご案内をお送りします。</p>
                  <button
                    onClick={() => { setShowApplyModal(false); setApplyDone(false); }}
                    className="mt-3 rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-semibold hover:bg-emerald-700 transition">
                    閉じる
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

// ────────── MLM会員状況ボタン ──────────
function MlmStatusButton({ status }: { status: string | null }) {
  const statusConfig: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
    active: { 
      label: "アクティブ", 
      emoji: "😊", 
      color: "text-green-700", 
      bgColor: "bg-green-50 border-green-300" 
    },
    inactive: { 
      label: "非アクティブ", 
      emoji: "😴", 
      color: "text-gray-700", 
      bgColor: "bg-gray-50 border-gray-300" 
    },
    pending: { 
      label: "支払い待ち", 
      emoji: "⏳", 
      color: "text-yellow-700", 
      bgColor: "bg-yellow-50 border-yellow-300" 
    },
    suspended: { 
      label: "活動停止", 
      emoji: "⚠️", 
      color: "text-orange-700", 
      bgColor: "bg-orange-50 border-orange-300" 
    },
    canceled: { 
      label: "退会", 
      emoji: "❌", 
      color: "text-red-700", 
      bgColor: "bg-red-50 border-red-300" 
    },
  };

  if (!status) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow border-2 border-gray-200">
        <div className="flex items-center gap-3">
          <div className="text-3xl">👤</div>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 mb-0.5">MLM会員状況</p>
            <p className="text-sm font-bold text-gray-800">未登録</p>
          </div>
          <Link href="/mlm/register"
            className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition">
            登録する
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[status] ?? statusConfig.inactive;

  return (
    <Link href="/mlm/my-status"
      className={`block rounded-2xl p-4 shadow border-2 ${config.bgColor} hover:shadow-md transition active:scale-98`}>
      <div className="flex items-center gap-3">
        <div className="text-3xl">{config.emoji}</div>
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 mb-0.5">MLM会員状況</p>
          <p className={`text-base font-bold ${config.color}`}>{config.label}</p>
        </div>
        <div className="text-gray-400 text-xl">→</div>
      </div>
    </Link>
  );
}

// ──────────── メインダッシュボード ────────────
export default function MemberDashboard({
  user, mlmStatus, announcements, menus
}: {
  user: User;
  mlmStatus: string | null;
  announcements: Announcement[];
  menus: Menu[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [unreadCount, setUnreadCount] = useState(announcements.length);
  const [avatar, setAvatar] = useState("😊");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const slideRef = useRef(0);
  const [dashboardPoints, setDashboardPoints] = useState<DashboardPoints>({
    mlmLastMonthPoints: 0,
    mlmCurrentMonthPoints: 0,
    savingsBonusPoints: 0,
    mobileReferralPoints: 0
  });

  const travelSubRef = useRef<{ openModal: () => void }>(null);

  // ダッシュボードポイント情報取得
  useEffect(() => {
    fetch("/api/my/dashboard-points")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setDashboardPoints(data);
        }
      })
      .catch(err => console.error('ポイント取得エラー:', err));
  }, []);

  // アバター読み込み（DB画像 > localStorage絵文字）
  useEffect(() => {
    fetch("/api/my/avatar")
      .then(r => r.json())
      .then(d => {
        if (d.avatarUrl) {
          setProfileAvatarUrl(d.avatarUrl);
          localStorage.setItem("profileAvatarUrl", d.avatarUrl);
        } else {
          setProfileAvatarUrl(null);
          const saved = localStorage.getItem("userAvatar");
          if (saved) setAvatar(saved);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem("userAvatar");
        if (saved) setAvatar(saved);
        const url = localStorage.getItem("profileAvatarUrl");
        if (url) setProfileAvatarUrl(url);
      });

    const onAvatarUpdated = () => {
      const url = localStorage.getItem("profileAvatarUrl");
      setProfileAvatarUrl(url ?? null);
    };
    window.addEventListener("avatarUpdated", onAvatarUpdated);
    return () => window.removeEventListener("avatarUpdated", onAvatarUpdated);
  }, []);

  // スライダー自動切替
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      slideRef.current = (slideRef.current + 1) % announcements.length;
      setSlide(slideRef.current);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  // 未読カウント管理
  useEffect(() => {
    const check = () => {
      const stored = localStorage.getItem("readAnnouncements");
      const read: string[] = stored ? JSON.parse(stored) : [];
      const unread = announcements.filter(a => !read.includes(a.id));
      setUnreadCount(unread.length);
    };
    check();
    window.addEventListener("announcementsRead", check);
    return () => window.removeEventListener("announcementsRead", check);
  }, [announcements]);

  const activeAnn = announcements[slide];
  const slideBg = SLIDE_BG[slide % SLIDE_BG.length];
  const maxPt = 100000;
  const barPct = Math.min((user.availablePoints / maxPt) * 100, 100);

  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-28 relative">

      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>V</div>
          <span className="font-bold text-green-800 text-sm">VIOLA Pure</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/announcements" className="relative text-gray-700 text-xl">
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="text-gray-700 text-2xl p-1">☰</button>
        </div>
      </header>

      {/* ドロワーメニュー */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <span className="font-bold text-green-800">メニュー</span>
              <button onClick={() => setMenuOpen(false)} className="text-gray-600 text-xl">✕</button>
            </div>
            <nav className="flex flex-col gap-1 flex-1 px-3 py-3 overflow-y-auto">
              {[
                { href: "/dashboard",       label: "🏠 ホーム" },
                { href: "#menu",            label: "📋 福利厚生メニュー" },
                { href: "/vp-phone",        label: "📱 VP未来phone申し込み" },
                { href: "/points/check",    label: "⭐ ポイント確認" },
                { href: "/points/use",      label: "💎 ポイントを使う" },
                { href: "/points/history",  label: "📊 ポイント履歴" },
                { href: "/announcements",   label: "🔔 お知らせ" },
                { href: "/orders/history",  label: "📦 福利厚生使用履歴" },
                { href: "/profile",         label: "👤 マイアカウント" },
                { href: "/referral",            label: "🎁 友達を紹介する" },
                { href: "/org-chart",           label: "🌳 直紹介 組織図" },
                { href: "/mlm-org-chart",       label: "🌲 MLMマトリックス組織図" },
                { href: "/mlm-bonus",           label: "💎 MLMボーナス履歴" },
                { href: "/travel-referrals",    label: "✈️ 旅行サブスク紹介ツリー" },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-gray-800 hover:bg-green-50 transition">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-6">
              <button onClick={async () => { const { signOut } = await import("next-auth/react"); signOut({ callbackUrl: "/login" }); }} className="w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition text-left">
                🚪 ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">

        {/* ウェルカムカード */}
        <div className="rounded-2xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl hover:bg-white/30 transition overflow-hidden">
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="アバター" className="w-full h-full object-cover rounded-full" />
              ) : avatar}
            </button>
            <div>
              <p className="text-sm font-medium opacity-90">こんにちは 👋</p>
              <p className="text-xl font-bold">{user.name} さん</p>
              <p className="text-xs opacity-80">会員コード：{user.memberCode}</p>
            </div>
          </div>
          {showAvatarPicker && (
            <div className="bg-white/20 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">アイコンを選択</p>
                <Link href="/profile#avatar"
                  className="text-[10px] bg-white/30 rounded-lg px-2 py-1 font-semibold hover:bg-white/40 transition"
                  onClick={() => setShowAvatarPicker(false)}>
                  📷 写真に変更 →
                </Link>
              </div>
              {profileAvatarUrl && (
                <p className="text-[10px] opacity-80 mb-2">📸 プロフィール写真が設定されています</p>
              )}
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map(em => (
                  <button key={em} onClick={() => {
                    setAvatar(em);
                    setProfileAvatarUrl(null);
                    localStorage.setItem("userAvatar", em);
                    localStorage.removeItem("profileAvatarUrl");
                    setShowAvatarPicker(false);
                  }} className="text-2xl hover:scale-125 transition">
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white/20 rounded-xl px-4 py-3 space-y-3">
            {/* MLM先月ポイント */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium opacity-90">MLM先月ポイント</span>
                <span className="text-sm font-bold">
                  {dashboardPoints.mlmLastMonthPoints.toLocaleString()}
                  <span className="text-[10px] ml-1 font-normal opacity-80">VPpt</span>
                </span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((dashboardPoints.mlmLastMonthPoints / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* MLM今月ポイント */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium opacity-90">MLM今月ポイント</span>
                <span className="text-sm font-bold">
                  {dashboardPoints.mlmCurrentMonthPoints.toLocaleString()}
                  <span className="text-[10px] ml-1 font-normal opacity-80">VPpt</span>
                </span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pink-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((dashboardPoints.mlmCurrentMonthPoints / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 貯金ボーナスポイント */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium opacity-90">貯金ボーナスポイント</span>
                <span className="text-sm font-bold">
                  {dashboardPoints.savingsBonusPoints.toLocaleString()}
                  <span className="text-[10px] ml-1 font-normal opacity-80">SAVpt</span>
                </span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((dashboardPoints.savingsBonusPoints / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 携帯紹介ポイント */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium opacity-90">携帯紹介ポイント</span>
                <span className="text-sm font-bold">
                  {dashboardPoints.mobileReferralPoints.toLocaleString()}
                  <span className="text-[10px] ml-1 font-normal opacity-80">MPIpt</span>
                </span>
              </div>
              <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((dashboardPoints.mobileReferralPoints / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* MLM会員状況ボタン */}
        <MlmStatusButton status={mlmStatus} />

        {/* お知らせスライダー */}
        <section id="news">
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📢 お知らせ一覧</h2>
          {announcements.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center text-gray-600 text-sm shadow font-medium">
              現在お知らせはありません
            </div>
          ) : (
            <>
              <Link href="/announcements" className="block rounded-2xl shadow overflow-hidden mb-3"
                style={{ background: slideBg }}>
                <div className="p-5 text-white min-h-[110px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TAG_STYLE[activeAnn?.tag] ?? "bg-white/30 text-white"}`}>
                      {TAG_LABEL[activeAnn?.tag] ?? "お知らせ"}
                    </span>
                    <span className="text-xs opacity-80">
                      {activeAnn?.publishedAt ? new Date(activeAnn.publishedAt).toLocaleDateString("ja-JP") : ""}
                    </span>
                  </div>
                  <p className="font-bold text-base">{activeAnn?.title}</p>
                  <p className="text-xs opacity-90 mt-1 line-clamp-2">{activeAnn?.content}</p>
                </div>
                {announcements.length > 1 && (
                  <div className="flex justify-center gap-1.5 pb-3">
                    {announcements.map((_, i) => (
                      <button key={i} onClick={e => { e.preventDefault(); slideRef.current = i; setSlide(i); }}
                        className={`h-2 rounded-full transition-all duration-300 ${i === slide ? "bg-white w-6" : "bg-white/50 w-2"}`} />
                    ))}
                  </div>
                )}
              </Link>
            </>
          )}
        </section>

        {/* VP未来phone申し込みボタン（モーダル付き） */}
        <VpPhoneButton />

        {/* 旅行サブスクボタン（申込モーダル付き） */}
        <TravelSubButton ref={travelSubRef} />

        {/* 福利厚生メニュー */}
        <section id="menu">
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">🛎️ 福利厚生メニュー</h2>
          <div className="grid grid-cols-3 gap-3">
            {menus.map(m => {
              const emoji = ICON_MAP[m.iconType ?? ""] ?? "📌";
              // contact種別は相談ページへ
              if (m.menuType === "contact") {
                return (
                  <a key={m.id} href="/contact"
                    className="bg-white rounded-2xl p-3 text-center shadow hover:shadow-md transition active:scale-95">
                    <div className="text-3xl mb-1">{emoji}</div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                    {m.subtitle && <p className="text-[10px] font-medium text-gray-600 mt-0.5">{m.subtitle}</p>}
                  </a>
                );
              }
              // 旅行サブスク種別 → モーダルを開く（新しいタブではなく）
              if (m.menuType === "travel_sub" || m.title.includes("旅行")) {
                return (
                  <button key={m.id}
                    onClick={() => travelSubRef.current?.openModal()}
                    className="bg-white rounded-2xl p-3 text-center shadow hover:shadow-md transition active:scale-95 w-full">
                    <div className="text-3xl mb-1">{emoji}</div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                    {m.subtitle && <p className="text-[10px] font-medium text-gray-600 mt-0.5">{m.subtitle}</p>}
                  </button>
                );
              }
              // URLリンク（内部パスはそのまま遷移、外部URLは新タブ）
              const href = m.linkUrl ?? "#";
              const isInternal = href.startsWith("/");
              return (
                <a key={m.id}
                  href={href}
                  target={isInternal ? undefined : "_blank"}
                  rel={isInternal ? undefined : "noopener noreferrer"}
                  className="bg-white rounded-2xl p-3 text-center shadow hover:shadow-md transition active:scale-95">
                  <div className="text-3xl mb-1">{emoji}</div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">{m.title}</p>
                  {m.subtitle && <p className="text-[10px] font-medium text-gray-600 mt-0.5">{m.subtitle}</p>}
                </a>
              );
            })}
          </div>
        </section>

        {/* クイックアクセス */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">📌 クイックアクセス</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/orders/history",  icon: "📦", label: "福利厚生使用履歴" },
              { href: "/points/history", icon: "📊", label: "ポイント履歴" },
              { href: "/profile",        icon: "👤", label: "マイアカウント" },
              { href: "/referral",       icon: "🎁", label: "友達を紹介する" },
              { href: "/org-chart",          icon: "🌳", label: "直紹介 組織図" },
              { href: "/mlm-org-chart",      icon: "🌲", label: "MLM組織図" },
              { href: "/mlm-bonus",          icon: "💎", label: "MLMボーナス" },
              { href: "/travel-referrals",     icon: "✈️", label: "旅行サブスク紹介ツリー" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="bg-white rounded-2xl p-4 shadow text-center hover:shadow-md transition active:scale-95">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs font-bold text-gray-800">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-md mx-auto flex items-end justify-around px-2 py-1">
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-semibold text-gray-600">ホーム</span>
          </Link>
          <Link href="#menu" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">📋</span>
            <span className="text-[10px] font-semibold text-gray-600">メニュー</span>
          </Link>
          <Link href="/points/use" className="flex flex-col items-center -mt-5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl text-2xl border-4 border-white"
              style={{ background: "linear-gradient(135deg, #16a34a, #4ade80)" }}>💎</div>
            <span className="text-[10px] font-semibold text-gray-600 mt-1">ポイント</span>
          </Link>
          <Link href="/announcements" className="flex flex-col items-center gap-0.5 py-2 px-3 relative">
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <span className="text-[10px] font-semibold text-gray-600">お知らせ</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-0.5 py-2 px-3">
            <span className="text-xl">👤</span>
            <span className="text-[10px] font-semibold text-gray-600">マイページ</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
