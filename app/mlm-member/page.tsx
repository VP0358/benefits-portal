"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   型定義
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

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

type BonusHistory = {
  bonusMonth: string;
  confirmedAt: string | null;
  isActive: boolean;
  selfPurchasePoints: number;
  groupPoints: number;
  directActiveCount: number;
  achievedLevel: number;
  achievedLevelLabel: string;
  previousTitleLevel: number;
  previousTitleLevelLabel: string;
  newTitleLevel: number;
  newTitleLevelLabel: string;
  directBonus: number;
  unilevelBonus: number;
  rankUpBonus: number;
  shareBonus: number;
  structureBonus: number;
  savingsBonus: number;
  carryoverAmount: number;
  adjustmentAmount: number;
  otherPositionAmount: number;
  totalBonus: number;
  amountBeforeAdjustment: number;
  paymentAdjustmentRate: number | null;
  paymentAdjustmentAmount: number;
  finalAmount: number;
  consumptionTax: number;
  withholdingTax: number;
  shortageAmount: number;
  otherPositionShortage: number;
  serviceFee: number;
  paymentAmount: number;
  groupActiveCount: number;
  minLinePoints: number;
  lineCount: number;
  level1Lines: number;
  level2Lines: number;
  level3Lines: number;
  conditions: string | null;
  savingsPoints: number;
  savingsPointsAdded: number;
  unilevelDetail: { depth: number; amount: number; rate: number }[];
};

type BonusData = {
  memberType: string;
  currentLevel: number;
  titleLevel: number;
  currentLevelLabel: string;
  titleLevelLabel: string;
  savingsPoints: number;
  history: BonusHistory[];
};

type Purchase = {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  points: number;
  totalPoints: number;
  purchaseStatus: string;
  purchaseMonth: string;
  purchasedAt: string;
  totalAmount: number;
};

