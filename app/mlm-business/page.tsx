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

const STATUS_LABELS: Record<string, string> = {
  active: "アクティブ", inactive: "非アクティブ", suspended: "停止中",
  canceled: "解約済", pending: "審査中",
};
const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-400", inactive: "bg-slate-400", suspended: "bg-orange-400",
  canceled: "bg-red-400", pending: "bg-blue-400 animate-pulse",
};
const STATUS_TEXT: Record<string, string> = {
  active: "text-emerald-300", inactive: "text-slate-300", suspended: "text-orange-300",
  canceled: "text-red-300", pending: "text-blue-300",
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-white/5 last:border-0">
      <span className="w-32 shrink-0 text-xs text-white/40 font-medium pt-0.5">{label}</span>
      <span className="text-sm text-white/80 break-all flex-1 font-medium">
        {value ?? <span className="text-white/20">—</span>}
      </span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-bold text-white/80">{title}</h2>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

export default function MlmBusinessPage() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-registration")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-10" style={{ background: "#0a0f1e" }}>
      <header className="sticky top-0 z-20 border-b border-white/5"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/50 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <h1 className="text-base font-bold text-white ml-1">業務情報</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-violet-400 rounded-full animate-spin mx-auto mb-3"></div>
            読み込み中...
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10">{error}</div>
        )}

        {data && (
          <>
            {/* レベルサマリー */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3.5 text-center border border-violet-400/20"
                style={{ background: "rgba(139,92,246,0.1)" }}>
                <div className="text-[10px] text-violet-400/70 mb-1">当月レベル</div>
                <div className="text-xl font-black text-violet-300">
                  {data.business.currentLevel > 0 ? `LV.${data.business.currentLevel}` : "—"}
                </div>
                <div className="text-[9px] text-violet-400/50 mt-0.5 leading-tight">{LEVEL_LABELS[data.business.currentLevel] ?? "—"}</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border border-amber-400/20"
                style={{ background: "rgba(245,158,11,0.1)" }}>
                <div className="text-[10px] text-amber-400/70 mb-1">👑 称号</div>
                <div className="text-xl font-black text-amber-300">
                  {data.business.titleLevel > 0 ? `LV.${data.business.titleLevel}` : "—"}
                </div>
                <div className="text-[9px] text-amber-400/50 mt-0.5 leading-tight">{LEVEL_LABELS[data.business.titleLevel] ?? "—"}</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center border border-white/8"
                style={{ background: "#111827" }}>
                <div className="text-[10px] text-white/40 mb-1">ステータス</div>
                <div className={`text-sm font-black ${STATUS_TEXT[data.business.status] ?? "text-white/60"}`}>
                  {STATUS_LABELS[data.business.status] ?? data.business.status}
                </div>
                <div className="text-[9px] text-white/25 mt-0.5">{MEMBER_TYPE_LABELS[data.business.memberType] ?? ""}</div>
              </div>
            </div>

            {/* ビジネスステータス */}
            <Section title="ビジネスステータス" icon="📊">
              <Row label="ステータス" value={
                <span className={`flex items-center gap-1.5 ${STATUS_TEXT[data.business.status] ?? "text-white/60"}`}>
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[data.business.status] ?? "bg-slate-400"}`}></span>
                  {STATUS_LABELS[data.business.status] ?? data.business.status}
                </span>
              } />
              <Row label="会員タイプ" value={MEMBER_TYPE_LABELS[data.business.memberType] ?? data.business.memberType} />
              <Row label="当月実績レベル" value={data.business.currentLevel > 0 ? `LV.${data.business.currentLevel}（${LEVEL_LABELS[data.business.currentLevel]}）` : null} />
              <Row label="称号レベル" value={data.business.titleLevel > 0 ? `LV.${data.business.titleLevel}（${LEVEL_LABELS[data.business.titleLevel]}）` : null} />
              {data.business.forceLevel !== null && (
                <Row label="強制レベル" value={`LV.${data.business.forceLevel}（${LEVEL_LABELS[data.business.forceLevel ?? 0]}）`} />
              )}
              <Row label="条件達成" value={
                data.business.conditionAchieved
                  ? <span className="text-emerald-400">✓ 達成</span>
                  : <span className="text-white/25">未達成</span>
              } />
              <Row label="強制アクティブ" value={
                <span className={`text-xs font-medium ${data.business.forceActive ? "text-cyan-300" : "text-white/30"}`}>
                  {data.business.forceActive ? "有効" : "無効"}
                </span>
              } />
              <Row label="貯金ポイント" value={
                <span className="font-bold text-amber-400">{data.business.savingsPoints.toLocaleString()} <span className="text-xs font-normal text-white/40">pt</span></span>
              } />
              <Row label="支払方法" value={
                data.business.paymentMethod === "credit_card" ? "クレジットカード"
                : data.business.paymentMethod === "bank_transfer" ? "口座振替"
                : data.business.paymentMethod
              } />
            </Section>

            {/* 日付情報 */}
            <Section title="日付情報" icon="📅">
              <Row label="紹介者" value={data.business.referrerCode ? `${data.business.referrerCode}（${data.business.referrerName ?? ""}）` : null} />
              <Row label="契約日" value={fmtDate(data.business.contractDate)} />
              <Row label="登録日" value={fmtDate(data.business.createdAt)} />
              <Row label="最終ログイン" value={fmtDateTime(data.business.lastLoginAt)} />
              <Row label="最終更新" value={fmtDateTime(data.business.updatedAt)} />
            </Section>

            {/* オートシップ */}
            <Section title="オートシップ" icon="🔄">
              <Row label="オートシップ" value={
                <span className={`flex items-center gap-1.5 text-xs font-medium ${data.business.autoshipEnabled ? "text-emerald-300" : "text-white/30"}`}>
                  <span className={`w-2 h-2 rounded-full ${data.business.autoshipEnabled ? "bg-emerald-400" : "bg-slate-600"}`}></span>
                  {data.business.autoshipEnabled ? "有効" : "停止中"}
                </span>
              } />
              {data.business.autoshipEnabled && (
                <>
                  <Row label="開始日" value={fmtDate(data.business.autoshipStartDate)} />
                  <Row label="停止日" value={fmtDate(data.business.autoshipStopDate)} />
                </>
              )}
            </Section>

            {/* 銀行口座 */}
            <Section title="銀行口座情報" icon="🏦">
              <Row label="預金種別" value={
                data.bankAccount.accountType === "ordinary" ? "普通"
                : data.bankAccount.accountType === "current" ? "当座"
                : data.bankAccount.accountType
              } />
              <Row label="銀行名" value={data.bankAccount.bankName} />
              <Row label="銀行コード" value={data.bankAccount.bankCode} />
              <Row label="支店名" value={data.bankAccount.branchName} />
              <Row label="支店コード" value={data.bankAccount.branchCode} />
              <Row label="口座番号" value={
                data.bankAccount.accountNumber
                  ? <span className="font-mono tracking-widest">{"*".repeat(Math.max(0, data.bankAccount.accountNumber.length - 4))}{data.bankAccount.accountNumber.slice(-4)}</span>
                  : null
              } />
              <Row label="口座名義" value={data.bankAccount.accountHolder} />
            </Section>
          </>
        )}
      </main>
    </div>
  );
}
