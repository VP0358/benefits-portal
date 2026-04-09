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
  important: "bg-red-600 text-white",
  campaign:  "bg-[#e8893a] text-white",
  new:       "bg-[#d4a853] text-[#071228]",
  notice:    "bg-[#0f2347] text-[#d4a853] border border-[#d4a853]/40",
};
const TAG_LABEL: Record<string,string> = {
  important:"重要", campaign:"キャンペーン", new:"新機能", notice:"お知らせ"
};
const SLIDE_BG = [
  "linear-gradient(135deg, #0c1a35, #1a3a6e)",
  "linear-gradient(135deg, #1a0c28, #3d1a5e)",
  "linear-gradient(135deg, #2b1200, #5c2d00)",
  "linear-gradient(135deg, #0c2212, #1a4a2a)",
  "linear-gradient(135deg, #0c1a35, #0c3055)",
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

// ── 共通スタイル定数 ──
const CARD_BG   = "#0f2347";
const CARD_BG2  = "#132a54";
const PAGE_BG   = "#071228";
const GOLD      = "#d4a853";
const GOLD_LIGHT= "#f0c060";
const ORANGE    = "#e8893a";

// ────────── VpPhoneButton（ダッシュボード用） ──────────
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

  type SInfo = { label: string; dot: string };
  const STATUS_INFO: Record<string, SInfo> = {
    pending:    { label: "審査待ち",  dot: "bg-[#e8893a]" },
    reviewing:  { label: "審査中",    dot: "bg-blue-400" },
    contracted: { label: "契約済み",  dot: "bg-emerald-400" },
    rejected:   { label: "審査不可",  dot: "bg-red-400" },
    canceled:   { label: "取消済み",  dot: "bg-white/30" },
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-4 flex items-center gap-3 border"
        style={{ background: CARD_BG, borderColor: "rgba(212,168,83,0.15)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: "rgba(212,168,83,0.1)" }}>📱</div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>VP未来phone</p>
          <p className="text-xs mt-0.5 animate-pulse" style={{ color: "rgba(212,168,83,0.5)" }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!appData) {
    return (
      <Link href="/vp-phone"
        className="block rounded-2xl p-4 transition flex items-center justify-between border"
        style={{ background: CARD_BG, borderColor: "rgba(212,168,83,0.2)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg, #1a6e3a, #2a9e5a)" }}>📱</div>
          <div>
            <p className="font-bold text-sm text-white">VP未来phone</p>
            <p className="text-[11px] mt-0.5" style={{ color: GOLD }}>お得なスマートフォン回線</p>
          </div>
        </div>
        <span className="rounded-full px-3 py-1 text-xs font-bold border"
          style={{ background: "rgba(232,137,58,0.15)", color: ORANGE, borderColor: `${ORANGE}40` }}>
          未申込
        </span>
      </Link>
    );
  }

  const info = STATUS_INFO[appData.status] ?? STATUS_INFO.pending;
  const contractTypeLabel = appData.contractType === "voice" ? "音声回線" : appData.contractType === "data" ? "データ回線" : "";
  const hasActiveApp = !["rejected", "canceled"].includes(appData.status);
  const cardTitle = hasActiveApp ? "申し込み内容変更" : "VP未来phone 再申し込み";

  return (
    <Link href="/vp-phone"
      className="block rounded-2xl p-4 transition border"
      style={{ background: CARD_BG, borderColor: "rgba(212,168,83,0.2)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "linear-gradient(135deg, #1a6e3a, #2a9e5a)" }}>📱</div>
          <div>
            <p className="font-bold text-sm text-white">{cardTitle}</p>
            {contractTypeLabel && (
              <p className="text-[11px] mt-0.5" style={{ color: GOLD }}>{contractTypeLabel}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
            <span className={`w-2 h-2 rounded-full ${info.dot}`}></span>
            {info.label}
          </span>
          <span className="text-xs" style={{ color: `${GOLD}80` }}>確認する →</span>
        </div>
      </div>
      {appData.status === "contracted" && (
        <div className="mt-2 rounded-xl px-3 py-2 text-xs font-semibold border"
          style={{ background: "rgba(16,185,129,0.1)", color: "#34d399", borderColor: "rgba(52,211,153,0.2)" }}>
          ✓ 契約完了済み
        </div>
      )}
      {(appData.status === "pending" || appData.status === "reviewing") && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: "rgba(212,168,83,0.5)" }}>
            <span>申込完了</span><span>審査中</span><span>契約完了</span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className={`h-1.5 rounded-full transition-all`}
              style={{
                width: appData.status === "reviewing" ? "66%" : "33%",
                background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`
              }} />
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

  const LV_STYLE: Record<number, { badge: string }> = {
    1: { badge: "" },
    2: { badge: "" },
    3: { badge: "" },
    4: { badge: "" },
    5: { badge: "" },
  };

  const FORCE_STYLE: Record<string, { label: string; dot: string }> = {
    forced_active:   { label: "✨ 特別アクティブ", dot: "bg-cyan-400" },
    forced_inactive: { label: "⏸ 一時停止中",    dot: "bg-orange-400" },
  };

  const DISPLAY_STATUS_DOT: Record<string, { label: string; dot: string }> = {
    active:   { label: "アクティブ",   dot: "bg-emerald-400" },
    inactive: { label: "非アクティブ", dot: "bg-white/30" },
    none:     { label: "未登録",       dot: "bg-white/20" },
    pending:  { label: "申込中",       dot: "bg-[#e8893a]" },
    canceled: { label: "退会済み",     dot: "bg-red-400" },
    suspended:{ label: "支払い待ち",   dot: "bg-[#e8893a]" },
  };

  if (!travelSub) {
    return (
      <div className="rounded-2xl p-4 border flex items-center gap-3"
        style={{ background: CARD_BG, borderColor: "rgba(212,168,83,0.15)" }}>
        <span className="text-2xl">✈️</span>
        <div className="flex-1">
          <p className="font-bold text-sm text-white">旅行サブスク</p>
          <p className="text-xs mt-0.5 animate-pulse" style={{ color: `${GOLD}80` }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  const { displayStatus, sub } = travelSub;
  const lv = sub?.level ?? 1;
  const forceStyle = sub?.forceStatus && sub.forceStatus !== "none"
    ? FORCE_STYLE[sub.forceStatus]
    : null;

  let statusDot = "bg-white/20";
  let statusLabel = "未登録";
  if (forceStyle) {
    statusDot = forceStyle.dot;
    statusLabel = forceStyle.label;
  } else if (sub) {
    const ds = DISPLAY_STATUS_DOT[sub.status] ?? DISPLAY_STATUS_DOT[displayStatus];
    statusDot = ds.dot;
    statusLabel = ds.label;
  }

  return (
    <>
      <button type="button"
        onClick={() => setShowApplyModal(true)}
        className="w-full text-left rounded-2xl p-4 transition border"
        style={{ background: CARD_BG, borderColor: "rgba(212,168,83,0.2)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "linear-gradient(135deg, #3d1a5e, #6a2e9e)" }}>✈️</div>
            <div>
              <p className="font-bold text-sm text-white">旅行サブスク</p>
              {sub ? (
                <p className="text-[11px] mt-0.5" style={{ color: GOLD }}>{sub.planName} · ¥{sub.monthlyFee.toLocaleString()}/月</p>
              ) : (
                <p className="text-[11px] mt-0.5" style={{ color: GOLD }}>タップして詳細・申込</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {sub && (
              <span className="rounded-full text-xs font-bold px-2.5 py-0.5 border"
                style={{ background: `${GOLD}20`, color: GOLD, borderColor: `${GOLD}40` }}>
                Lv{lv}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-white/60">
              <span className={`w-2 h-2 rounded-full ${statusDot}`}></span>
              {statusLabel}
            </span>
          </div>
        </div>
      </button>

      {/* 旅行サブスク詳細・申込モーダル */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
          onClick={() => { setShowApplyModal(false); setApplyDone(false); setApplyError(""); }}>
          <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl flex flex-col border"
            style={{ background: "#0a1b35", borderColor: `${GOLD}30`, maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: `${GOLD}20` }}>
              <div className="flex items-center gap-2">
                <span className="text-xl">✈️</span>
                <h2 className="font-bold text-white text-sm">旅行サブスク</h2>
              </div>
              <button onClick={() => { setShowApplyModal(false); setApplyDone(false); setApplyError(""); }}
                className="text-white/50 text-2xl hover:text-white leading-none transition">✕</button>
            </div>

            <div className="overflow-y-auto flex-1">
            <div className="px-5 py-4 space-y-4 pb-10 sm:px-8 sm:py-6">
              {sub && (
                <div className="rounded-2xl border p-4"
                  style={{ background: CARD_BG, borderColor: `${GOLD}25` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: `${GOLD}80` }}>現在のプラン</p>
                      <p className="font-bold text-white">{sub.planName}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: GOLD }}>¥{sub.monthlyFee.toLocaleString()}/月</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="rounded-full text-xs font-bold px-2.5 py-0.5 border"
                        style={{ background: `${GOLD}20`, color: GOLD, borderColor: `${GOLD}40` }}>Lv{lv}</span>
                      <span className="flex items-center gap-1.5 text-xs text-white/60">
                        <span className={`w-2 h-2 rounded-full ${statusDot}`}></span>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                  {sub.confirmedAt && (
                    <p className="text-xs mt-2" style={{ color: `${GOLD}60` }}>確定日: {new Date(sub.confirmedAt).toLocaleDateString("ja-JP")}</p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border p-4" style={{ background: CARD_BG, borderColor: `${GOLD}20` }}>
                <p className="text-xs font-bold mb-3" style={{ color: GOLD }}>料金体系</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border p-3"
                    style={{ background: `${GOLD}10`, borderColor: `${GOLD}25` }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: GOLD }}>🌸 先着50名まで</p>
                    <div className="space-y-1">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="flex justify-between text-xs">
                          <span className="font-semibold" style={{ color: GOLD }}>Lv{l}</span>
                          <span className="font-bold text-white">¥{TRAVEL_FEES.early[l].toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border p-3"
                    style={{ background: "rgba(30,60,120,0.3)", borderColor: "rgba(100,140,240,0.2)" }}>
                    <p className="text-[10px] font-bold mb-2 text-blue-300">📌 51名以降</p>
                    <div className="space-y-1">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="flex justify-between text-xs">
                          <span className="font-semibold text-blue-300">Lv{l}</span>
                          <span className="font-bold text-white">¥{TRAVEL_FEES.standard[l].toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-4"
                style={{ background: `${ORANGE}12`, borderColor: `${ORANGE}30` }}>
                <p className="text-xs font-bold mb-2" style={{ color: ORANGE }}>💳 お支払い情報</p>
                <div className="space-y-1.5 text-xs" style={{ color: `${ORANGE}CC` }}>
                  <div className="flex items-start gap-2">
                    <span>📅</span>
                    <span>支払日：毎月<strong className="text-white">15日</strong>（翌月分の前払い）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>🏦</span>
                    <span>お支払い方法：<strong className="text-white">銀行振込のみ</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>振込期限を過ぎた場合、ステータスが「支払い待ち」になります</span>
                  </div>
                </div>
              </div>

              {!sub && !applyDone && (
                <div className="rounded-2xl border p-4"
                  style={{ background: CARD_BG, borderColor: `${GOLD}20` }}>
                  <p className="text-sm font-bold mb-3 text-white">📝 旅行サブスクに申し込む</p>
                  <form onSubmit={handleApply} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: `${GOLD}80` }}>会員ID（任意）</label>
                      <input
                        type="text"
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none border"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: `${GOLD}25` }}
                        placeholder="例: M0001"
                        value={applyForm.memberCode}
                        onChange={e => setApplyForm({ ...applyForm, memberCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: `${GOLD}80` }}>氏名<span className="text-red-400 ml-1">*</span></label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none border"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: `${GOLD}25` }}
                        placeholder="山田 太郎"
                        value={applyForm.name}
                        onChange={e => setApplyForm({ ...applyForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: `${GOLD}80` }}>電話番号<span className="text-red-400 ml-1">*</span></label>
                      <input
                        required
                        type="tel"
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none border"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: `${GOLD}25` }}
                        placeholder="090-1234-5678"
                        value={applyForm.phone}
                        onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: `${GOLD}80` }}>メールアドレス<span className="text-red-400 ml-1">*</span></label>
                      <input
                        required
                        type="email"
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none border"
                        style={{ background: "rgba(255,255,255,0.06)", borderColor: `${GOLD}25` }}
                        placeholder="example@email.com"
                        value={applyForm.email}
                        onChange={e => setApplyForm({ ...applyForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: `${GOLD}80` }}>現在の自身のレベル<span className="text-red-400 ml-1">*</span></label>
                      <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>自身の現在実績レベルを選択してください</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1,2,3,4,5].map(l => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setApplyForm({ ...applyForm, level: l })}
                            className="rounded-xl border-2 py-2 text-center transition-all"
                            style={applyForm.level === l
                              ? { borderColor: GOLD, background: `${GOLD}20`, color: "white" }
                              : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }
                            }
                          >
                            <div className="text-xs font-bold">Lv{l}</div>
                            <div className="text-[9px] mt-0.5">
                              ¥{TRAVEL_FEES.early[l].toLocaleString()}
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>※先着50名料金表示。実際の料金は担当者よりご案内します。</p>
                    </div>

                    <div className="rounded-xl border px-4 py-3 flex justify-between items-center"
                      style={{ background: `${GOLD}10`, borderColor: `${GOLD}30` }}>
                      <span className="text-xs" style={{ color: GOLD }}>現在レベル: Lv{applyForm.level}</span>
                      <span className="font-bold" style={{ color: GOLD_LIGHT }}>¥{TRAVEL_FEES.early[applyForm.level].toLocaleString()}/月〜</span>
                    </div>

                    {applyError && (
                      <p className="text-xs text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">{applyError}</p>
                    )}

                    <button type="submit" disabled={applying}
                      className="w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-50 text-white"
                      style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}>
                      {applying ? "申込中..." : "✈️ 旅行サブスクに申し込む"}
                    </button>
                  </form>
                </div>
              )}

              {applyDone && (
                <div className="rounded-2xl border p-5 text-center"
                  style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(52,211,153,0.2)" }}>
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-bold text-emerald-300 text-sm">申し込みを受け付けました！</p>
                  <p className="text-xs text-emerald-400/80 mt-1">担当者より銀行振込先などのご案内をお送りします。</p>
                  <button
                    onClick={() => { setShowApplyModal(false); setApplyDone(false); }}
                    className="mt-3 rounded-xl px-5 py-2 text-sm font-semibold text-white transition"
                    style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
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
  type StatusCfg = { label: string; dotColor: string; textColor: string; borderColor: string; bgColor: string };
  const statusConfig: Record<string, StatusCfg> = {
    active:    { label: "アクティブ",   dotColor: "#34d399", textColor: "#34d399",  borderColor: "rgba(52,211,153,0.25)",  bgColor: "rgba(16,185,129,0.1)" },
    inactive:  { label: "非アクティブ", dotColor: "#9ca3af", textColor: "#d1d5db",  borderColor: "rgba(156,163,175,0.2)",  bgColor: "rgba(75,85,99,0.1)" },
    pending:   { label: "支払い待ち",   dotColor: ORANGE,    textColor: ORANGE,     borderColor: `${ORANGE}40`,            bgColor: `${ORANGE}12` },
    suspended: { label: "活動停止",     dotColor: "#f97316", textColor: "#f97316",  borderColor: "rgba(249,115,22,0.25)",  bgColor: "rgba(249,115,22,0.1)" },
    canceled:  { label: "退会",         dotColor: "#f87171", textColor: "#f87171",  borderColor: "rgba(248,113,113,0.25)", bgColor: "rgba(239,68,68,0.1)" },
  };

  if (!status) {
    return (
      <div className="rounded-2xl p-4 border flex items-center justify-between"
        style={{ background: CARD_BG, borderColor: `${GOLD}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(255,255,255,0.07)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: `${GOLD}70` }}>MLM会員状況</p>
            <p className="text-sm font-bold text-white">未登録</p>
          </div>
        </div>
        <Link href="/mlm/register"
          className="px-4 py-2 text-xs font-bold rounded-lg transition text-white"
          style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}>
          登録する
        </Link>
      </div>
    );
  }

  const config = statusConfig[status] ?? statusConfig.inactive;

  return (
    <Link href="/mlm-status"
      className="block rounded-2xl p-4 border transition"
      style={{ background: config.bgColor, borderColor: config.borderColor }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: config.textColor }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: `${GOLD}70` }}>MLM会員状況</p>
            <p className="text-base font-bold" style={{ color: config.textColor }}>{config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.dotColor }}></span>
          <span className="text-white/40 text-xl">›</span>
        </div>
      </div>
    </Link>
  );
}

// ────────── 携帯契約状況ボタン ──────────
function VpPhoneStatusButton({ status }: { status: string | null }) {
  type StatusCfg = { label: string; dotColor: string; textColor: string };
  const statusConfig: Record<string, StatusCfg> = {
    contracted: { label: "契約中",     dotColor: "#34d399", textColor: "#34d399" },
    pending:    { label: "支払い待ち", dotColor: ORANGE,    textColor: ORANGE },
    reviewing:  { label: "審査中",    dotColor: "#60a5fa", textColor: "#93c5fd" },
  };

  if (!status || status === 'canceled' || status === 'rejected') {
    return (
      <div className="rounded-2xl p-4 border flex items-center justify-between"
        style={{ background: CARD_BG, borderColor: `${GOLD}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.07)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: `${GOLD}70` }}>携帯契約状況</p>
            <p className="text-sm font-bold text-white">未契約</p>
          </div>
        </div>
        <Link href="/vp-phone"
          className="px-4 py-2 text-xs font-bold rounded-lg transition text-white"
          style={{ background: "linear-gradient(135deg, #1e4d9e, #2563eb)" }}>
          申し込む
        </Link>
      </div>
    );
  }

  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <Link href="/vp-phone"
      className="block rounded-2xl p-4 border transition"
      style={{ background: CARD_BG, borderColor: `${GOLD}20` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1e4d9e, #2563eb)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: `${GOLD}70` }}>携帯契約状況</p>
            <p className="text-base font-bold" style={{ color: config.textColor }}>{config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.dotColor }}></span>
          <span className="text-white/40 text-xl">›</span>
        </div>
      </div>
    </Link>
  );
}

// ────────── 旅行サブスク状況ボタン ──────────
function TravelSubStatusButton({ status }: { status: string | null }) {
  type StatusCfg = { label: string; dotColor: string; textColor: string };
  const statusConfig: Record<string, StatusCfg> = {
    active:  { label: "契約中",     dotColor: "#34d399", textColor: "#34d399" },
    pending: { label: "支払い待ち", dotColor: ORANGE,    textColor: ORANGE },
  };

  if (!status || status === 'canceled') {
    return (
      <div className="rounded-2xl p-4 border flex items-center justify-between"
        style={{ background: CARD_BG, borderColor: `${GOLD}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.07)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: `${GOLD}70` }}>旅行サブスク</p>
            <p className="text-sm font-bold text-white">未契約</p>
          </div>
        </div>
        <button
          className="px-4 py-2 text-xs font-bold rounded-lg transition text-white"
          style={{ background: "linear-gradient(135deg, #3d1a5e, #6a2e9e)" }}>
          申し込む
        </button>
      </div>
    );
  }

  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <div className="rounded-2xl p-4 border" style={{ background: CARD_BG, borderColor: `${GOLD}20` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3d1a5e, #6a2e9e)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: `${GOLD}70` }}>旅行サブスク</p>
            <p className="text-base font-bold" style={{ color: config.textColor }}>{config.label}</p>
          </div>
        </div>
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.dotColor }}></span>
      </div>
    </div>
  );
}