type AutoshipOrder = {
  id: string;
  targetMonth: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  points: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

type AutoshipData = {
  autoshipEnabled: boolean;
  autoshipStartDate: string | null;
  autoshipStopDate: string | null;
  paymentMethod: string;
  suspendMonths: string[];
  orders: AutoshipOrder[];
};

type ReferralMember = {
  id: string;
  memberCode: string;
  name: string;
  memberType: string;
  status: string;
  currentLevel: number;
  titleLevel: number;
  contractDate: string | null;
  registeredAt: string;
  currentMonthAmount: number;
  currentMonthPoints: number;
  lastMonthAmount: number;
  lastMonthPoints: number;
  isActive: boolean;
};

type ReferrerListData = {
  totalCount: number;
  activeCount: number;
  favoriteCount: number;
  members: ReferralMember[];
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ユーティリティ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "クレジットカード",
  bank_transfer: "口座振替",
};
const AUTOSHIP_STATUS_LABELS: Record<string, string> = {
  pending: "未決済",
  paid: "決済完了",
  failed: "決済失敗",
  canceled: "キャンセル",
  delivered: "発送済み",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   小コンポーネント
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="w-36 shrink-0 text-xs text-slate-500 font-medium pt-0.5">{label}</span>
      <span className="text-sm text-slate-800 break-all">{value ?? "—"}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden mb-4">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">
      読み込み中...
    </div>
  );
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center shadow-sm">
      <div className="text-red-600 text-sm">{msg}</div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab1: 登録情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabRegistration() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-registration")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard msg={error} />;
  if (!data) return null;

  const { registration: r, business: b } = data;

  return (
    <div className="space-y-4">
      <SectionCard title="👤 基本情報">
        <InfoRow label="会員ID" value={<span className="font-bold text-violet-700">{r.memberCode}</span>} />
        <InfoRow label="氏名" value={r.name} />
        <InfoRow label="フリガナ" value={r.nameKana} />
        <InfoRow label="法人名" value={r.companyName} />
        <InfoRow label="法人名カナ" value={r.companyNameKana} />
        <InfoRow label="生年月日" value={fmtDate(r.birthDate)} />
        <InfoRow label="性別" value={r.gender === "male" ? "男性" : r.gender === "female" ? "女性" : r.gender} />
        <InfoRow label="紹介コード" value={r.referralCode} />
      </SectionCard>

      <SectionCard title="📬 連絡先">
        <InfoRow label="メールアドレス" value={r.email} />
        <InfoRow label="電話番号" value={r.phone} />
        <InfoRow label="携帯電話" value={r.mobile} />
      </SectionCard>

      <SectionCard title="🏠 住所">
        <InfoRow label="郵便番号" value={r.postalCode} />
        <InfoRow label="都道府県" value={r.prefecture} />
        <InfoRow label="市区町村" value={r.city} />
        <InfoRow label="番地" value={r.address1} />
        <InfoRow label="建物名等" value={r.address2} />
      </SectionCard>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab2: 業務情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabBusiness() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-registration")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard msg={error} />;
  if (!data) return null;

  const { business: b, bankAccount: bk } = data;

  return (
    <div className="space-y-4">
      <SectionCard title="💼 業務ステータス">
        <InfoRow
          label="ステータス"
          value={
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-600"}`}>
              {STATUS_LABELS[b.status] ?? b.status}
            </span>
          }
        />
        <InfoRow label="会員タイプ" value={MEMBER_TYPE_LABELS[b.memberType] ?? b.memberType} />
        <InfoRow label="現在レベル" value={b.currentLevel > 0 ? `LV.${b.currentLevel}` : "—"} />
        <InfoRow label="称号レベル" value={b.titleLevel > 0 ? `👑 LV.${b.titleLevel}` : "—"} />
        <InfoRow label="条件達成" value={b.conditionAchieved ? "✅ 達成" : "❌ 未達成"} />
        <InfoRow label="強制アクティブ" value={b.forceActive ? "有効" : "無効"} />
        {b.forceLevel !== null && (
          <InfoRow label="強制レベル" value={`LV.${b.forceLevel}`} />
        )}
        <InfoRow label="支払方法" value={PAYMENT_METHOD_LABELS[b.paymentMethod] ?? b.paymentMethod} />
        <InfoRow label="貯金ポイント" value={`${b.savingsPoints.toLocaleString()} pt`} />
      </SectionCard>

      <SectionCard title="📅 日付情報">
        <InfoRow label="紹介者ID" value={b.referrerCode ? `${b.referrerCode}（${b.referrerName ?? ""}）` : "—"} />
        <InfoRow label="契約日" value={fmtDate(b.contractDate)} />
        <InfoRow label="登録日" value={fmtDate(b.createdAt)} />
        <InfoRow label="最終ログイン" value={fmtDateTime(b.lastLoginAt)} />
        <InfoRow label="最終更新" value={fmtDateTime(b.updatedAt)} />
      </SectionCard>

      <SectionCard title="🔄 オートシップ">
        <InfoRow label="オートシップ" value={b.autoshipEnabled ? "✅ 有効" : "❌ 無効"} />
        {b.autoshipEnabled && (
          <>
            <InfoRow label="開始日" value={fmtDate(b.autoshipStartDate)} />
            <InfoRow label="停止日" value={fmtDate(b.autoshipStopDate)} />
          </>
        )}
      </SectionCard>

      <SectionCard title="🏦 銀行口座情報">
        <InfoRow label="預金種別" value={bk.accountType === "ordinary" ? "普通" : bk.accountType === "current" ? "当座" : bk.accountType} />
        <InfoRow label="銀行名" value={bk.bankName} />
        <InfoRow label="銀行コード" value={bk.bankCode} />
        <InfoRow label="支店名" value={bk.branchName} />
        <InfoRow label="支店コード" value={bk.branchCode} />
        <InfoRow
          label="口座番号"
          value={
            bk.accountNumber
              ? <span className="font-mono">{"*".repeat(Math.max(0, (bk.accountNumber?.length ?? 0) - 4))}{bk.accountNumber?.slice(-4)}</span>
              : "—"
          }
        />
        <InfoRow label="口座名義" value={bk.accountHolder} />
      </SectionCard>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab3: ボーナス履歴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function BonusRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 px-3 text-xs border-b border-slate-50 last:border-0 ${highlight ? "bg-violet-50 font-bold" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? "text-violet-700" : "text-slate-800"}>{value}</span>
    </div>
  );
}

function BonusDetailCard({ h, idx }: { h: BonusHistory; idx: number }) {
  const [open, setOpen] = useState(idx === 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm font-bold text-slate-800">{h.bonusMonth}</div>
            <div className={`text-xs mt-0.5 ${h.isActive ? "text-emerald-600" : "text-slate-400"}`}>
              {h.isActive ? "✅ アクティブ" : "❌ 非アクティブ"}
            </div>
          </div>
          {h.achievedLevel > 0 && (
            <span className="rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-xs px-2 py-0.5 font-bold">
              LV.{h.achievedLevel}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-base font-black text-slate-800">{yen(h.paymentAmount)}</div>
          <div className="text-xs text-slate-400">{open ? "▲" : "▼ 詳細"}</div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50">
          {/* ボーナス種別 */}
          <div className="px-3 pt-3 pb-1">
            <div className="text-xs font-bold text-slate-500 mb-1">💰 ボーナス種別</div>
            <div className="rounded-xl bg-white border border-slate-100 overflow-hidden">
              <BonusRow label="ダイレクトB" value={yen(h.directBonus)} />
              <BonusRow label="ユニレベルB" value={yen(h.unilevelBonus)} />
              <BonusRow label="ランクアップB" value={yen(h.rankUpBonus)} />
              <BonusRow label="シェアB" value={yen(h.shareBonus)} />
              <BonusRow label="組織構築B" value={yen(h.structureBonus)} />
              <BonusRow label="貯金B" value={yen(h.savingsBonus)} />
              <BonusRow label="繰越金" value={yen(h.carryoverAmount)} />
              <BonusRow label="調整金" value={yen(h.adjustmentAmount)} />
              <BonusRow label="他ポジション" value={yen(h.otherPositionAmount)} />
              <BonusRow label="総支払報酬" value={yen(h.totalBonus)} highlight />
            </div>
          </div>

          {/* 支払い計算 */}
          <div className="px-3 pt-2 pb-1">
            <div className="text-xs font-bold text-slate-500 mb-1">📊 支払い計算</div>
            <div className="rounded-xl bg-white border border-slate-100 overflow-hidden">
              <BonusRow label="支払調整前取得額" value={yen(h.amountBeforeAdjustment)} />
              <BonusRow label="支払調整率" value={h.paymentAdjustmentRate != null ? `${h.paymentAdjustmentRate}%` : "—"} />
              <BonusRow label="支払調整額" value={yen(h.paymentAdjustmentAmount)} />
              <BonusRow label="取得額（調整後）" value={yen(h.finalAmount)} />
              <BonusRow label="10%消費税（内税）" value={yen(h.consumptionTax)} />
              <BonusRow label="源泉所得税" value={yen(h.withholdingTax)} />
              <BonusRow label="過不足金" value={yen(h.shortageAmount)} />
              <BonusRow label="他ポジション過不足" value={yen(h.otherPositionShortage)} />
              <BonusRow label="事務手数料" value={yen(h.serviceFee)} />
              <BonusRow label="支払額" value={yen(h.paymentAmount)} highlight />
            </div>
          </div>

          {/* 組織データ */}
          <div className="px-3 pt-2 pb-3">
            <div className="text-xs font-bold text-slate-500 mb-1">🌳 組織データ</div>
            <div className="rounded-xl bg-white border border-slate-100 overflow-hidden">
              <BonusRow label="グループACT" value={h.groupActiveCount} />
              <BonusRow label="グループpt" value={`${h.groupPoints.toLocaleString()}pt`} />
              <BonusRow label="最小系列pt" value={`${h.minLinePoints.toLocaleString()}pt`} />
              <BonusRow label="系列数" value={h.lineCount} />
              <BonusRow label="LV.1系列数" value={h.level1Lines} />
              <BonusRow label="LV.2系列数" value={h.level2Lines} />
              <BonusRow label="LV.3系列数" value={h.level3Lines} />
              <BonusRow label="自己購入pt" value={`${h.selfPurchasePoints}pt`} />
              <BonusRow label="直紹介ACT" value={`${h.directActiveCount}名`} />
              <BonusRow label="旧レベル" value={h.previousTitleLevel > 0 ? `LV.${h.previousTitleLevel}` : "—"} />
              <BonusRow label="称号レベル" value={h.newTitleLevel > 0 ? `LV.${h.newTitleLevel}` : "—"} />
              <BonusRow label="当月判定レベル" value={h.achievedLevel > 0 ? `LV.${h.achievedLevel}` : "—"} />
              <BonusRow label="条件達成" value={h.conditions ?? "—"} />
              <BonusRow label="貯金pt" value={`${h.savingsPoints.toLocaleString()}pt (+${h.savingsPointsAdded})`} />
              <BonusRow label="アクティブ" value={h.isActive ? "○" : "—"} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBonus() {
  const [data, setData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-bonus-history")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard msg={error} />;
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* 現在ステータス */}
      <div className="rounded-2xl bg-white p-4 shadow-sm grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-3 text-center">
          <div className="text-xs text-violet-500 mb-1">当月実績レベル</div>
          <div className="text-xl font-black text-violet-700">
            {data.currentLevel > 0 ? `LV.${data.currentLevel}` : "—"}
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
          <div className="text-xs text-amber-500 mb-1">👑 称号レベル</div>
          <div className="text-xl font-black text-amber-700">
            {data.titleLevel > 0 ? `LV.${data.titleLevel}` : "—"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center col-span-2">
          <div className="text-xs text-slate-500 mb-1">🐖 貯金pt累計</div>
          <div className="text-xl font-black text-slate-700">
            {data.savingsPoints.toLocaleString()}<span className="text-sm font-normal">pt</span>
          </div>
        </div>
      </div>

      {/* ボーナス履歴 */}
      <div className="text-xs text-slate-500 px-1 font-semibold">ボーナス履歴（{data.history.length}件）</div>
      {data.history.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">ボーナス履歴がありません</div>
      ) : (
        data.history.map((h, i) => <BonusDetailCard key={h.bonusMonth} h={h} idx={i} />)
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab4: 購入履歴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabPurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-purchases")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then((d) => setPurchases(d.purchases ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard msg={error} />;

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-500 px-1 font-semibold">購入履歴（{purchases.length}件）</div>
      {purchases.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">購入履歴がありません</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-slate-500 whitespace-nowrap">注文日</th>
                  <th className="px-3 py-2 text-left text-slate-500">商品名</th>
                  <th className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">数量</th>
                  <th className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">金額</th>
                  <th className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">ポイント</th>
                  <th className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(p.purchasedAt)}</td>
                    <td className="px-3 py-2 text-slate-700">{p.productName}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{p.quantity}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{yen(p.totalAmount)}</td>
                    <td className="px-3 py-2 text-right text-violet-600">{p.totalPoints.toLocaleString()}pt</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full text-xs px-2 py-0.5 font-medium ${
                        p.purchaseStatus === "autoship"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {p.purchaseStatus === "autoship" ? "自動" : "通常"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-violet-50 border-t border-violet-100">
                  <td colSpan={3} className="px-3 py-2 text-xs font-bold text-violet-700">合計</td>
                  <td className="px-3 py-2 text-right text-xs font-black text-violet-700">
                    {yen(purchases.reduce((s, p) => s + p.totalAmount, 0))}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-black text-violet-700">
                    {purchases.reduce((s, p) => s + p.totalPoints, 0).toLocaleString()}pt
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab5: オートシップ一覧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabAutoship() {
  const [data, setData] = useState<AutoshipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-autoship")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard msg={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* 設定情報 */}
      <SectionCard title="🔄 オートシップ設定">
        <InfoRow
          label="オートシップ"
          value={
            <span className={`rounded-full text-xs px-2 py-0.5 font-bold ${data.autoshipEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {data.autoshipEnabled ? "✅ 有効" : "停止中"}
            </span>
          }
        />
        <InfoRow label="支払方法" value={PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod} />
        <InfoRow label="開始日" value={fmtDate(data.autoshipStartDate)} />
        <InfoRow label="停止日" value={fmtDate(data.autoshipStopDate)} />
        {data.suspendMonths.length > 0 && (
          <InfoRow label="一時停止月" value={data.suspendMonths.join("、")} />
        )}
      </SectionCard>

      {/* 注文履歴 */}
      <div className="text-xs text-slate-500 px-1 font-semibold">注文履歴（{data.orders.length}件）</div>
      {data.orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">注文履歴がありません</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-slate-500 whitespace-nowrap">対象月</th>
                  <th className="px-3 py-2 text-left text-slate-500">商品名</th>
                  <th className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">金額</th>
                  <th className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">ポイント</th>
                  <th className="px-3 py-2 text-left text-slate-500 whitespace-nowrap">決済日</th>
                  <th className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">状態</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap font-mono">{o.targetMonth}</td>
                    <td className="px-3 py-2 text-slate-700">{o.productName}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{yen(o.totalAmount)}</td>
                    <td className="px-3 py-2 text-right text-violet-600">{o.points}pt</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(o.paidAt)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full text-xs px-2 py-0.5 font-medium whitespace-nowrap ${
                        o.status === "paid" || o.status === "delivered"
                          ? "bg-emerald-100 text-emerald-700"
                          : o.status === "pending"
                          ? "bg-blue-100 text-blue-700"
                          : o.status === "failed"
                          ? "bg-red-100 text-red-600"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {AUTOSHIP_STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab6: 商品注文（リダイレクト）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabOrder() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm text-center space-y-4">
      <div className="text-4xl">🛍️</div>
      <h3 className="text-lg font-bold text-slate-800">商品注文</h3>
      <p className="text-sm text-slate-500">
        商品注文ページへ移動します。
      </p>
      <Link
        href="/orders/checkout"
        className="inline-block rounded-full bg-violet-600 text-white px-6 py-3 text-sm font-bold hover:bg-violet-700 transition"
      >
        注文ページへ →
      </Link>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tab7: 紹介者一覧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TabReferrerList() {
  const [data, setData] = useState<ReferrerListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/mlm-referrer-list")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "MLM会員情報がありません" : "取得失敗");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;
  if (error) return <ErrorCard msg={error} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "直紹介数", value: data.totalCount, color: "bg-violet-50 border-violet-200 text-violet-700" },
          { label: "Act（アクティブ）", value: data.activeCount, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "愛用会員", value: data.favoriteCount, color: "bg-amber-50 border-amber-200 text-amber-700" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-3 text-center ${s.color}`}>
            <div className="text-2xl font-black">{s.value}</div>
            <div className="text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* テーブル */}
      {data.members.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">紹介者がいません</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-slate-500 whitespace-nowrap">契約日</th>
                  <th className="px-3 py-2 text-left text-slate-500 whitespace-nowrap">会員ID</th>
                  <th className="px-3 py-2 text-left text-slate-500">氏名</th>
                  <th className="px-3 py-2 text-center text-slate-500">Act</th>
                  <th className="px-3 py-2 text-center text-slate-500">タイプ</th>
                  <th className="px-3 py-2 text-center text-slate-500">ステータス</th>
                  <th className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">当月pt</th>
                  <th className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">前月pt</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtDate(m.contractDate ?? m.registeredAt)}</td>
                    <td className="px-3 py-2 font-mono text-violet-700 whitespace-nowrap">{m.memberCode}</td>
                    <td className="px-3 py-2 text-slate-700">{m.name}</td>
                    <td className="px-3 py-2 text-center">
                      {m.isActive ? <span className="text-emerald-600 font-bold">○</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full text-xs px-1.5 py-0.5 ${
                        m.memberType === "business"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {MEMBER_TYPE_LABELS[m.memberType] ?? m.memberType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full text-xs px-1.5 py-0.5 ${STATUS_COLORS[m.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-violet-600 font-semibold">
                      {m.currentMonthPoints > 0 ? `${m.currentMonthPoints.toLocaleString()}pt` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {m.lastMonthPoints > 0 ? `${m.lastMonthPoints.toLocaleString()}pt` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   メインページ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type Tab = "registration" | "business" | "bonus" | "purchases" | "autoship" | "order" | "referrer-list";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "registration", label: "登録情報", icon: "👤" },
  { id: "business", label: "業務情報", icon: "💼" },
  { id: "bonus", label: "ボーナス", icon: "💰" },
  { id: "purchases", label: "購入履歴", icon: "📦" },
  { id: "autoship", label: "オートシップ", icon: "🔄" },
  { id: "order", label: "商品注文", icon: "🛍️" },
  { id: "referrer-list", label: "紹介者一覧", icon: "👥" },
];

export default function MlmMemberPage() {
  const [activeTab, setActiveTab] = useState<Tab>("registration");

  return (
    <div className="min-h-screen bg-[#e6f2dc] py-6 px-4">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
            ← ダッシュボード
          </Link>
        </div>

        <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🌿 MLM会員情報</h1>
          <p className="text-xs text-slate-500 mt-1">
            登録情報・業務情報・ボーナス・購入履歴・オートシップ・紹介者一覧を確認できます
          </p>
        </div>

        {/* タブナビ（横スクロール） */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-1 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === t.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* タブコンテンツ */}
        <div>
          {activeTab === "registration" && <TabRegistration />}
          {activeTab === "business" && <TabBusiness />}
          {activeTab === "bonus" && <TabBonus />}
          {activeTab === "purchases" && <TabPurchases />}
          {activeTab === "autoship" && <TabAutoship />}
          {activeTab === "order" && <TabOrder />}
          {activeTab === "referrer-list" && <TabReferrerList />}
        </div>
      </div>
    </div>
  );
}
