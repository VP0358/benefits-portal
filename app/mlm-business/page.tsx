"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/mlm-bonus";

type RegistrationData = {
  registration: {
    memberCode: string;
    name: string;
  };
  business: {
    status: string;
    memberType: string;
    currentLevel: number;
    titleLevel: number;
    conditionAchieved: boolean;
    forceActive: boolean;
    forceLevel: number | null;
    contractDate: string | null;
    autoshipEnabled: boolean;
    autoshipStartDate: string | null;
    autoshipStopDate: string | null;
    paymentMethod: string;
    savingsPoints: number;
    matrixPosition: number;
    referrerId: string | null;
    referrerCode: string | null;
    referrerName: string | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
  };
  bankAccount: {
    bankCode: string | null;
    bankName: string | null;
    branchCode: string | null;
    branchName: string | null;
    accountType: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
  };
};

// ── カラー定数 ──
const GOLD       = "#c9a84c";
const GOLD_LIGHT = "#e8c96a";
const ORANGE     = "#d4703a";
const PAGE_BG    = "#eee8e0";
const CARD_BG    = "#0d1e38";
const NAVY       = "#0a1628";
const NAVY_CARD2 = "#122444";

const STATUS_LABELS: Record<string, string> = {
  active: "アクティブ", inactive: "非アクティブ", suspended: "停止中",
  canceled: "解約済", pending: "審査中",
};
type StatusTheme = { dotColor: string; textColor: string };
const STATUS_THEME: Record<string, StatusTheme> = {
  active:    { dotColor: "#34d399", textColor: "#34d399" },
  inactive:  { dotColor: "#9ca3af", textColor: "#d1d5db" },
  suspended: { dotColor: "#f97316", textColor: "#f97316" },
  canceled:  { dotColor: "#f87171", textColor: "#f87171" },
  pending:   { dotColor: ORANGE,    textColor: ORANGE },
};
const MEMBER_TYPE_LABELS: Record<string, string> = {
  business: "ビジネス会員", favorite: "愛用会員",
};

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Row({ label, value, svgD }: { label: string; value: React.ReactNode; svgD?: string }) {
  return (
    <div className="flex items-start gap-3 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="w-32 shrink-0 flex items-center gap-1.5 pt-0.5">
        {svgD && (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: `${GOLD}60` }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={svgD} />
          </svg>
        )}
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      </div>
      <span className="text-sm break-all flex-1 font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
        {value ?? <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
      </span>
    </div>
  );
}

function Section({ title, svgD, children }: { title: string; svgD: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${GOLD}10` }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}15` }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: GOLD }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={svgD} />
          </svg>
        </div>
        <h2 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

type PositionInfo = {
  memberCode: string;
  status: string;
  currentLevel: number;
  contractDate: string | null;
  autoshipEnabled: boolean;
  currentMonthPoints: number;
  lastMonthPoints: number;
};
type PositionsData = {
  isMultiPosition: boolean;
  positionCount: number;
  positions: PositionInfo[];
  totalCurrentMonthPoints: number;
  totalLastMonthPoints: number;
};

const POS_STATUS_LABELS: Record<string, string> = {
  active: "稼働中", autoship: "オートシップ", suspended: "停止中",
  withdrawn: "退会", midCancel: "クーリングオフ",
};
const POS_STATUS_COLOR: Record<string, string> = {
  active: "#34d399", autoship: "#60a5fa", suspended: "#f97316",
  withdrawn: "#f87171", midCancel: "#a78bfa",
};

