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
  campaign:  "bg-amber-400 text-amber-900",
  new:       "bg-blue-500 text-white",
  notice:    "bg-slate-500 text-white",
};
const TAG_LABEL: Record<string,string> = {
  important:"重要", campaign:"キャンペーン", new:"新機能", notice:"お知らせ"
};
const SLIDE_BG = [
  "linear-gradient(135deg, #1e3a5f, #2563eb)",
  "linear-gradient(135deg, #3b1f5e, #7c3aed)",
  "linear-gradient(135deg, #7c1a1a, #dc2626)",
  "linear-gradient(135deg, #064e3b, #059669)",
  "linear-gradient(135deg, #1e3a5f, #0891b2)",
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

  type SInfo = { label: string; icon: string; dot: string };
  const STATUS_INFO: Record<string, SInfo> = {
    pending:    { label: "審査待ち",  icon: "⏳", dot: "bg-amber-400" },
    reviewing:  { label: "審査中",    icon: "🔍", dot: "bg-blue-400" },
    contracted: { label: "契約済み",  icon: "✅", dot: "bg-emerald-400" },
    rejected:   { label: "審査不可",  icon: "❌", dot: "bg-red-400" },
    canceled:   { label: "取消済み",  icon: "🚫", dot: "bg-slate-400" },
  };

  if (loading) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">📱</div>
        <div className="flex-1">
          <p className="font-bold text-white/80 text-sm">VP未来phone</p>
          <p className="text-xs text-white/50 animate-pulse mt-0.5">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!appData) {
    return (
      <Link href="/vp-phone"
        className="block rounded-2xl p-4 border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br from-green-500 to-emerald-400">📱</div>
          <div>
            <p className="font-bold text-sm text-white">VP未来phone</p>
            <p className="text-[11px] text-white/60 mt-0.5">お得なスマートフォン回線</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-600 text-white/80 px-3 py-1 text-xs font-bold">
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
      className="block rounded-2xl p-4 border border-white/10 bg-white/5 hover:bg-white/10 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br from-green-500 to-emerald-400">📱</div>
          <div>
            <p className="font-bold text-sm text-white">{cardTitle}</p>
            {contractTypeLabel && (
              <p className="text-[11px] text-white/60 mt-0.5">{contractTypeLabel}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
            <span className={`w-2 h-2 rounded-full ${info.dot}`}></span>
            {info.label}
          </span>
          <span className="text-white/40 text-xs">確認する →</span>
        </div>
      </div>
      {appData.status === "contracted" && (
        <div className="mt-2 bg-emerald-500/20 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-300">
          ✓ 契約完了済み
        </div>
      )}
      {(appData.status === "pending" || appData.status === "reviewing") && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span>申込完了</span><span>審査中</span><span>契約完了</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1">
            <div className={`h-1 rounded-full transition-all ${
              appData.status === "reviewing" ? "bg-blue-400 w-2/3" : "bg-amber-400 w-1/3"
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
    1: { badge: "bg-violet-500 text-white" },
    2: { badge: "bg-blue-500 text-white" },
    3: { badge: "bg-emerald-500 text-white" },
    4: { badge: "bg-amber-500 text-white" },
    5: { badge: "bg-rose-500 text-white" },
  };

  const FORCE_STYLE: Record<string, { label: string; dot: string }> = {
    forced_active:   { label: "✨ 特別アクティブ", dot: "bg-cyan-400" },
    forced_inactive: { label: "⏸ 一時停止中",    dot: "bg-orange-400" },
  };

  const DISPLAY_STATUS_DOT: Record<string, { label: string; dot: string }> = {
    active:   { label: "アクティブ",   dot: "bg-emerald-400" },
    inactive: { label: "非アクティブ", dot: "bg-slate-400" },
    none:     { label: "未登録",       dot: "bg-slate-500" },
    pending:  { label: "申込中",       dot: "bg-amber-400" },
    canceled: { label: "退会済み",     dot: "bg-red-400" },
    suspended:{ label: "支払い待ち",   dot: "bg-orange-400" },
  };

  if (!travelSub) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
        <span className="text-2xl">✈️</span>
        <div className="flex-1">
          <p className="font-bold text-white/80 text-sm">旅行サブスク</p>
          <p className="text-xs text-white/50 animate-pulse mt-0.5">読み込み中...</p>
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

  let statusDot = "bg-slate-500";
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
        className="w-full text-left rounded-2xl p-4 border border-white/10 bg-white/5 hover:bg-white/10 transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br from-violet-500 to-purple-400">✈️</div>
            <div>
              <p className="font-bold text-white text-sm">旅行サブスク</p>
              {sub ? (
                <p className="text-[11px] text-white/60 mt-0.5">{sub.planName} · ¥{sub.monthlyFee.toLocaleString()}/月</p>
              ) : (
                <p className="text-[11px] text-white/60 mt-0.5">タップして詳細・申込</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {sub && (
              <span className={`rounded-full text-xs font-bold px-2.5 py-0.5 ${lvStyle.badge}`}>
                Lv{lv}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-white/70">
              <span className={`w-2 h-2 rounded-full ${statusDot}`}></span>
              {statusLabel}
            </span>
          </div>
        </div>
      </button>

      {/* 旅行サブスク詳細・申込モーダル */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6"
          onClick={() => { setShowApplyModal(false); setApplyDone(false); setApplyError(""); }}>
          <div className="w-full sm:max-w-2xl bg-[#111827] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-white/10"
            style={{ maxHeight: "90vh" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">✈️</span>
                <h2 className="font-bold text-white text-sm">旅行サブスク</h2>
              </div>
              <button onClick={() => { setShowApplyModal(false); setApplyDone(false); setApplyError(""); }}
                className="text-white/60 text-2xl hover:text-white leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1">
            <div className="px-5 py-4 space-y-4 pb-10 sm:px-8 sm:py-6">
              {sub && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/50">現在のプラン</p>
                      <p className="font-bold text-white">{sub.planName}</p>
                      <p className="text-sm font-bold text-white/70 mt-0.5">¥{sub.monthlyFee.toLocaleString()}/月</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`rounded-full text-xs font-bold px-2.5 py-0.5 ${lvStyle.badge}`}>Lv{lv}</span>
                      <span className="flex items-center gap-1.5 text-xs text-white/70">
                        <span className={`w-2 h-2 rounded-full ${statusDot}`}></span>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                  {sub.confirmedAt && (
                    <p className="text-xs text-white/40 mt-2">確定日: {new Date(sub.confirmedAt).toLocaleDateString("ja-JP")}</p>
                  )}
                </div>
              )}

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-xs font-bold text-white/70 mb-3">💴 料金体系</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-violet-500/10 border border-violet-400/20 p-3">
                    <p className="text-[10px] font-bold text-violet-300 mb-2">🌸 先着50名まで</p>
                    <div className="space-y-1">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="flex justify-between text-xs">
                          <span className="text-violet-300 font-semibold">Lv{l}</span>
                          <span className="font-bold text-white">¥{TRAVEL_FEES.early[l].toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-400/20 p-3">
                    <p className="text-[10px] font-bold text-blue-300 mb-2">📌 51名以降</p>
                    <div className="space-y-1">
                      {[1,2,3,4,5].map(l => (
                        <div key={l} className="flex justify-between text-xs">
                          <span className="text-blue-300 font-semibold">Lv{l}</span>
                          <span className="font-bold text-white">¥{TRAVEL_FEES.standard[l].toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-500/10 border border-amber-400/20 p-4">
                <p className="text-xs font-bold text-amber-300 mb-2">💳 お支払い情報</p>
                <div className="space-y-1.5 text-xs text-amber-200/80">
                  <div className="flex items-start gap-2">
                    <span>📅</span>
                    <span>支払日：毎月<strong className="text-amber-200">15日</strong>（翌月分の前払い）</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>🏦</span>
                    <span>お支払い方法：<strong className="text-amber-200">銀行振込のみ</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>振込期限を過ぎた場合、ステータスが「支払い待ち」になります</span>
                  </div>
                </div>
              </div>

              {!sub && !applyDone && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-sm font-bold text-white mb-3">📝 旅行サブスクに申し込む</p>
                  <form onSubmit={handleApply} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-white/60 mb-1">会員ID（任意）</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="例: M0001"
                        value={applyForm.memberCode}
                        onChange={e => setApplyForm({ ...applyForm, memberCode: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/60 mb-1">氏名<span className="text-red-400 ml-1">*</span></label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="山田 太郎"
                        value={applyForm.name}
                        onChange={e => setApplyForm({ ...applyForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/60 mb-1">電話番号<span className="text-red-400 ml-1">*</span></label>
                      <input
                        required
                        type="tel"
                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="090-1234-5678"
                        value={applyForm.phone}
                        onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/60 mb-1">メールアドレス<span className="text-red-400 ml-1">*</span></label>
                      <input
                        required
                        type="email"
                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="example@email.com"
                        value={applyForm.email}
                        onChange={e => setApplyForm({ ...applyForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/60 mb-1">現在の自身のレベル<span className="text-red-400 ml-1">*</span></label>
                      <p className="text-[10px] text-white/40 mb-2">自身の現在実績レベルを選択してください</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1,2,3,4,5].map(l => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => setApplyForm({ ...applyForm, level: l })}
                            className={`rounded-xl border-2 py-2 text-center transition-all ${
                              applyForm.level === l
                                ? "border-violet-500 bg-violet-500/30 text-white"
                                : "border-white/10 bg-white/5 text-white/60 hover:border-violet-400/50"
                            }`}
                          >
                            <div className="text-xs font-bold">Lv{l}</div>
                            <div className="text-[9px] mt-0.5">
                              ¥{TRAVEL_FEES.early[l].toLocaleString()}
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/30 mt-1">※先着50名料金表示。実際の料金は担当者よりご案内します。</p>
                    </div>

                    <div className="rounded-xl bg-violet-500/10 border border-violet-400/20 px-4 py-3 flex justify-between items-center">
                      <span className="text-xs text-violet-300">現在レベル: Lv{applyForm.level}</span>
                      <span className="font-bold text-violet-200">¥{TRAVEL_FEES.early[applyForm.level].toLocaleString()}/月〜</span>
                    </div>

                    {applyError && (
                      <p className="text-xs text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">{applyError}</p>
                    )}

                    <button type="submit" disabled={applying}
                      className="w-full rounded-xl bg-violet-600 text-white py-3 text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50">
                      {applying ? "申込中..." : "✈️ 旅行サブスクに申し込む"}
                    </button>
                  </form>
                </div>
              )}

              {applyDone && (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/20 p-5 text-center">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="font-bold text-emerald-300 text-sm">申し込みを受け付けました！</p>
                  <p className="text-xs text-emerald-400/80 mt-1">担当者より銀行振込先などのご案内をお送りします。</p>
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
  const statusConfig: Record<string, { label: string; dot: string; accent: string }> = {
    active:    { label: "アクティブ",   dot: "bg-emerald-400", accent: "text-emerald-300" },
    inactive:  { label: "非アクティブ", dot: "bg-slate-400",   accent: "text-slate-300" },
    pending:   { label: "支払い待ち",   dot: "bg-amber-400 animate-pulse",    accent: "text-amber-300" },
    suspended: { label: "活動停止",     dot: "bg-orange-400",  accent: "text-orange-300" },
    canceled:  { label: "退会",         dot: "bg-red-400",     accent: "text-red-300" },
  };

  if (!status) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">👤</div>
          <div>
            <p className="text-xs text-white/50">MLM会員状況</p>
            <p className="text-sm font-bold text-white">未登録</p>
          </div>
        </div>
        <Link href="/mlm/register"
          className="px-4 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition">
          登録する
        </Link>
      </div>
    );
  }

  const config = statusConfig[status] ?? statusConfig.inactive;

  return (
    <Link href="/mlm-status"
      className="block rounded-2xl p-4 border border-white/10 bg-white/5 hover:bg-white/10 transition active:scale-98">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-xl">🌿</div>
          <div>
            <p className="text-xs text-white/50">MLM会員状況</p>
            <p className={`text-base font-bold ${config.accent}`}>{config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></span>
          <span className="text-white/40 text-xl">›</span>
        </div>
      </div>
    </Link>
  );
}

// ────────── 携帯契約状況ボタン ──────────
function VpPhoneStatusButton({ status }: { status: string | null }) {
  const statusConfig: Record<string, { label: string; dot: string; accent: string }> = {
    contracted: { label: "契約中",     dot: "bg-emerald-400",    accent: "text-emerald-300" },
    pending:    { label: "支払い待ち", dot: "bg-amber-400 animate-pulse", accent: "text-amber-300" },
    reviewing:  { label: "審査中",    dot: "bg-blue-400 animate-pulse",  accent: "text-blue-300" },
  };

  if (!status || status === 'canceled' || status === 'rejected') {
    return (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">📵</div>
          <div>
            <p className="text-xs text-white/50">携帯契約状況</p>
            <p className="text-sm font-bold text-white">未契約</p>
          </div>
        </div>
        <Link href="/vp-phone"
          className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition">
          申し込む
        </Link>
      </div>
    );
  }

  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <Link href="/vp-phone"
      className="block rounded-2xl p-4 border border-white/10 bg-white/5 hover:bg-white/10 transition active:scale-98">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-xl">📱</div>
          <div>
            <p className="text-xs text-white/50">携帯契約状況</p>
            <p className={`text-base font-bold ${config.accent}`}>{config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></span>
          <span className="text-white/40 text-xl">›</span>
        </div>
      </div>
    </Link>
  );
}

// ────────── 旅行サブスク状況ボタン ──────────
function TravelSubStatusButton({ status }: { status: string | null }) {
  const statusConfig: Record<string, { label: string; dot: string; accent: string }> = {
    active:  { label: "契約中",    dot: "bg-emerald-400",    accent: "text-emerald-300" },
    pending: { label: "支払い待ち",dot: "bg-amber-400 animate-pulse", accent: "text-amber-300" },
  };

  if (!status || status === 'canceled') {
    return (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">🌴</div>
          <div>
            <p className="text-xs text-white/50">旅行サブスク</p>
            <p className="text-sm font-bold text-white">未契約</p>
          </div>
        </div>
        <button
          className="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600 transition">
          申し込む
        </button>
      </div>
    );
  }

  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-xl">✈️</div>
          <div>
            <p className="text-xs text-white/50">旅行サブスク</p>
            <p className={`text-base font-bold ${config.accent}`}>{config.label}</p>
          </div>
        </div>
        <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></span>
      </div>
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
      .then(data => {
        if (!data.error) {
          setDashboardPoints(data);
        }
      })
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
    { href: "/mlm-registration",     icon: "👤", label: "登録情報",    accent: "from-slate-600 to-slate-500" },
    { href: "/mlm-bonus-history",    icon: "💰", label: "ボーナス\n履歴", accent: "from-amber-600 to-orange-500" },
    { href: "/mlm-purchase-history", icon: "📦", label: "購入履歴",    accent: "from-blue-600 to-blue-500" },
    { href: "/mlm-autoship",         icon: "🔄", label: "オートシップ\n確認", accent: "from-cyan-600 to-teal-500" },
    { href: "/orders/checkout",      icon: "🛍️", label: "商品注文",    accent: "from-rose-600 to-pink-500" },
    { href: "/org-chart",            icon: "🌳", label: "組織図",      accent: "from-emerald-600 to-green-500" },
    { href: "/mlm-status",           icon: "📊", label: "状況",        accent: "from-violet-600 to-purple-500" },
    { href: "/mlm-referrer-list",    icon: "👥", label: "紹介者\n一覧", accent: "from-indigo-600 to-indigo-500" },
    { href: "/referral",             icon: "🎁", label: "お友達\n紹介", accent: "from-pink-600 to-fuchsia-500" },
  ];

  return (
    <div className="min-h-screen pb-28 relative" style={{ background: "#0a0f1e" }}>

      {/* ── ヘッダー ── */}
      <header className="sticky top-0 z-30 border-b border-white/5"
        style={{ background: "rgba(10,15,30,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-md mx-auto flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
              style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>V</div>
            <span className="font-bold text-white text-base tracking-wide">VIOLA Pure</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/announcements" className="relative text-white/70 hover:text-white transition">
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
              className="text-white/70 hover:text-white transition p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── ドロワーメニュー ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 flex flex-col border-l border-white/10"
            style={{ background: "#0d1424" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <span className="font-bold text-white text-base">メニュー</span>
              <button onClick={() => setMenuOpen(false)} className="text-white/50 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col flex-1 px-3 py-4 overflow-y-auto">
              {[
                { href: "/dashboard",            label: "ホーム",           icon: "🏠" },
                { href: "#mlm-menu",             label: "MLMメニュー",      icon: "🌿" },
                { href: "#menu",                 label: "福利厚生メニュー", icon: "🛎️" },
                { href: "/mlm-status",           label: "MLM状況",          icon: "📊" },
                { href: "/mlm-registration",     label: "登録情報",         icon: "👤" },
                { href: "/mlm-bonus-history",    label: "ボーナス履歴",     icon: "💰" },
                { href: "/mlm-purchase-history", label: "購入履歴",         icon: "📦" },
                { href: "/mlm-autoship",         label: "オートシップ",     icon: "🔄" },
                { href: "/orders/checkout",      label: "商品注文",         icon: "🛍️" },
                { href: "/org-chart",            label: "組織図",           icon: "🌳" },
                { href: "/mlm-referrer-list",    label: "紹介者一覧",       icon: "👥" },
                { href: "/referral",             label: "お友達紹介",       icon: "🎁" },
                { href: "/points/use",           label: "ポイントを使う",   icon: "💎" },
                { href: "/points/history",       label: "ポイント履歴",     icon: "📋" },
                { href: "/announcements",        label: "お知らせ",         icon: "🔔" },
                { href: "/mlm-org-chart",        label: "MLM組織図",        icon: "🌲" },
                { href: "/travel-referrals",     label: "旅行サブスク紹介", icon: "✈️" },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-6">
              <button onClick={async () => { const { signOut } = await import("next-auth/react"); signOut({ callbackUrl: "/login" }); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
                <span>🚪</span>
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">

        {/* ── ウェルカムカード ── */}
        <div className="rounded-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0d2b1f 0%, #064e3b 50%, #0d2b1f 100%)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="p-6">
            {/* ユーザー情報 */}
            <div className="flex items-center gap-4 mb-5">
              <button onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(16,185,129,0.4)" }}>
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="アバター" className="w-full h-full object-cover" />
                ) : avatar}
              </button>
              <div className="flex-1">
                <p className="text-emerald-400/80 text-xs font-medium mb-0.5">こんにちは</p>
                <p className="text-white text-xl font-bold leading-tight">{user.name} さん</p>
                <p className="text-emerald-400/60 text-xs mt-1">会員コード：{user.memberCode}</p>
              </div>
              <Link href="/profile"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* アバター選択 */}
            {showAvatarPicker && (
              <div className="rounded-2xl p-3 mb-5" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white/70">アイコンを選択</p>
                  <Link href="/profile#avatar"
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 transition font-semibold"
                    onClick={() => setShowAvatarPicker(false)}>
                    📷 写真に変更 →
                  </Link>
                </div>
                {profileAvatarUrl && (
                  <p className="text-[10px] text-white/40 mb-2">📸 プロフィール写真が設定されています</p>
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
                { label: "MLM先月ポイント",    value: dashboardPoints.mlmLastMonthPoints,    unit: "VPpt",   color: "#f59e0b", max: 10000 },
                { label: "MLM今月ポイント",    value: dashboardPoints.mlmCurrentMonthPoints,  unit: "VPpt",   color: "#3b82f6", max: 10000 },
                { label: "貯金ボーナスポイント", value: dashboardPoints.savingsBonusPoints,   unit: "SAVpt",  color: "#10b981", max: 10000 },
                { label: "携帯紹介ポイント",    value: dashboardPoints.mobileReferralPoints,  unit: "MPIpt",  color: "#8b5cf6", max: 10000 },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/60 text-xs">{item.label}</span>
                    <span className="text-white text-sm font-bold">
                      {item.value.toLocaleString()}
                      <span className="text-white/40 text-[10px] ml-1">{item.unit}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                        background: item.color
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MLM会員状況バナー ── */}
        <MlmStatusButton status={mlmStatus} />

        {/* ── お知らせスライダー ── */}
        <section id="news">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-0.5 h-4 rounded-full bg-white/30"></div>
            <h2 className="text-sm font-semibold text-white/70 tracking-wide">お知らせ</h2>
          </div>
          {announcements.length === 0 ? (
            <div className="rounded-2xl p-5 text-center text-white/40 text-sm border border-white/10 bg-white/5">
              現在お知らせはありません
            </div>
          ) : (
            <Link href="/announcements" className="block rounded-2xl overflow-hidden"
              style={{ background: slideBg, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="p-5 min-h-[110px]">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${TAG_STYLE[activeAnn?.tag] ?? "bg-white/20 text-white"}`}>
                    {TAG_LABEL[activeAnn?.tag] ?? "お知らせ"}
                  </span>
                  <span className="text-xs text-white/50">
                    {activeAnn?.publishedAt ? new Date(activeAnn.publishedAt).toLocaleDateString("ja-JP") : ""}
                  </span>
                </div>
                <p className="font-bold text-white text-base leading-snug">{activeAnn?.title}</p>
                <p className="text-xs text-white/70 mt-1.5 line-clamp-2">{activeAnn?.content}</p>
              </div>
              {announcements.length > 1 && (
                <div className="flex justify-center gap-1.5 pb-3">
                  {announcements.map((_, i) => (
                    <button key={i} onClick={e => { e.preventDefault(); slideRef.current = i; setSlide(i); }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? "bg-white w-5" : "bg-white/30 w-1.5"}`} />
                  ))}
                </div>
              )}
            </Link>
          )}
        </section>

        {/* ── MLMメニュー ── */}
        <section id="mlm-menu">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-4 rounded-full bg-emerald-500"></div>
            <h2 className="text-sm font-semibold text-white/70 tracking-wide">MLMメニュー</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {mlmMenuItems.map((item, idx) => (
              <Link key={idx} href={item.href}
                className="rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform active:scale-95"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className={`h-1 bg-gradient-to-r ${item.accent}`}></div>
                <div className="p-3 text-center">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-[12px] font-semibold text-white/80 leading-tight whitespace-pre-line">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 福利厚生メニュー ── */}
        <section id="menu">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-4 rounded-full bg-blue-500"></div>
            <h2 className="text-sm font-semibold text-white/70 tracking-wide">福利厚生メニュー</h2>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {menus.map(m => {
              const emoji = ICON_MAP[m.iconType ?? ""] ?? "📌";
              const cardClasses = "rounded-2xl p-3 text-center hover:scale-[1.02] transition-transform active:scale-95";
              const cardStyle = { background: "#111827", border: "1px solid rgba(255,255,255,0.08)" };

              if (m.menuType === "contact") {
                return (
                  <a key={m.id} href="/contact" className={cardClasses} style={cardStyle}>
                    <div className="text-2xl mb-2">{emoji}</div>
                    <p className="text-[12px] font-semibold text-white/80 leading-tight">{m.title}</p>
                    {m.subtitle && <p className="text-[10px] text-white/40 mt-0.5">{m.subtitle}</p>}
                  </a>
                );
              }
              if (m.menuType === "travel_sub" || m.title.includes("旅行")) {
                return (
                  <button key={m.id}
                    onClick={() => travelSubRef.current?.openModal()}
                    className={`w-full ${cardClasses}`} style={cardStyle}>
                    <div className="text-2xl mb-2">{emoji}</div>
                    <p className="text-[12px] font-semibold text-white/80 leading-tight">{m.title}</p>
                    {m.subtitle && <p className="text-[10px] text-white/40 mt-0.5">{m.subtitle}</p>}
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
                  className={cardClasses} style={cardStyle}>
                  <div className="text-2xl mb-2">{emoji}</div>
                  <p className="text-[12px] font-semibold text-white/80 leading-tight">{m.title}</p>
                  {m.subtitle && <p className="text-[10px] text-white/40 mt-0.5">{m.subtitle}</p>}
                </a>
              );
            })}
          </div>
        </section>

        {/* ── クイックアクセス ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-0.5 h-4 rounded-full bg-purple-500"></div>
            <h2 className="text-sm font-semibold text-white/70 tracking-wide">クイックアクセス</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/points/history",   icon: "📊", label: "ポイント履歴" },
              { href: "/profile",          icon: "👤", label: "マイアカウント" },
              { href: "/mlm-org-chart",    icon: "🌲", label: "MLM組織図" },
              { href: "/travel-referrals", icon: "✈️", label: "旅行サブスク紹介ツリー" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="rounded-2xl p-4 text-center hover:scale-[1.02] transition-transform active:scale-95"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-2xl mb-1.5">{item.icon}</div>
                <p className="text-xs font-semibold text-white/70">{item.label}</p>
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
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-md mx-auto flex items-end justify-around px-2 py-2">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 py-1 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-semibold text-white/50">ホーム</span>
          </Link>
          <Link href="#mlm-menu" className="flex flex-col items-center gap-1 py-1 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
            <span className="text-[10px] font-semibold text-white/50">メニュー</span>
          </Link>
          <Link href="/points/use" className="flex flex-col items-center -mt-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 shadow-xl shadow-emerald-500/30"
              style={{ background: "linear-gradient(135deg, #10b981, #34d399)", borderColor: "rgba(16,185,129,0.5)" }}>
              💎
            </div>
            <span className="text-[10px] font-semibold text-white/50 mt-1">ポイント</span>
          </Link>
          <Link href="/announcements" className="flex flex-col items-center gap-1 py-1 px-4 relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-2.5 bg-red-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
            <span className="text-[10px] font-semibold text-white/50">お知らせ</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 py-1 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-semibold text-white/50">マイページ</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
