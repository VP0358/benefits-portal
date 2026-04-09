"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RegistrationData = {
  registration: {
    memberCode: string;
    companyName: string | null;
    companyNameKana: string | null;
    name: string;
    nameKana: string | null;
    birthDate: string | null;
    gender: string | null;
    email: string;
    phone: string | null;
    mobile: string | null;
    postalCode: string | null;
    address: string | null;
    prefecture: string | null;
    city: string | null;
    address1: string | null;
    address2: string | null;
    referralCode: string | null;
  };
  business: {
    status: string;
    memberType: string;
    currentLevel: number;
    titleLevel: number;
    conditionAchieved: boolean;
    contractDate: string | null;
    referrerCode: string | null;
    referrerName: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    savingsPoints: number;
    paymentMethod: string;
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
      <span className="text-sm text-white/85 break-all flex-1 font-medium">
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

export default function MlmRegistrationPage() {
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
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 border-b border-white/5"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/50 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">戻る</span>
          </Link>
          <h1 className="text-base font-bold text-white ml-1">登録情報</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="rounded-2xl p-10 text-center text-white/30 text-sm" style={{ background: "#111827" }}>
            <div className="w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3"></div>
            読み込み中...
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-6 text-center text-red-400 text-sm border border-red-500/20 bg-red-500/10">{error}</div>
        )}

        {data && (
          <>
            {/* ステータスバナー */}
            <div className="rounded-2xl p-5 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #0d2b1f, #064e3b)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div>
                <p className="text-xs text-white/50 mb-1">ステータス</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[data.business.status] ?? "bg-slate-400"}`}></span>
                  <p className={`text-xl font-bold ${STATUS_TEXT[data.business.status] ?? "text-white"}`}>
                    {STATUS_LABELS[data.business.status] ?? data.business.status}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50 mb-1">会員ID</p>
                <p className="font-mono font-bold text-xl text-white">{data.registration.memberCode}</p>
              </div>
            </div>

            {/* 基本情報 */}
            <Section title="基本情報" icon="👤">
              <Row label="会員ID" value={<span className="font-bold font-mono text-emerald-400">{data.registration.memberCode}</span>} />
              <Row label="氏名" value={<span className="font-semibold text-white">{data.registration.name}</span>} />
              <Row label="フリガナ" value={data.registration.nameKana} />
              <Row label="法人名" value={data.registration.companyName} />
              <Row label="法人名カナ" value={data.registration.companyNameKana} />
              <Row label="生年月日" value={fmtDate(data.registration.birthDate)} />
              <Row label="性別" value={
                data.registration.gender === "male" ? "男性"
                : data.registration.gender === "female" ? "女性"
                : data.registration.gender
              } />
              <Row label="紹介コード" value={<span className="font-mono">{data.registration.referralCode}</span>} />
            </Section>

            {/* 連絡先 */}
            <Section title="連絡先" icon="📬">
              <Row label="メールアドレス" value={data.registration.email} />
              <Row label="電話番号" value={data.registration.phone} />
              <Row label="携帯電話" value={data.registration.mobile} />
            </Section>

            {/* 住所 */}
            <Section title="住所" icon="🏠">
              <Row label="郵便番号" value={data.registration.postalCode} />
              <Row label="都道府県" value={data.registration.prefecture} />
              <Row label="市区町村" value={data.registration.city} />
              <Row label="番地" value={data.registration.address1} />
              <Row label="建物名等" value={data.registration.address2} />
            </Section>

            {/* 業務概要 */}
            <Section title="業務概要" icon="💼">
              <Row label="会員タイプ" value={MEMBER_TYPE_LABELS[data.business.memberType] ?? data.business.memberType} />
              <Row label="ステータス" value={
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[data.business.status] ?? "bg-slate-400"}`}></span>
                  <span className={STATUS_TEXT[data.business.status] ?? "text-white/70"}>
                    {STATUS_LABELS[data.business.status] ?? data.business.status}
                  </span>
                </span>
              } />
              <Row label="現在レベル" value={data.business.currentLevel > 0 ? `LV.${data.business.currentLevel}` : null} />
              <Row label="称号レベル" value={data.business.titleLevel > 0 ? `👑 LV.${data.business.titleLevel}` : null} />
              <Row label="条件達成" value={
                data.business.conditionAchieved
                  ? <span className="text-emerald-400">✓ 達成</span>
                  : <span className="text-slate-500">未達成</span>
              } />
              <Row label="紹介者" value={data.business.referrerCode ? `${data.business.referrerCode}（${data.business.referrerName ?? ""}）` : null} />
              <Row label="契約日" value={fmtDate(data.business.contractDate)} />
              <Row label="登録日" value={fmtDate(data.business.createdAt)} />
              <Row label="最終ログイン" value={fmtDateTime(data.business.lastLoginAt)} />
              <Row label="貯金ポイント" value={
                <span className="font-bold text-amber-400">{data.business.savingsPoints.toLocaleString()} <span className="text-xs font-normal text-white/40">pt</span></span>
              } />
              <Row label="支払方法" value={
                data.business.paymentMethod === "credit_card" ? "クレジットカード"
                : data.business.paymentMethod === "bank_transfer" ? "口座振替"
                : data.business.paymentMethod
              } />
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
                  ? <span className="font-mono tracking-widest">{"*".repeat(Math.max(0, (data.bankAccount.accountNumber.length ?? 0) - 4))}{data.bankAccount.accountNumber.slice(-4)}</span>
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
