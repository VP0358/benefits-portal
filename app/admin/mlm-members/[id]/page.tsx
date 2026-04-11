"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PurchasePanel from "./ui/purchase-panel";
import OrganizationChart from "./ui/organization-chart";

// ─── 型定義 ─────────────────────────────────────────
type MemberDetail = {
  id: string;
  memberCode: string;
  memberType: string;
  status: string;
  currentLevel: number;
  titleLevel: number;
  conditionAchieved: boolean;
  forceActive: boolean;
  forceLevel: number | null;
  contractDate: string | null;
  firstPayDate: string | null;
  creditCardId: string | null;
  autoshipEnabled: boolean;
  autoshipStartDate: string | null;
  autoshipStopDate: string | null;
  autoshipSuspendMonths: string | null;
  paymentMethod: string;
  savingsPoints: number;
  bankCode: string | null;
  bankName: string | null;
  branchCode: string | null;
  branchName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  companyName: string | null;
  companyNameKana: string | null;
  birthDate: string | null;
  gender: string | null;
  mobile: string | null;
  prefecture: string | null;
  city: string | null;
  address1: string | null;
  address2: string | null;
  note: string | null;
  user: {
    id: string;
    name: string;
    nameKana: string | null;
    email: string;
    phone: string | null;
    postalCode: string | null;
    address: string | null;
    pointWallet: {
      autoPointsBalance: number;
      manualPointsBalance: number;
      externalPointsBalance: number;
      availablePointsBalance: number;
    } | null;
    mlmRegistration: {
      disclosureDocNumber: string | null;
      bankName: string | null;
      bankBranch: string | null;
      bankAccountType: string | null;
      bankAccountNumber: string | null;
      bankAccountHolder: string | null;
      deliveryPostalCode: string | null;
      deliveryAddress: string | null;
      deliveryName: string | null;
      deliveryPhone: string | null;
    } | null;
  };
  referrer: { id: string; memberCode: string; user: { name: string }; companyName: string | null } | null;
  upline: { id: string; memberCode: string; user: { name: string }; companyName: string | null } | null;
  downlines: { id: string; memberCode: string; currentLevel: number; status: string; user: { name: string }; companyName: string | null }[];
  // 初回パスワード（新規登録直後のみ）
  initialPassword?: string;
};

// ─── 定数 ───────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  active: "活動中", autoship: "オートシップ", lapsed: "失効",
  suspended: "停止", withdrawn: "退会", midCancel: "中途解約",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700", autoship: "bg-blue-100 text-blue-700",
  lapsed: "bg-red-100 text-red-700", suspended: "bg-orange-100 text-orange-700",
  withdrawn: "bg-slate-100 text-slate-500", midCancel: "bg-slate-100 text-slate-400",
};
const LEVEL_LABELS: Record<number, string> = {
  0: "なし", 1: "LV.1", 2: "LV.2", 3: "LV.3", 4: "LV.4", 5: "LV.5",
};
const MEMBER_TYPE_LABEL: Record<string, string> = {
  business: "ビジネス会員", preferred: "愛用会員", consumer: "愛用会員",
};
const PAYMENT_LABEL: Record<string, string> = {
  credit_card: "クレジットカード（クレディックス）",
  bank_transfer: "口座振替（三菱UFJファクター）",
  bank_payment: "銀行振込",
};