export default function MlmBusinessPage() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [posData, setPosData] = useState<PositionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/my/mlm-registration").then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      }),
      fetch("/api/my/mlm-positions").then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([regData, positions]) => {
        setData(regData);
        setPosData(positions);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const statusTheme = data ? (STATUS_THEME[data.business.status] ?? STATUS_THEME.inactive) : STATUS_THEME.inactive;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: 'rgba(245,240,232,0.96)', backdropFilter: 'blur(20px) saturate(160%)', borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.60)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h1 className="text-base font-semibold font-jp" style={{ color: NAVY }}>業務情報</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center" style={{ background: CARD_BG }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: `${GOLD}30`, borderTopColor: GOLD }}></div>
            <p className="text-sm" style={{ color: `${GOLD}70` }}>読み込み中...</p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-sm border border-red-500/20 bg-red-500/10 text-red-400">{error}</div>
        )}

        {data && (
          <>
            {/* レベルサマリー */}
            <div className="rounded-3xl overflow-hidden"
              style={{ background: "linear-gradient(150deg, #0d1e45, #162a56)", border: `1px solid ${GOLD}30` }}>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, ${ORANGE}, transparent)` }}></div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl p-3.5 text-center"
                    style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}>
                    <div className="text-[10px] mb-1" style={{ color: `${GOLD}70` }}>当月レベル</div>
                    <div className="text-xl font-black" style={{ color: GOLD }}>
                      {data.business.currentLevel > 0 ? `LV.${data.business.currentLevel}` : "—"}
                    </div>
                    <div className="text-[9px] mt-0.5 leading-tight" style={{ color: `${GOLD}50` }}>{LEVEL_LABELS[data.business.currentLevel] ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl p-3.5 text-center"
                    style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}25` }}>
                    <div className="text-[10px] mb-1" style={{ color: `${ORANGE}80` }}>称号</div>
                    <div className="text-xl font-black" style={{ color: ORANGE }}>
                      {data.business.titleLevel > 0 ? `LV.${data.business.titleLevel}` : "—"}
                    </div>
                    <div className="text-[9px] mt-0.5 leading-tight" style={{ color: `${ORANGE}60` }}>{LEVEL_LABELS[data.business.titleLevel] ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl p-3.5 text-center"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>ステータス</div>
                    <div className="text-sm font-black" style={{ color: statusTheme.textColor }}>
                      {STATUS_LABELS[data.business.status] ?? data.business.status}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{MEMBER_TYPE_LABELS[data.business.memberType] ?? ""}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ビジネスステータス */}
            <Section title="ビジネスステータス" svgD="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
              <Row label="ステータス"
                svgD="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                value={
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusTheme.dotColor }}></span>
                  <span style={{ color: statusTheme.textColor }}>{STATUS_LABELS[data.business.status] ?? data.business.status}</span>
                </span>
              } />
              <Row label="会員タイプ"
                svgD="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                value={MEMBER_TYPE_LABELS[data.business.memberType] ?? data.business.memberType} />
              <Row label="当月実績レベル"
                svgD="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                value={data.business.currentLevel > 0 ? `LV.${data.business.currentLevel}（${LEVEL_LABELS[data.business.currentLevel]}）` : null} />
              <Row label="称号レベル"
                svgD="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                value={data.business.titleLevel > 0 ? `LV.${data.business.titleLevel}（${LEVEL_LABELS[data.business.titleLevel]}）` : null} />
              {data.business.forceLevel !== null && (
                <Row label="強制レベル"
                  svgD="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  value={`LV.${data.business.forceLevel}（${LEVEL_LABELS[data.business.forceLevel ?? 0]}）`} />
              )}
              <Row label="条件達成"
                svgD="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                value={
                  data.business.conditionAchieved
                    ? <span style={{ color: "#34d399" }}>✓ 達成</span>
                    : <span style={{ color: "rgba(255,255,255,0.25)" }}>未達成</span>
                } />
              <Row label="強制アクティブ"
                svgD="M13 10V3L4 14h7v7l9-11h-7z"
                value={
                  <span className="text-xs font-medium" style={{ color: data.business.forceActive ? "#67e8f9" : "rgba(255,255,255,0.3)" }}>
                    {data.business.forceActive ? "有効" : "無効"}
                  </span>
                } />
              <Row label="貯金ポイント"
                svgD="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                value={
                  <span className="font-bold" style={{ color: GOLD_LIGHT }}>{data.business.savingsPoints.toLocaleString()} <span className="text-xs font-normal" style={{ color: `${GOLD}50` }}>pt</span></span>
                } />
              <Row label="支払方法"
                svgD="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                value={
                  data.business.paymentMethod === "credit_card" ? "クレジットカード"
                  : data.business.paymentMethod === "bank_transfer" ? "口座振替"
                  : data.business.paymentMethod
                } />
            </Section>

            {/* 日付情報 */}
            <Section title="日付情報" svgD="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
              <Row label="紹介者"
                svgD="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                value={data.business.referrerCode ? `${data.business.referrerCode}（${data.business.referrerName ?? ""}）` : null} />
              <Row label="契約日"
                svgD="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                value={fmtDate(data.business.contractDate)} />
              <Row label="登録日"
                svgD="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                value={fmtDate(data.business.createdAt)} />
              <Row label="最終ログイン"
                svgD="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                value={fmtDateTime(data.business.lastLoginAt)} />
              <Row label="最終更新"
                svgD="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                value={fmtDateTime(data.business.updatedAt)} />
            </Section>

            {/* オートシップ */}
            <Section title="オートシップ" svgD="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
              <Row label="オートシップ"
                svgD="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                value={
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: data.business.autoshipEnabled ? "#34d399" : "rgba(255,255,255,0.2)" }}></span>
                    <span style={{ color: data.business.autoshipEnabled ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                      {data.business.autoshipEnabled ? "有効" : "停止中"}
                    </span>
                  </span>
                } />
              {data.business.autoshipEnabled && (
                <>
                  <Row label="開始日"
                    svgD="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    value={fmtDate(data.business.autoshipStartDate)} />
                  <Row label="停止日"
                    svgD="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    value={fmtDate(data.business.autoshipStopDate)} />
                </>
              )}
            </Section>

            {/* 銀行口座 */}
            <Section title="銀行口座情報" svgD="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z">
              <Row label="預金種別"
                svgD="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                value={
                  data.bankAccount.accountType === "ordinary" ? "普通"
                  : data.bankAccount.accountType === "current" ? "当座"
                  : data.bankAccount.accountType
                } />
              <Row label="銀行名"    svgD="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"    value={data.bankAccount.bankName} />
              <Row label="銀行コード" svgD="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" value={data.bankAccount.bankCode} />
              <Row label="支店名"    svgD="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" value={data.bankAccount.branchName} />
              <Row label="支店コード" svgD="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" value={data.bankAccount.branchCode} />
              <Row label="口座番号"
                svgD="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                value={
                  data.bankAccount.accountNumber
                    ? <span className="font-mono tracking-widest">{"*".repeat(Math.max(0, data.bankAccount.accountNumber.length - 4))}{data.bankAccount.accountNumber.slice(-4)}</span>
                    : null
                } />
              <Row label="口座名義"  svgD="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"    value={data.bankAccount.accountHolder} />
            </Section>

            {/* 複数ポジション（2ポジション以上の場合のみ表示） */}
            {posData && posData.isMultiPosition && (
              <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}18` }}>
                <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${GOLD}10` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}15` }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: GOLD }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h2 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>
                    複数ポジション情報
                  </h2>
                  <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${GOLD}20`, color: GOLD }}>
                    {posData.positionCount}ポジション取得中
                  </span>
                </div>

                {/* 合計ポイント */}
                <div className="px-5 pt-4 pb-3">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}20` }}>
                      <div className="text-[10px] mb-1" style={{ color: `${GOLD}60` }}>今月合計ポイント</div>
                      <div className="text-lg font-black" style={{ color: GOLD_LIGHT }}>
                        {posData.totalCurrentMonthPoints.toLocaleString()}
                        <span className="text-xs font-normal ml-1" style={{ color: `${GOLD}50` }}>pt</span>
                      </div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>先月合計ポイント</div>
                      <div className="text-lg font-black" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {posData.totalLastMonthPoints.toLocaleString()}
                        <span className="text-xs font-normal ml-1" style={{ color: "rgba(255,255,255,0.25)" }}>pt</span>
                      </div>
                    </div>
                  </div>

                  {/* 各ポジション詳細 */}
                  <div className="space-y-2">
                    {posData.positions.map((pos, idx) => {
                      const statusColor = POS_STATUS_COLOR[pos.status] ?? "#9ca3af";
                      const statusLabel = POS_STATUS_LABELS[pos.status] ?? pos.status;
                      const isActive = pos.status === "active" || pos.status === "autoship";
                      return (
                        <div key={pos.memberCode} className="rounded-xl p-3.5"
                          style={{
                            background: isActive ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${isActive ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
                          }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md"
                                style={{ background: `${GOLD}15`, color: GOLD }}>
                                {`POS.${String(idx + 1).padStart(2, "0")}`}
                              </span>
                              <span className="text-sm font-mono font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                                {pos.memberCode}
                              </span>
                            </div>
                            <span className="flex items-center gap-1 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }}></span>
                              <span style={{ color: statusColor }}>{statusLabel}</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span style={{ color: "rgba(255,255,255,0.3)" }}>今月: </span>
                              <span className="font-bold" style={{ color: isActive ? GOLD_LIGHT : "rgba(255,255,255,0.5)" }}>
                                {pos.currentMonthPoints.toLocaleString()} pt
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "rgba(255,255,255,0.3)" }}>先月: </span>
                              <span style={{ color: "rgba(255,255,255,0.5)" }}>
                                {pos.lastMonthPoints.toLocaleString()} pt
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "rgba(255,255,255,0.3)" }}>オートシップ: </span>
                              <span style={{ color: pos.autoshipEnabled ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>
                                {pos.autoshipEnabled ? "有効" : "停止"}
                              </span>
                            </div>
                            {pos.contractDate && (
                              <div>
                                <span style={{ color: "rgba(255,255,255,0.3)" }}>契約: </span>
                                <span style={{ color: "rgba(255,255,255,0.5)" }}>
                                  {fmtDate(pos.contractDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
