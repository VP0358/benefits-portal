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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span className="w-36 shrink-0 text-sm font-semibold pt-0.5" style={{ color: "rgba(255,255,255,0.60)" }}>{label}</span>
      <span className="text-base break-all flex-1 font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
        {value ?? <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>}
      </span>
    </div>
  );
}

function Section({ title, svgD, children }: { title: string; svgD: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${GOLD}22` }}>
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${GOLD}14` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${GOLD}18` }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            style={{ color: GOLD }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={svgD} />
          </svg>
        </div>
        <h2 className="text-base font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>{title}</h2>
      </div>
      <div className="px-5 py-1">{children}</div>
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

  const statusTheme = data ? (STATUS_THEME[data.business.status] ?? STATUS_THEME.inactive) : STATUS_THEME.inactive;

  return (
    <div className="min-h-screen pb-10" style={{ background: PAGE_BG }}>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20"
        style={{ background: 'rgba(245,240,232,0.96)', backdropFilter: 'blur(20px) saturate(160%)', borderBottom: `1px solid rgba(201,168,76,0.22)`, boxShadow: `0 2px 16px rgba(10,22,40,0.08),0 1px 0 rgba(255,255,255,0.80) inset` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 transition" style={{ color: "rgba(10,22,40,0.75)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-base font-semibold font-jp">戻る</span>
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              style={{ color: GOLD }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h1 className="text-lg font-bold font-jp" style={{ color: NAVY }}>登録情報</h1>
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
            {/* ステータスバナー */}
            <div className="rounded-3xl overflow-hidden"
              style={{ background: "linear-gradient(150deg, #0d1e45, #162a56)", border: `1px solid ${GOLD}35` }}>
              <div className="h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, ${ORANGE}, transparent)` }}></div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold mb-1.5" style={{ color: `${GOLD}80` }}>ステータス</p>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: statusTheme.dotColor }}></span>
                    <p className="text-2xl font-bold" style={{ color: statusTheme.textColor }}>
                      {STATUS_LABELS[data.business.status] ?? data.business.status}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold mb-1.5" style={{ color: `${GOLD}80` }}>会員ID</p>
                  <p className="font-mono font-bold text-2xl" style={{ color: GOLD_LIGHT }}>{data.registration.memberCode}</p>
                </div>
              </div>
            </div>

            {/* 基本情報 */}
            <Section title="基本情報" svgD="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
              <Row label="会員ID" value={<span className="font-bold font-mono" style={{ color: GOLD_LIGHT }}>{data.registration.memberCode}</span>} />
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
            <Section title="連絡先" svgD="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z">
              <Row label="メールアドレス" value={data.registration.email} />
              <Row label="電話番号" value={data.registration.phone} />
              <Row label="携帯電話" value={data.registration.mobile} />
            </Section>

            {/* 住所 */}
            <Section title="住所" svgD="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6">
              <Row label="郵便番号" value={data.registration.postalCode} />
              <Row label="都道府県" value={data.registration.prefecture} />
              <Row label="市区町村" value={data.registration.city} />
              <Row label="番地" value={data.registration.address1} />
              <Row label="建物名等" value={data.registration.address2} />
            </Section>

            {/* 業務概要 */}
            <Section title="業務概要" svgD="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
              <Row label="会員タイプ" value={MEMBER_TYPE_LABELS[data.business.memberType] ?? data.business.memberType} />
              <Row label="ステータス" value={
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusTheme.dotColor }}></span>
                  <span style={{ color: statusTheme.textColor }}>{STATUS_LABELS[data.business.status] ?? data.business.status}</span>
                </span>
              } />
              <Row label="現在レベル" value={data.business.currentLevel > 0 ? `LV.${data.business.currentLevel}` : null} />
              <Row label="称号レベル" value={data.business.titleLevel > 0 ? `LV.${data.business.titleLevel}` : null} />
              <Row label="条件達成" value={
                data.business.conditionAchieved
                  ? <span style={{ color: "#34d399" }}>✓ 達成</span>
                  : <span style={{ color: "rgba(255,255,255,0.25)" }}>未達成</span>
              } />
              <Row label="紹介者" value={data.business.referrerCode ? `${data.business.referrerCode}（${data.business.referrerName ?? ""}）` : null} />
              <Row label="契約日" value={fmtDate(data.business.contractDate)} />
              <Row label="登録日" value={fmtDate(data.business.createdAt)} />
              <Row label="最終ログイン" value={fmtDateTime(data.business.lastLoginAt)} />
              <Row label="貯金ボーナス（SAV）" value={
                <span className="inline-flex items-baseline gap-1">
                  <span className="text-xl font-extrabold" style={{ color: GOLD_LIGHT }}>{data.business.savingsPoints.toLocaleString()}</span>
                  <span className="text-sm font-semibold" style={{ color: GOLD }}>pt</span>
                </span>
              } />
              <Row label="支払方法" value={
                data.business.paymentMethod === "credit_card" ? "クレジットカード"
                : data.business.paymentMethod === "bank_transfer" ? "口座振替"
                : data.business.paymentMethod
              } />
            </Section>

            {/* 銀行口座 */}
            <Section title="銀行口座情報" svgD="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z">
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
