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
  active: "アクティブ",
  inactive: "非アクティブ",
  suspended: "停止中",
  canceled: "解約済",
  pending: "審査中",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  suspended: "bg-orange-100 text-orange-700",
  canceled: "bg-red-100 text-red-600",
  pending: "bg-blue-100 text-blue-700",
};
const MEMBER_TYPE_LABELS: Record<string, string> = {
  business: "ビジネス会員",
  favorite: "愛用会員",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start border-b border-slate-100 last:border-0 py-3 gap-3">
      <span className="w-36 shrink-0 text-xs text-slate-500 font-medium pt-0.5">{label}</span>
      <span className="text-sm text-slate-800 break-all flex-1">{value ?? <span className="text-slate-300">—</span>}</span>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
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
    <div className="min-h-screen bg-[#e6f2dc]">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-green-600 text-sm font-medium hover:text-green-700">← 戻る</Link>
          <h1 className="text-lg font-bold text-slate-800">👤 登録情報</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="bg-white rounded-2xl p-10 text-center text-slate-400 shadow-sm">読み込み中...</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm shadow-sm">{error}</div>
        )}

        {data && (
          <>
            {/* ステータスバナー */}
            <div className={`rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm ${
              data.business.status === "active" ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              <div>
                <div className="text-xs opacity-80">ステータス</div>
                <div className="font-bold text-lg">{STATUS_LABELS[data.business.status] ?? data.business.status}</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">会員ID</div>
                <div className="font-mono font-bold text-lg">{data.registration.memberCode}</div>
              </div>
            </div>

            {/* 基本情報 */}
            <Card title="基本情報" icon="👤">
              <Row label="会員ID" value={<span className="font-bold font-mono text-violet-700">{data.registration.memberCode}</span>} />
              <Row label="氏名" value={<span className="font-semibold">{data.registration.name}</span>} />
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
            </Card>

            {/* 連絡先 */}
            <Card title="連絡先" icon="📬">
              <Row label="メールアドレス" value={data.registration.email} />
              <Row label="電話番号" value={data.registration.phone} />
              <Row label="携帯電話" value={data.registration.mobile} />
            </Card>

            {/* 住所 */}
            <Card title="住所" icon="🏠">
              <Row label="郵便番号" value={data.registration.postalCode} />
              <Row label="都道府県" value={data.registration.prefecture} />
              <Row label="市区町村" value={data.registration.city} />
              <Row label="番地" value={data.registration.address1} />
              <Row label="建物名等" value={data.registration.address2} />
            </Card>

            {/* 業務概要 */}
            <Card title="業務概要" icon="💼">
              <Row label="会員タイプ" value={MEMBER_TYPE_LABELS[data.business.memberType] ?? data.business.memberType} />
              <Row label="ステータス" value={
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[data.business.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABELS[data.business.status] ?? data.business.status}
                </span>
              } />
              <Row label="現在レベル" value={data.business.currentLevel > 0 ? `LV.${data.business.currentLevel}` : "—"} />
              <Row label="称号レベル" value={data.business.titleLevel > 0 ? `👑 LV.${data.business.titleLevel}` : "—"} />
              <Row label="条件達成" value={data.business.conditionAchieved ? "✅ 達成" : "❌ 未達成"} />
              <Row label="紹介者" value={data.business.referrerCode ? `${data.business.referrerCode}（${data.business.referrerName ?? ""}）` : "—"} />
              <Row label="契約日" value={fmtDate(data.business.contractDate)} />
              <Row label="登録日" value={fmtDate(data.business.createdAt)} />
              <Row label="最終ログイン" value={fmtDateTime(data.business.lastLoginAt)} />
              <Row label="貯金ポイント" value={`${data.business.savingsPoints.toLocaleString()} pt`} />
              <Row label="支払方法" value={
                data.business.paymentMethod === "credit_card" ? "クレジットカード"
                : data.business.paymentMethod === "bank_transfer" ? "口座振替" : data.business.paymentMethod
              } />
            </Card>

            {/* 銀行口座 */}
            <Card title="銀行口座情報" icon="🏦">
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
                  ? <span className="font-mono">{"*".repeat(Math.max(0, (data.bankAccount.accountNumber.length ?? 0) - 4))}{data.bankAccount.accountNumber.slice(-4)}</span>
                  : null
              } />
              <Row label="口座名義" value={data.bankAccount.accountHolder} />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