// ── セクションヘッダー ──
function SectionHeader({ label, accentColor }: { label: string; accentColor: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 rounded-full" style={{ background: accentColor }}></div>
      <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>{label}</h2>
    </div>
  );
}

// ──────────── メインダッシュボード ────────────
export default function MemberDashboard({
  user, mlmStatus, vpPhoneStatus, travelSubStatus, announcements, menus
}: {
  user: User;
  mlmStatus: string | null;
  vpPhoneStatus: string | null;
  travelSubStatus: string | null;
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

  useEffect(() => {
    fetch("/api/my/dashboard-points")
      .then(r => r.json())
      .then(data => { if (!data.error) setDashboardPoints(data); })
      .catch(err => console.error('ポイント取得エラー:', err));
  }, []);

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

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      slideRef.current = (slideRef.current + 1) % announcements.length;
      setSlide(slideRef.current);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

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

  const mlmMenuItems = [
    { href: "/mlm-registration",     svgD: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",  label: "登録情報",    accentColor: GOLD },
    { href: "/mlm-bonus-history",    svgD: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "ボーナス\n履歴", accentColor: ORANGE },
    { href: "/mlm-purchase-history", svgD: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z", label: "購入履歴",    accentColor: "#60a5fa" },
    { href: "/mlm-autoship",         svgD: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", label: "オートシップ\n確認", accentColor: "#34d399" },
    { href: "/orders/checkout",      svgD: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",  label: "商品注文",    accentColor: "#f472b6" },
    { href: "/org-chart",            svgD: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "組織図",      accentColor: "#34d399" },
    { href: "/mlm-status",           svgD: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "状況",        accentColor: "#a78bfa" },
    { href: "/mlm-referrer-list",    svgD: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", label: "紹介者\n一覧", accentColor: "#818cf8" },
    { href: "/referral",             svgD: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4 2 2 0 010 4zm14 0a2 2 0 110-4 2 2 0 010 4z", label: "お友達\n紹介", accentColor: ORANGE },
  ];

  return (
    <div className="min-h-screen pb-28 relative" style={{ background: PAGE_BG }}>

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-30"
        style={{ background: `rgba(7,18,40,0.97)`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${GOLD}20` }}>
        <div className="max-w-md mx-auto flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}>V</div>
            <span className="font-bold text-white text-base tracking-widest">VIOLA <span style={{ color: GOLD }}>Pure</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/announcements" className="relative transition" style={{ color: "rgba(255,255,255,0.6)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="transition p-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── ドロワーメニュー ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 flex flex-col"
            style={{ background: "#060f22", borderLeft: `1px solid ${GOLD}20` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: `1px solid ${GOLD}15` }}>
              <span className="font-bold text-white text-base tracking-wider">MENU</span>
              <button onClick={() => setMenuOpen(false)} className="transition" style={{ color: "rgba(255,255,255,0.4)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col flex-1 px-3 py-4 overflow-y-auto">
              {[
                { href: "/dashboard",            label: "ホーム",           svgD: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                { href: "#mlm-menu",             label: "MLMメニュー",      svgD: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
                { href: "#menu",                 label: "福利厚生メニュー", svgD: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
                { href: "/mlm-status",           label: "MLM状況",          svgD: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
                { href: "/mlm-registration",     label: "登録情報",         svgD: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                { href: "/mlm-bonus-history",    label: "ボーナス履歴",     svgD: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { href: "/mlm-purchase-history", label: "購入履歴",         svgD: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
                { href: "/mlm-autoship",         label: "オートシップ",     svgD: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
                { href: "/orders/checkout",      label: "商品注文",         svgD: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
                { href: "/org-chart",            label: "組織図",           svgD: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { href: "/mlm-referrer-list",    label: "紹介者一覧",       svgD: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
                { href: "/referral",             label: "お友達紹介",       svgD: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4 2 2 0 010 4zm14 0a2 2 0 110-4 2 2 0 010 4z" },
                { href: "/points/use",           label: "ポイントを使う",   svgD: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" },
                { href: "/points/history",       label: "ポイント履歴",     svgD: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { href: "/announcements",        label: "お知らせ",         svgD: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
                { href: "/mlm-org-chart",        label: "MLM組織図",        svgD: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
                { href: "/travel-referrals",     label: "旅行サブスク紹介", svgD: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition"
                  style={{ color: "rgba(255,255,255,0.6)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.svgD} />
                  </svg>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-6">
              <button onClick={async () => { const { signOut } = await import("next-auth/react"); signOut({ callbackUrl: "/login" }); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">

        {/* ── ウェルカムカード ── */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(150deg, #0d1e45 0%, #162a56 50%, #0d1e45 100%)",
            border: `1px solid ${GOLD}30`
          }}>
          {/* ゴールドライン */}
          <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, ${ORANGE}, transparent)` }}></div>
          <div className="p-6">
            {/* ユーザー情報 */}
            <div className="flex items-center gap-4 mb-5">
              <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "rgba(212,168,83,0.12)", border: `2px solid ${GOLD}50` }}>
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="アバター" className="w-full h-full object-cover" />
                ) : avatar}
              </button>
              <div className="flex-1">
                <p className="text-xs font-medium mb-0.5" style={{ color: `${GOLD}90` }}>こんにちは</p>
                <p className="text-white text-xl font-bold leading-tight">{user.name} <span style={{ color: GOLD }}>さん</span></p>
                <p className="text-xs mt-1" style={{ color: `${GOLD}60` }}>会員コード：{user.memberCode}</p>
              </div>
              <Link href="/profile"
                className="flex items-center justify-center w-9 h-9 rounded-xl transition"
                style={{ border: `1px solid ${GOLD}25`, color: `${GOLD}60` }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* アバター選択 */}
            {showAvatarPicker && (
              <div className="rounded-2xl p-3 mb-5" style={{ background: "rgba(212,168,83,0.07)", border: `1px solid ${GOLD}20` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: `${GOLD}80` }}>アイコンを選択</p>
                  <Link href="/profile#avatar"
                    className="text-[10px] font-semibold transition" style={{ color: ORANGE }}
                    onClick={() => setShowAvatarPicker(false)}>
                    写真に変更 →
                  </Link>
                </div>
                {profileAvatarUrl && (
                  <p className="text-[10px] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>📸 プロフィール写真が設定されています</p>
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

            {/* ポイント情報 */}
            <div className="space-y-3">
              {[
                { label: "MLM先月ポイント",    value: dashboardPoints.mlmLastMonthPoints,    unit: "VPpt",   barColor: GOLD },
                { label: "MLM今月ポイント",    value: dashboardPoints.mlmCurrentMonthPoints,  unit: "VPpt",   barColor: ORANGE },
                { label: "貯金ボーナスポイント", value: dashboardPoints.savingsBonusPoints,   unit: "SAVpt",  barColor: "#34d399" },
                { label: "携帯紹介ポイント",    value: dashboardPoints.mobileReferralPoints,  unit: "MPIpt",  barColor: "#818cf8" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{item.label}</span>
                    <span className="text-sm font-bold text-white">
                      {item.value.toLocaleString()}
                      <span className="text-[10px] ml-1" style={{ color: `${item.barColor}80` }}>{item.unit}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min((item.value / 10000) * 100, 100)}%`,
                        background: item.barColor
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}50, transparent)` }}></div>
        </div>

        {/* ── MLM会員状況バナー ── */}
        <MlmStatusButton status={mlmStatus} />

        {/* ── お知らせスライダー ── */}
        <section id="news">
          <SectionHeader label="お知らせ" accentColor={GOLD} />
          {announcements.length === 0 ? (
            <div className="rounded-2xl p-5 text-center text-sm border"
              style={{ color: "rgba(255,255,255,0.3)", background: CARD_BG, borderColor: `${GOLD}15` }}>
              現在お知らせはありません
            </div>
          ) : (
            <Link href="/announcements" className="block rounded-2xl overflow-hidden"
              style={{ background: slideBg, border: `1px solid ${GOLD}20` }}>
              {/* ゴールドライン */}
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${GOLD}80, ${ORANGE}80)` }}></div>
              <div className="p-5 min-h-[110px]">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${TAG_STYLE[activeAnn?.tag] ?? ""}`}
                    style={!TAG_STYLE[activeAnn?.tag] ? { background: `${GOLD}25`, color: GOLD } : {}}>
                    {TAG_LABEL[activeAnn?.tag] ?? "お知らせ"}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {activeAnn?.publishedAt ? new Date(activeAnn.publishedAt).toLocaleDateString("ja-JP") : ""}
                  </span>
                </div>
                <p className="font-bold text-white text-base leading-snug">{activeAnn?.title}</p>
                <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "rgba(255,255,255,0.6)" }}>{activeAnn?.content}</p>
              </div>
              {announcements.length > 1 && (
                <div className="flex justify-center gap-1.5 pb-3">
                  {announcements.map((_, i) => (
                    <button key={i} onClick={e => { e.preventDefault(); slideRef.current = i; setSlide(i); }}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={i === slide ? { width: "20px", background: GOLD } : { width: "6px", background: "rgba(255,255,255,0.25)" }} />
                  ))}
                </div>
              )}
            </Link>
          )}
        </section>

        {/* ── MLMメニュー ── */}
        <section id="mlm-menu">
          <SectionHeader label="MLM メニュー" accentColor={ORANGE} />
          <div className="grid grid-cols-3 gap-2.5">
            {mlmMenuItems.map((item, idx) => (
              <Link key={idx} href={item.href}
                className="rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: CARD_BG, border: `1px solid ${item.accentColor}20` }}>
                <div className="h-0.5" style={{ background: item.accentColor }}></div>
                <div className="p-3 text-center">
                  <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                    style={{ background: `${item.accentColor}15` }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      style={{ color: item.accentColor }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.svgD} />
                    </svg>
                  </div>
                  <p className="text-[11px] font-semibold leading-tight whitespace-pre-line" style={{ color: "rgba(255,255,255,0.8)" }}>{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 福利厚生メニュー ── */}
        <section id="menu">
          <SectionHeader label="福利厚生 メニュー" accentColor={GOLD} />
          <div className="grid grid-cols-3 gap-2.5">
            {menus.map(m => {
              const emoji = ICON_MAP[m.iconType ?? ""] ?? "📌";
              const cardStyle = { background: CARD_BG, border: `1px solid ${GOLD}18` };

              if (m.menuType === "contact") {
                return (
                  <a key={m.id} href="/contact"
                    className="rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-95"
                    style={cardStyle}>
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}></div>
                    <div className="p-3 text-center">
                      <div className="text-2xl mb-2">{emoji}</div>
                      <p className="text-[11px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.8)" }}>{m.title}</p>
                      {m.subtitle && <p className="text-[10px] mt-0.5" style={{ color: `${GOLD}60` }}>{m.subtitle}</p>}
                    </div>
                  </a>
                );
              }
              if (m.menuType === "travel_sub" || m.title.includes("旅行")) {
                return (
                  <button key={m.id}
                    onClick={() => travelSubRef.current?.openModal()}
                    className="w-full rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-95"
                    style={cardStyle}>
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}></div>
                    <div className="p-3 text-center">
                      <div className="text-2xl mb-2">{emoji}</div>
                      <p className="text-[11px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.8)" }}>{m.title}</p>
                      {m.subtitle && <p className="text-[10px] mt-0.5" style={{ color: `${GOLD}60` }}>{m.subtitle}</p>}
                    </div>
                  </button>
                );
              }
              const href = m.linkUrl ?? "#";
              const isInternal = href.startsWith("/");
              return (
                <a key={m.id}
                  href={href}
                  target={isInternal ? undefined : "_blank"}
                  rel={isInternal ? undefined : "noopener noreferrer"}
                  className="rounded-2xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-95"
                  style={cardStyle}>
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}></div>
                  <div className="p-3 text-center">
                    <div className="text-2xl mb-2">{emoji}</div>
                    <p className="text-[11px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.8)" }}>{m.title}</p>
                    {m.subtitle && <p className="text-[10px] mt-0.5" style={{ color: `${GOLD}60` }}>{m.subtitle}</p>}
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {/* ── クイックアクセス ── */}
        <section>
          <SectionHeader label="クイックアクセス" accentColor="#818cf8" />
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/points/history",   svgD: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", label: "ポイント履歴",           accentColor: GOLD },
              { href: "/profile",          svgD: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",                    label: "マイアカウント",         accentColor: ORANGE },
              { href: "/mlm-org-chart",    svgD: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z", label: "MLM組織図",             accentColor: "#34d399" },
              { href: "/travel-referrals", svgD: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", label: "旅行サブスク\n紹介ツリー", accentColor: "#818cf8" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="rounded-2xl p-4 flex items-center gap-3 transition hover:scale-[1.01] active:scale-95"
                style={{ background: CARD_BG, border: `1px solid ${item.accentColor}20` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.accentColor}15` }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: item.accentColor }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.svgD} />
                  </svg>
                </div>
                <p className="text-xs font-semibold leading-tight whitespace-pre-line" style={{ color: "rgba(255,255,255,0.75)" }}>{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* TravelSubButton（非表示・モーダルのみ） */}
        <div className="hidden">
          <TravelSubButton ref={travelSubRef} />
        </div>

      </main>

      {/* ── ボトムナビ ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30"
        style={{ background: "rgba(6,15,34,0.97)", backdropFilter: "blur(16px)", borderTop: `1px solid ${GOLD}20` }}>
        <div className="max-w-md mx-auto flex items-end justify-around px-2 py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 py-1 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>ホーム</span>
          </Link>
          <Link href="#mlm-menu" className="flex flex-col items-center gap-1 py-1 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>メニュー</span>
          </Link>
          <Link href="/points/use" className="flex flex-col items-center -mt-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-xl"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})`,
                borderColor: `${GOLD}60`,
                boxShadow: `0 8px 24px ${GOLD}40`
              }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-semibold mt-1" style={{ color: GOLD }}>ポイント</span>
          </Link>
          <Link href="/announcements" className="flex flex-col items-center gap-1 py-1 px-4 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-2.5 bg-red-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
            <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>お知らせ</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-1 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>マイページ</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