// ─── ヘルパー ────────────────────────────────────────
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("ja-JP"); } catch { return s; }
}
function displayName(m: { user: { name: string }; companyName: string | null } | null) {
  if (!m) return "—";
  return m.companyName || m.user.name || "—";
}
function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-500 text-sm shrink-0 min-w-[140px]">{label}:</span>
      <span className={`text-sm font-medium text-slate-800 text-right ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}
function SectionHeader({ title, icon, onEdit }: { title: string; icon: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4 border-b pb-2">
      <h2 className="text-base font-bold text-slate-800">
        <i className={`${icon} mr-2 text-slate-600`}></i>{title}
      </h2>
      {onEdit && (
        <button onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition">
          <i className="fas fa-pen text-[10px]"></i> 編集
        </button>
      )}
    </div>
  );
}

// ─── 編集モーダル共通 ────────────────────────────────
function EditModal({ title, onClose, onSave, saving, children }: {
  title: string; onClose: () => void; onSave: () => void;
  saving: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-auto"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">{children}</div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onSave} disabled={saving}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition">
            {saving ? "保存中..." : "保存する"}
          </button>
          <button onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {required && <span className="text-red-500 mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  );
}
const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300";
const selectCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white";

// ─── メインページ ────────────────────────────────────
export default function MlmMemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // 初期パスワード表示（新規登録直後のみ）
  const [initialPassword, setInitialPassword] = useState<string | null>(null);

  // ボーナス明細タブ
  const [bonusStatements, setBonusStatements] = useState<Array<{
    bonusMonth: string;
    paymentAmount: number;
    directBonus: number;
    unilevelBonus: number;
    structureBonus: number;
    savingsBonus: number;
    adjustmentAmount: number;
    withholdingTax: number;
    carryoverAmount: number;
    isPublished: boolean;
    note: string | null;
  }>>([]);
  const [bonusStatementsLoading, setBonusStatementsLoading] = useState(false);
  const [publishingMonth, setPublishingMonth] = useState<string | null>(null);

  // モーダル管理
  const [editSection, setEditSection] = useState<
    "basic" | "registration" | "bank" | "level" | "autoship" | "bonusStatement" | null
  >(null);

  // 編集フォームの一時データ
  const [editData, setEditData] = useState<Record<string, string | boolean | number | null>>({});

  const fetchMember = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mlm-members/${memberId}`);
      if (res.ok) {
        const data = await res.json();
        setMember(data);
        // 初期パスワードがレスポンスに含まれていれば保持
        if (data.initialPassword) {
          setInitialPassword(data.initialPassword);
        }
      } else {
        setErrorMsg("会員情報の取得に失敗しました");
      }
    } catch { setErrorMsg("通信エラー"); }
    setLoading(false);
  }, [memberId]);

  // セッションストレージから初期パスワードを取得
  useEffect(() => {
    const key = `mlm_init_pw_${memberId}`;
    const pw = sessionStorage.getItem(key);
    if (pw) {
      setInitialPassword(pw);
    }
    fetchMember();
  }, [fetchMember, memberId]);

  // member取得後にボーナス明細を自動読み込み
  useEffect(() => {
    if (member) {
      fetchBonusStatements();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member?.memberCode]);

  // ボーナス明細データ取得
  const fetchBonusStatements = useCallback(async () => {
    if (!member) return;
    setBonusStatementsLoading(true);
    try {
      const res = await fetch(`/api/admin/bonus-results/member-statements?memberCode=${member.memberCode}`);
      if (res.ok) {
        const data = await res.json();
        setBonusStatements(data.statements || []);
      }
    } catch (e) {
      console.error("Failed to fetch bonus statements:", e);
    }
    setBonusStatementsLoading(false);
  }, [member]);

  // ボーナス明細公開/非公開切替
  const handleTogglePublish = async (bonusMonth: string, currentlyPublished: boolean) => {
    setPublishingMonth(bonusMonth);
    try {
      const res = await fetch("/api/admin/bonus-results/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode: member?.memberCode,
          bonusMonth,
          isPublished: !currentlyPublished,
        }),
      });
      if (res.ok) {
        await fetchBonusStatements();
      } else {
        const data = await res.json();
        alert(`❌ エラー: ${data.error}`);
      }
    } catch {
      alert("❌ エラーが発生しました");
    } finally {
      setPublishingMonth(null);
    }
  };

  // ボーナス明細PDF（HTML）を新タブで表示
  const handleDownloadBonusStatementPDF = async (bonusMonth: string) => {
    try {
      // APIはHTMLを返すのでwindow.openで直接表示
      const url = `/api/admin/bonus-reports/statement-pdf?bonusMonth=${bonusMonth}&memberCode=${member?.memberCode}`;
      const win = window.open(url, "_blank");
      if (!win) {
        alert("ポップアップがブロックされました。ブラウザの設定で許可してください。");
      }
    } catch {
      alert("❌ エラーが発生しました");
    }
  };

  // 登録完了通知書を新タブで表示（印刷→PDF保存で日本語正常表示）
  const handlePrintRegistrationNotice = () => {
    if (!member) return;
    const url = `/api/admin/pdf/registration-complete?memberId=${member.id}`;
    const win = window.open(url, "_blank");
    if (!win) {
      alert("ポップアップがブロックされました。ブラウザの設定で許可してください。");
    }
  };

  // 編集モーダルを開く
  const openEdit = (section: typeof editSection) => {
    if (!member) return;
    const m = member;
    const r = m.user.mlmRegistration;
    const d: Record<string, string | boolean | number | null> = {};

    if (section === "basic") {
      Object.assign(d, {
        name: m.user.name, nameKana: m.user.nameKana ?? "",
        disclosureDocNumber: r?.disclosureDocNumber ?? "",
        email: m.user.email, phone: m.user.phone ?? "",
        mobile: m.mobile ?? "", companyName: m.companyName ?? "",
        companyNameKana: m.companyNameKana ?? "",
        birthDate: m.birthDate ? m.birthDate.slice(0, 10) : "",
        gender: m.gender ?? "",
        postalCode: m.user.postalCode ?? "",
        prefecture: m.prefecture ?? "", city: m.city ?? "",
        address1: m.address1 ?? "", address2: m.address2 ?? "",
        memberType: m.memberType, status: m.status,
        contractDate: m.contractDate ? m.contractDate.slice(0, 10) : "",
        firstPayDate: m.firstPayDate ? m.firstPayDate.slice(0, 10) : "",
        creditCardId: m.creditCardId ?? "",
        note: m.note ?? "", newPassword: "",
      });
    } else if (section === "registration") {
      // 配送先未設定の場合は基本情報からフォールバック
      const fallbackPostal = m.user.postalCode ?? "";
      const fallbackAddress = [m.prefecture, m.city, m.address1, m.address2].filter(Boolean).join(" ");
      const fallbackName = m.companyName || m.user.name || "";
      const fallbackPhone = m.mobile || m.user.phone || "";
      Object.assign(d, {
        deliveryPostalCode: r?.deliveryPostalCode || fallbackPostal,
        deliveryAddress: r?.deliveryAddress || fallbackAddress,
        deliveryName: r?.deliveryName || fallbackName,
        deliveryPhone: r?.deliveryPhone || fallbackPhone,
      });
    } else if (section === "bank") {
      Object.assign(d, {
        bankCode: m.bankCode ?? "", bankName: m.bankName ?? "",
        branchCode: m.branchCode ?? "", branchName: m.branchName ?? "",
        accountType: m.accountType ?? "普通",
        accountNumber: m.accountNumber ?? "",
        accountHolder: m.accountHolder ?? "",
        // MlmRegistration の銀行（引き落とし先）
        regBankName: r?.bankName ?? "", regBankBranch: r?.bankBranch ?? "",
        regAccountType: r?.bankAccountType ?? "普通",
        regAccountNumber: r?.bankAccountNumber ?? "",
        regAccountHolder: r?.bankAccountHolder ?? "",
      });
    } else if (section === "level") {
      Object.assign(d, {
        currentLevel: m.currentLevel, titleLevel: m.titleLevel,
        conditionAchieved: m.conditionAchieved, forceActive: m.forceActive,
        forceLevel: m.forceLevel ?? "",
      });
    } else if (section === "autoship") {
      Object.assign(d, {
        autoshipEnabled: m.autoshipEnabled,
        autoshipStartDate: m.autoshipStartDate ? m.autoshipStartDate.slice(0, 10) : "",
        autoshipStopDate: m.autoshipStopDate ? m.autoshipStopDate.slice(0, 10) : "",
        autoshipSuspendMonths: m.autoshipSuspendMonths ?? "",
        paymentMethod: m.paymentMethod,
      });
    }
    setEditData(d);
    setEditSection(section);
  };

  const handleSave = async () => {
    if (!editSection) return;
    setSaving(true);
    try {
      // bank は basic + registration に分けて送信
      let payload: Record<string, unknown> = { section: editSection, ...editData };

      if (editSection === "bank") {
        // 報酬振込先 (MlmMember.bank*)
        await fetch(`/api/admin/mlm-members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "bank",
            bankCode: editData.bankCode, bankName: editData.bankName,
            branchCode: editData.branchCode, branchName: editData.branchName,
            accountType: editData.accountType,
            accountNumber: editData.accountNumber,
            accountHolder: editData.accountHolder,
          }),
        });
        // 引き落とし先 (MlmRegistration.bank*)
        await fetch(`/api/admin/mlm-members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "registration",
            bankName: editData.regBankName,
            bankBranch: editData.regBankBranch,
            bankAccountType: editData.regAccountType,
            bankAccountNumber: editData.regAccountNumber,
            bankAccountHolder: editData.regAccountHolder,
          }),
        });
        await fetchMember();
        setEditSection(null);
        setSaving(false);
        return;
      }

      // basic セクション保存時は disclosureDocNumber も registration として別途保存
      if (editSection === "basic" && editData.disclosureDocNumber !== undefined) {
        await fetch(`/api/admin/mlm-members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "registration",
            disclosureDocNumber: editData.disclosureDocNumber,
          }),
        });
      }

      const res = await fetch(`/api/admin/mlm-members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchMember();
        setEditSection(null);
      } else {
        const err = await res.json();
        alert(err.error ?? "保存に失敗しました");
      }
    } catch { alert("通信エラーが発生しました"); }
    setSaving(false);
  };

  const set = (key: string, value: string | boolean | number | null) =>
    setEditData(d => ({ ...d, [key]: value }));

  // ─── ローディング ─────────────────────────────────
  if (loading) {
    return (
      <main className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-slate-500">
          <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          読み込み中...
        </div>
      </main>
    );
  }
  if (errorMsg || !member) {
    return (
      <main className="py-10 text-center text-red-500">{errorMsg ?? "会員が見つかりません"}</main>
    );
  }

  const m = member;
  const r = m.user.mlmRegistration;
  const dispName = m.companyName || m.user.name;

  return (
    <main className="space-y-6 pb-12">
      {/* ─── ヘッダー ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/mlm-members"
            className="text-sm text-blue-600 hover:text-blue-700 mb-1 inline-flex items-center gap-1">
            ← MLM会員一覧
          </Link>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">MLM会員詳細</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {m.memberCode} ／ {dispName}
          </p>
        </div>
        <button onClick={() => router.back()}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition">
          ← 戻る
        </button>
      </div>

      {/* ─── 初期パスワード表示バナー（新規登録直後のみ） ─── */}
      {initialPassword && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-amber-500 text-xl mt-0.5">🔑</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800 mb-1">マイページ初期ログインパスワード</p>
            <p className="text-xs text-amber-700 mb-2">
              このパスワードは登録完了通知書に記載されます。画面を離れると再表示できません。
            </p>
            <div className="flex items-center gap-3">
              <code className="bg-white border border-amber-200 rounded-lg px-4 py-2 text-lg font-bold font-mono text-amber-900 tracking-widest">
                {initialPassword}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(initialPassword);
                  alert("コピーしました");
                }}
                className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition"
              >
                コピー
              </button>
              <button
                onClick={handlePrintRegistrationNotice}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
              >
                📄 登録完了通知書
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem(`mlm_init_pw_${memberId}`);
                  setInitialPassword(null);
                }}
                className="px-3 py-1.5 border border-amber-300 text-amber-700 text-xs rounded-lg hover:bg-amber-100 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 基本情報 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="基本情報" icon="fas fa-id-card" onEdit={() => openEdit("basic")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
          <div>
            <InfoRow label="会員コード"    value={<span className="font-mono">{m.memberCode}</span>} />
            <InfoRow label="氏名"          value={m.user.name} />
            <InfoRow label="フリガナ"      value={m.user.nameKana} />
            <InfoRow label="法人名"        value={m.companyName} />
            <InfoRow label="法人名（カナ）" value={m.companyNameKana} />
            <InfoRow label="生年月日"      value={fmtDate(m.birthDate)} />
            <InfoRow label="性別"          value={m.gender === "male" ? "男性" : m.gender === "female" ? "女性" : m.gender === "other" ? "その他" : null} />
          </div>
          <div>
            <InfoRow label="概要書面番号" value={r?.disclosureDocNumber} />
            <InfoRow label="メールアドレス" value={m.user.email} />
            <InfoRow label="電話番号"       value={m.user.phone} />
            <InfoRow label="携帯電話"       value={m.mobile} />
            <InfoRow label="郵便番号"       value={m.user.postalCode} />
            <InfoRow label="住所"           value={[m.prefecture, m.city, m.address1, m.address2].filter(Boolean).join(" ")} />
            <InfoRow label="マイページパスワード" value={
              <span className="text-slate-400 text-xs">（セキュリティのため非表示）</span>
            } />
          </div>
          <div className="md:col-span-2 mt-2">
            <InfoRow label="会員区分"         value={MEMBER_TYPE_LABEL[m.memberType] ?? m.memberType} />
            <InfoRow label="ステータス"       value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[m.status] ?? ""}`}>
                {STATUS_LABEL[m.status] ?? m.status}
              </span>
            } />
            <InfoRow label="契約締結日"       value={fmtDate(m.contractDate)} />
            <InfoRow label="初回入金日"       value={fmtDate(m.firstPayDate)} />
            <InfoRow label="クレジット決済ID" value={m.creditCardId ? <span className="font-mono text-xs">{m.creditCardId}</span> : null} />
            <InfoRow label="備考"             value={m.note} />
          </div>
        </div>
        {/* 登録完了通知書ボタン */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
          <button
            onClick={handlePrintRegistrationNotice}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-300 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition"
          >
            <i className="fas fa-file-alt text-[11px]"></i> 登録完了通知書
          </button>
        </div>
      </section>

      {/* ─── 配送先住所 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="配送先住所" icon="fas fa-truck" onEdit={() => openEdit("registration")} />
        {/* 配送先未設定の場合は基本情報からフォールバック表示 */}
        {(() => {
          const hasDelivery = r?.deliveryPostalCode || r?.deliveryAddress;
          const dispPostal  = r?.deliveryPostalCode || m.user.postalCode;
          const dispAddress = r?.deliveryAddress    || [m.prefecture, m.city, m.address1, m.address2].filter(Boolean).join(" ");
          const dispName    = r?.deliveryName       || m.companyName || m.user.name;
          const dispPhone   = r?.deliveryPhone || m.mobile || m.user.phone;
          return (
            <>
              {!hasDelivery && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mb-3">
                  ※ 配送先住所が未設定のため、基本情報の住所を表示しています
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <InfoRow label="配送先郵便番号" value={dispPostal} />
                  <InfoRow label="配送先住所"     value={dispAddress} />
                </div>
                <div>
                  <InfoRow label="配送先名義"     value={dispName} />
                  <InfoRow label="配送先電話番号" value={dispPhone} />
                </div>
              </div>
            </>
          );
        })()}
      </section>

      {/* ─── 銀行口座情報 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="銀行口座情報" icon="fas fa-university" onEdit={() => openEdit("bank")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
          <div>
            <p className="text-xs font-bold text-violet-700 mb-2 mt-1">📥 報酬振込先口座</p>
            <InfoRow label="銀行コード" value={m.bankCode} mono />
            <InfoRow label="銀行名"     value={m.bankName} />
            <InfoRow label="支店コード" value={m.branchCode} mono />
            <InfoRow label="支店名"     value={m.branchName} />
            <InfoRow label="口座種別"   value={m.accountType} />
            <InfoRow label="口座番号"   value={m.accountNumber} mono />
            <InfoRow label="口座名義"   value={m.accountHolder} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 mb-2 mt-1">💳 引き落とし先口座（クレジット/振替）</p>
            <InfoRow label="銀行名"   value={r?.bankName} />
            <InfoRow label="支店名"   value={r?.bankBranch} />
            <InfoRow label="口座種別" value={r?.bankAccountType} />
            <InfoRow label="口座番号" value={r?.bankAccountNumber} mono />
            <InfoRow label="口座名義" value={r?.bankAccountHolder} />
          </div>
        </div>
      </section>

      {/* ─── レベル情報 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="レベル情報（レベル＝タイトル）" icon="fas fa-chart-line" onEdit={() => openEdit("level")} />

        {/* 概念説明 */}
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
          <p className="font-bold text-sm text-blue-700 mb-1">📌 レベル＝タイトル の概念</p>
          <p>• <strong>レベル（＝タイトル）</strong>: 現在の称号・ランクを示します。レベルとタイトルは同一概念です。</p>
          <p>• <strong>強制アクティブ</strong>: 有効時、条件達成（達成）となった場合に自動でアクティブ扱いになります。</p>
          <p>• <strong>強制タイトル＝レベル</strong>: 有効時、該当タイトル（レベル）の達成条件が自動で満たされたと判定されます。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="現在レベル（タイトル）" value={<span className="font-bold text-blue-600 text-base">{LEVEL_LABELS[m.currentLevel] ?? m.currentLevel}</span>} />
            <InfoRow label="称号レベル" value={LEVEL_LABELS[m.titleLevel] ?? m.titleLevel} />
            <InfoRow label="強制レベル" value={m.forceLevel !== null ? LEVEL_LABELS[m.forceLevel ?? 0] : "—"} />
          </div>
          <div>
            <InfoRow label="条件達成" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.conditionAchieved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {m.conditionAchieved ? "✅ 達成" : "未達成"}
              </span>
            } />
            <InfoRow label="強制アクティブ" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.forceActive ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                {m.forceActive ? "🔥 有効（条件達成でアクティブ）" : "無効"}
              </span>
            } />
            <InfoRow label="強制タイトル＝レベル" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.forceLevel !== null ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-600"}`}>
                {m.forceLevel !== null ? `🏅 有効（${LEVEL_LABELS[m.forceLevel ?? 0]}相当で自動判定）` : "無効"}
              </span>
            } />
          </div>
        </div>

        {/* 強制アクティブ+強制タイトル=レベル の組み合わせ説明 */}
        {m.forceActive && m.forceLevel !== null && (
          <div className="mt-3 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-800">
            <i className="fas fa-info-circle mr-1"></i>
            <strong>現在の設定：</strong>
            強制アクティブ＋強制タイトル＝レベル（{LEVEL_LABELS[m.forceLevel ?? 0]}）が有効です。
            {LEVEL_LABELS[m.forceLevel ?? 0]}の達成条件を満たしたと判定され、条件達成時に自動でアクティブになります。
          </div>
        )}
      </section>

      {/* ─── 継続購入設定（旧オートシップ） ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="継続購入設定" icon="fas fa-sync" onEdit={() => openEdit("autoship")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="継続購入" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.autoshipEnabled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                {m.autoshipEnabled ? "有効" : "無効"}
              </span>
            } />
            <InfoRow label="開始日" value={fmtDate(m.autoshipStartDate)} />
            <InfoRow label="停止日" value={fmtDate(m.autoshipStopDate)} />
            <InfoRow label="停止月" value={m.autoshipSuspendMonths} />
          </div>
          <div>
            <InfoRow label="支払い方法" value={PAYMENT_LABEL[m.paymentMethod] ?? m.paymentMethod} />
          </div>
        </div>
      </section>

      {/* ─── ポイント情報 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="ポイント情報" icon="fas fa-coins" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "自動pt", value: m.user.pointWallet?.autoPointsBalance ?? 0 },
            { label: "手動pt", value: m.user.pointWallet?.manualPointsBalance ?? 0 },
            { label: "外部pt", value: m.user.pointWallet?.externalPointsBalance ?? 0 },
            { label: "利用可能", value: m.user.pointWallet?.availablePointsBalance ?? 0, highlight: true },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={`rounded-xl p-3 text-center ${highlight ? "bg-violet-50" : "bg-slate-50"}`}>
              <div className="text-xs text-slate-500 mb-1">{label}</div>
              <div className={`text-lg font-bold ${highlight ? "text-violet-700" : "text-slate-700"}`}>{value.toLocaleString()}<span className="text-xs ml-0.5">pt</span></div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <InfoRow label="貯金ポイント (SAV)" value={<span className="text-green-600 font-semibold">{(m.savingsPoints ?? 0).toLocaleString()} pt</span>} />
        </div>
      </section>

      {/* ─── 組織情報 ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <SectionHeader title="紹介者（ユニレベル）" icon="fas fa-user-tie" />
          {m.referrer ? (
            <div className="space-y-1">
              <InfoRow label="会員コード" value={
                <Link href={`/admin/mlm-members/${m.referrer.id}`} className="text-blue-600 hover:underline font-mono">
                  {m.referrer.memberCode}
                </Link>
              } />
              <InfoRow label="氏名" value={displayName(m.referrer)} />
            </div>
          ) : <p className="text-slate-400 text-sm">紹介者なし（トップ）</p>}
        </section>
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <SectionHeader title="直上者（マトリックス）" icon="fas fa-sitemap" />
          {m.upline ? (
            <div className="space-y-1">
              <InfoRow label="会員コード" value={
                <Link href={`/admin/mlm-members/${m.upline.id}`} className="text-blue-600 hover:underline font-mono">
                  {m.upline.memberCode}
                </Link>
              } />
              <InfoRow label="氏名" value={displayName(m.upline)} />
            </div>
          ) : <p className="text-slate-400 text-sm">直上者なし</p>}
        </section>
      </div>

      {/* ─── 直下ダウンライン ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="直下ダウンライン（マトリックス）" icon="fas fa-users" />
        {m.downlines.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">会員コード</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">氏名</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold">LV</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold">ステータス</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {m.downlines.map(child => (
                  <tr key={child.id} className="hover:bg-violet-50 transition">
                    <td className="px-4 py-2.5 font-mono text-xs">{child.memberCode}</td>
                    <td className="px-4 py-2.5 text-sm">{child.companyName || child.user.name}</td>
                    <td className="px-4 py-2.5 text-center"><span className="text-xs">{LEVEL_LABELS[child.currentLevel] ?? child.currentLevel}</span></td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[child.status] ?? ""}`}>
                        {STATUS_LABEL[child.status] ?? child.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Link href={`/admin/mlm-members/${child.id}`} className="text-blue-600 hover:underline text-xs">詳細 →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-slate-400 text-sm">ダウンラインなし</p>}
      </section>

      {/* ─── 購入履歴 ─── */}
      <PurchasePanel
        memberCode={m.memberCode}
        memberName={m.companyName || m.user.name}
        memberPostal={r?.deliveryPostalCode || m.user.postalCode || ""}
        memberAddress={r?.deliveryAddress || [m.prefecture, m.city, m.address1, m.address2].filter(Boolean).join(" ") || m.user.address || ""}
        memberPhone={r?.deliveryPhone || m.mobile || m.user.phone || ""}
      />

      {/* ─── ボーナス明細 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              <i className="fas fa-file-invoice-dollar mr-2 text-slate-600"></i>ボーナス明細
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ボーナス計算後に自動反映されます。「公開」ボタンを押すと会員マイページに表示されます。
            </p>
          </div>
          <button
            onClick={fetchBonusStatements}
            disabled={bonusStatementsLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition disabled:opacity-50"
          >
            <i className={`fas fa-sync text-[10px] ${bonusStatementsLoading ? "animate-spin" : ""}`}></i>
            {bonusStatementsLoading ? "読込中..." : "更新"}
          </button>
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-3 mb-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-500">公開中 = 会員マイページに表示</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300"></span>
            <span className="text-slate-500">非公開 = 会員には非表示</span>
          </span>
        </div>

        {bonusStatementsLoading && (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-500 text-sm">
            <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            読み込み中...
          </div>
        )}
        {!bonusStatementsLoading && bonusStatements.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">
            ボーナス明細がありません（ボーナス計算後に自動表示されます）
          </p>
        )}
        {bonusStatements.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">対象月</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">支払額</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">ダイレクト</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">ユニレベル</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">組織構築</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">貯金B</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">繰越金</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold">源泉税</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold">会員公開</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bonusStatements.map((stmt) => (
                  <tr key={stmt.bonusMonth} className={`hover:bg-violet-50 transition ${stmt.isPublished ? "" : "bg-slate-50/50"}`}>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {stmt.bonusMonth}
                      {stmt.runStatus === "confirmed" && (
                        <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">確定</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">¥{stmt.paymentAmount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">¥{stmt.directBonus.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">¥{stmt.unilevelBonus.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">¥{stmt.structureBonus.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">¥{stmt.savingsBonus.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-blue-600">¥{stmt.carryoverAmount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-red-600">¥{stmt.withholdingTax.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleTogglePublish(stmt.bonusMonth, stmt.isPublished)}
                        disabled={publishingMonth === stmt.bonusMonth}
                        className={`px-3 py-1 text-[11px] font-bold rounded-full transition disabled:opacity-50 ${
                          stmt.isPublished
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300"
                        }`}
                      >
                        {publishingMonth === stmt.bonusMonth
                          ? "処理中..."
                          : stmt.isPublished
                          ? "✅ 公開中"
                          : "🔒 非公開"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleDownloadBonusStatementPDF(stmt.bonusMonth)}
                        className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition"
                      >
                        <i className="fas fa-file-pdf mr-1"></i>明細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── 組織図 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="組織図（マトリックス）" icon="fas fa-sitemap" />
        <OrganizationChart memberCode={m.memberCode} />
      </section>

      {/* ═══════════════════════════════════════════════
          編集モーダル群
      ═══════════════════════════════════════════════ */}

      {/* 基本情報 編集 */}
      {editSection === "basic" && (
        <EditModal title="基本情報を編集" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="氏名" required><input className={inputCls} value={String(editData.name ?? "")} onChange={e => set("name", e.target.value)} /></FormField>
            <FormField label="フリガナ"><input className={inputCls} value={String(editData.nameKana ?? "")} onChange={e => set("nameKana", e.target.value)} /></FormField>
            <FormField label="法人名"><input className={inputCls} value={String(editData.companyName ?? "")} onChange={e => set("companyName", e.target.value)} /></FormField>
            <FormField label="法人名（カナ）"><input className={inputCls} value={String(editData.companyNameKana ?? "")} onChange={e => set("companyNameKana", e.target.value)} /></FormField>
            <FormField label="生年月日"><input type="date" className={inputCls} value={String(editData.birthDate ?? "")} onChange={e => set("birthDate", e.target.value)} /></FormField>
            <FormField label="性別">
              <select className={selectCls} value={String(editData.gender ?? "")} onChange={e => set("gender", e.target.value)}>
                <option value="">選択</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
              </select>
            </FormField>
            <div className="md:col-span-2">
              <FormField label="概要書面番号"><input className={inputCls} value={String(editData.disclosureDocNumber ?? "")} onChange={e => set("disclosureDocNumber", e.target.value)} placeholder="例: 2024-001" /></FormField>
            </div>
            <FormField label="メールアドレス" required><input type="email" className={inputCls} value={String(editData.email ?? "")} onChange={e => set("email", e.target.value)} /></FormField>
            <FormField label="電話番号"><input className={inputCls} value={String(editData.phone ?? "")} onChange={e => set("phone", e.target.value)} /></FormField>
            <FormField label="携帯電話"><input className={inputCls} value={String(editData.mobile ?? "")} onChange={e => set("mobile", e.target.value)} /></FormField>
            <FormField label="郵便番号"><input className={inputCls} value={String(editData.postalCode ?? "")} onChange={e => set("postalCode", e.target.value)} /></FormField>
            <FormField label="都道府県"><input className={inputCls} value={String(editData.prefecture ?? "")} onChange={e => set("prefecture", e.target.value)} /></FormField>
            <FormField label="市区町村"><input className={inputCls} value={String(editData.city ?? "")} onChange={e => set("city", e.target.value)} /></FormField>
            <FormField label="住所1"><input className={inputCls} value={String(editData.address1 ?? "")} onChange={e => set("address1", e.target.value)} /></FormField>
            <FormField label="住所2"><input className={inputCls} value={String(editData.address2 ?? "")} onChange={e => set("address2", e.target.value)} /></FormField>
            <FormField label="会員区分">
              <select className={selectCls} value={String(editData.memberType ?? "")} onChange={e => set("memberType", e.target.value)}>
                <option value="business">ビジネス会員</option>
                <option value="preferred">愛用会員</option>
              </select>
            </FormField>
            <FormField label="ステータス">
              <select className={selectCls} value={String(editData.status ?? "")} onChange={e => set("status", e.target.value)}>
                <option value="active">活動中</option>
                <option value="autoship">オートシップ</option>
                <option value="lapsed">失効</option>
                <option value="suspended">停止</option>
                <option value="withdrawn">退会</option>
                <option value="midCancel">中途解約</option>
              </select>
            </FormField>
            <FormField label="契約締結日"><input type="date" className={inputCls} value={String(editData.contractDate ?? "")} onChange={e => set("contractDate", e.target.value)} /></FormField>
            <FormField label="初回入金日"><input type="date" className={inputCls} value={String(editData.firstPayDate ?? "")} onChange={e => set("firstPayDate", e.target.value)} /></FormField>
            <FormField label="クレジット決済ID（クレディックス）">
              <input className={inputCls} value={String(editData.creditCardId ?? "")} onChange={e => set("creditCardId", e.target.value)} placeholder="クレディックス顧客ID" />
            </FormField>
            <FormField label="マイページパスワード変更（6文字以上）">
              <input type="text" className={inputCls} value={String(editData.newPassword ?? "")} onChange={e => set("newPassword", e.target.value)} placeholder="変更する場合のみ入力" />
            </FormField>
          </div>
          <FormField label="備考">
            <textarea className={inputCls} rows={3} value={String(editData.note ?? "")} onChange={e => set("note", e.target.value)} />
          </FormField>
        </EditModal>
      )}

      {/* 配送先住所 編集 */}
      {editSection === "registration" && (
        <EditModal title="配送先住所を編集" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-1">
            未入力の場合は基本情報（住所・郵便番号・電話番号）が配送先として使用されます
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="配送先郵便番号"><input className={inputCls} value={String(editData.deliveryPostalCode ?? "")} onChange={e => set("deliveryPostalCode", e.target.value)} placeholder="基本情報の郵便番号を使用" /></FormField>
            <FormField label="配送先名義（宛名）"><input className={inputCls} value={String(editData.deliveryName ?? "")} onChange={e => set("deliveryName", e.target.value)} placeholder="基本情報の氏名/法人名を使用" /></FormField>
            <div className="md:col-span-2">
              <FormField label="配送先住所"><input className={inputCls} value={String(editData.deliveryAddress ?? "")} onChange={e => set("deliveryAddress", e.target.value)} placeholder="基本情報の住所を使用" /></FormField>
            </div>
            <FormField label="配送先電話番号"><input className={inputCls} value={String(editData.deliveryPhone ?? "")} onChange={e => set("deliveryPhone", e.target.value)} placeholder="基本情報の電話番号を使用" /></FormField>
          </div>
        </EditModal>
      )}

      {/* 銀行口座 編集 */}
      {editSection === "bank" && (
        <EditModal title="銀行口座情報を編集" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          <p className="text-xs font-bold text-violet-700 mb-2">📥 報酬振込先口座</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="銀行コード"><input className={inputCls} value={String(editData.bankCode ?? "")} onChange={e => set("bankCode", e.target.value)} /></FormField>
            <FormField label="銀行名"><input className={inputCls} value={String(editData.bankName ?? "")} onChange={e => set("bankName", e.target.value)} /></FormField>
            <FormField label="支店コード"><input className={inputCls} value={String(editData.branchCode ?? "")} onChange={e => set("branchCode", e.target.value)} /></FormField>
            <FormField label="支店名"><input className={inputCls} value={String(editData.branchName ?? "")} onChange={e => set("branchName", e.target.value)} /></FormField>
            <FormField label="口座種別">
              <select className={selectCls} value={String(editData.accountType ?? "普通")} onChange={e => set("accountType", e.target.value)}>
                <option value="普通">普通</option>
                <option value="当座">当座</option>
              </select>
            </FormField>
            <FormField label="口座番号"><input className={inputCls} value={String(editData.accountNumber ?? "")} onChange={e => set("accountNumber", e.target.value)} /></FormField>
            <div className="md:col-span-2">
              <FormField label="口座名義（カナ）"><input className={inputCls} value={String(editData.accountHolder ?? "")} onChange={e => set("accountHolder", e.target.value)} /></FormField>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-600 mt-4 mb-2">💳 引き落とし先口座（クレジット/振替）</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="銀行名"><input className={inputCls} value={String(editData.regBankName ?? "")} onChange={e => set("regBankName", e.target.value)} /></FormField>
            <FormField label="支店名"><input className={inputCls} value={String(editData.regBankBranch ?? "")} onChange={e => set("regBankBranch", e.target.value)} /></FormField>
            <FormField label="口座種別">
              <select className={selectCls} value={String(editData.regAccountType ?? "普通")} onChange={e => set("regAccountType", e.target.value)}>
                <option value="普通">普通</option>
                <option value="当座">当座</option>
              </select>
            </FormField>
            <FormField label="口座番号"><input className={inputCls} value={String(editData.regAccountNumber ?? "")} onChange={e => set("regAccountNumber", e.target.value)} /></FormField>
            <div className="md:col-span-2">
              <FormField label="口座名義（カナ）"><input className={inputCls} value={String(editData.regAccountHolder ?? "")} onChange={e => set("regAccountHolder", e.target.value)} /></FormField>
            </div>
          </div>
        </EditModal>
      )}

      {/* レベル情報 編集 */}
      {editSection === "level" && (
        <EditModal title="レベル情報を編集（レベル＝タイトル）" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          {/* 概念説明 */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1 mb-2">
            <p className="font-bold text-blue-700">📌 設定の意味</p>
            <p>• <strong>強制アクティブ</strong>: ONにすると、条件達成（達成状態）になった時に自動でアクティブ扱いになります。</p>
            <p>• <strong>強制タイトル＝レベル</strong>: 設定したレベルの達成条件を自動で満たしたと判定します。強制アクティブと組み合わせて使用します。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="現在レベル（タイトル）">
              <select className={selectCls} value={String(editData.currentLevel ?? 0)} onChange={e => set("currentLevel", Number(e.target.value))}>
                {[0,1,2,3,4,5].map(lv => <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>)}
              </select>
            </FormField>
            <FormField label="称号レベル">
              <select className={selectCls} value={String(editData.titleLevel ?? 0)} onChange={e => set("titleLevel", Number(e.target.value))}>
                {[0,1,2,3,4,5].map(lv => <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>)}
              </select>
            </FormField>
            <FormField label="強制タイトル＝レベル（達成条件の自動判定レベル）">
              <select className={selectCls} value={String(editData.forceLevel ?? "")} onChange={e => set("forceLevel", e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">なし（無効）</option>
                {[1,2,3,4,5].map(lv => <option key={lv} value={lv}>{LEVEL_LABELS[lv]}相当で自動判定</option>)}
              </select>
            </FormField>
            <div className="flex flex-col gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                <input type="checkbox" checked={Boolean(editData.conditionAchieved)} onChange={e => set("conditionAchieved", e.target.checked)} className="w-4 h-4 accent-green-600" />
                <div>
                  <span className="text-sm font-semibold">条件達成</span>
                  <p className="text-xs text-slate-500">手動で達成状態にします</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                <input type="checkbox" checked={Boolean(editData.forceActive)} onChange={e => set("forceActive", e.target.checked)} className="w-4 h-4 accent-orange-600" />
                <div>
                  <span className="text-sm font-semibold">強制アクティブ</span>
                  <p className="text-xs text-slate-500">条件達成時に自動でアクティブになります</p>
                </div>
              </label>
            </div>
          </div>
          {/* 設定プレビュー */}
          {(editData.forceActive || editData.forceLevel !== null) && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <strong>設定プレビュー:</strong>{" "}
              {editData.forceActive && editData.forceLevel !== null
                ? `強制タイトル＝${LEVEL_LABELS[Number(editData.forceLevel)]}の達成条件が満たされたと判定 → 条件達成 → 自動アクティブ`
                : editData.forceActive
                ? "条件達成になった場合に自動でアクティブになります"
                : "指定レベルの達成条件を自動判定します（強制アクティブが無効のため自動アクティブにはなりません）"
              }
            </div>
          )}
        </EditModal>
      )}

      {/* 継続購入設定 編集 */}
      {editSection === "autoship" && (
        <EditModal title="継続購入設定を編集" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(editData.autoshipEnabled)} onChange={e => set("autoshipEnabled", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-semibold">継続購入を有効にする</span>
              </label>
            </div>
            <FormField label="開始日"><input type="date" className={inputCls} value={String(editData.autoshipStartDate ?? "")} onChange={e => set("autoshipStartDate", e.target.value)} /></FormField>
            <FormField label="停止日"><input type="date" className={inputCls} value={String(editData.autoshipStopDate ?? "")} onChange={e => set("autoshipStopDate", e.target.value)} /></FormField>
            <FormField label="停止月（カンマ区切り例: 2025-01,2025-02）">
              <input className={inputCls} value={String(editData.autoshipSuspendMonths ?? "")} onChange={e => set("autoshipSuspendMonths", e.target.value)} placeholder="2025-01,2025-02" />
            </FormField>
            <FormField label="支払い方法">
              <select className={selectCls} value={String(editData.paymentMethod ?? "credit_card")} onChange={e => set("paymentMethod", e.target.value)}>
                <option value="credit_card">クレジットカード（クレディックス）</option>
                <option value="bank_transfer">口座振替（三菱UFJファクター）</option>
                <option value="bank_payment">銀行振込</option>
              </select>
            </FormField>
          </div>
        </EditModal>
      )}
    </main>
  );
}
