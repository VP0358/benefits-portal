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

  // モーダル管理
  const [editSection, setEditSection] = useState<
    "basic" | "registration" | "bank" | "level" | "autoship" | null
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

  // 編集モーダルを開く
  const openEdit = (section: typeof editSection) => {
    if (!member) return;
    const m = member;
    const r = m.user.mlmRegistration;
    const d: Record<string, string | boolean | number | null> = {};

    if (section === "basic") {
      Object.assign(d, {
        name: m.user.name, nameKana: m.user.nameKana ?? "",
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
      Object.assign(d, {
        disclosureDocNumber: r?.disclosureDocNumber ?? "",
        deliveryPostalCode: r?.deliveryPostalCode ?? "",
        deliveryAddress: r?.deliveryAddress ?? "",
        deliveryName: r?.deliveryName ?? "",
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
      </section>

      {/* ─── 概要書面・配送先 ─── */}
      <section className="bg-white rounded-2xl shadow-sm p-5">
        <SectionHeader title="概要書面・配送先住所" icon="fas fa-file-alt" onEdit={() => openEdit("registration")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="概要書面番号" value={r?.disclosureDocNumber} />
          </div>
          <div>
            <InfoRow label="配送先郵便番号" value={r?.deliveryPostalCode} />
            <InfoRow label="配送先住所"     value={r?.deliveryAddress} />
            <InfoRow label="配送先名義"     value={r?.deliveryName} />
          </div>
        </div>
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
        <SectionHeader title="レベル情報" icon="fas fa-chart-line" onEdit={() => openEdit("level")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="現在レベル" value={<span className="font-bold text-blue-600 text-base">{LEVEL_LABELS[m.currentLevel] ?? m.currentLevel}</span>} />
            <InfoRow label="称号レベル" value={LEVEL_LABELS[m.titleLevel] ?? m.titleLevel} />
            <InfoRow label="強制レベル" value={m.forceLevel !== null ? LEVEL_LABELS[m.forceLevel ?? 0] : "—"} />
          </div>
          <div>
            <InfoRow label="条件達成" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.conditionAchieved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {m.conditionAchieved ? "達成" : "未達成"}
              </span>
            } />
            <InfoRow label="強制アクティブ" value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.forceActive ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                {m.forceActive ? "有効" : "無効"}
              </span>
            } />
          </div>
        </div>
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
      <PurchasePanel memberCode={m.memberCode} />

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

      {/* 概要書面・配送先 編集 */}
      {editSection === "registration" && (
        <EditModal title="概要書面・配送先住所を編集" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="概要書面番号"><input className={inputCls} value={String(editData.disclosureDocNumber ?? "")} onChange={e => set("disclosureDocNumber", e.target.value)} /></FormField>
            <FormField label="配送先郵便番号"><input className={inputCls} value={String(editData.deliveryPostalCode ?? "")} onChange={e => set("deliveryPostalCode", e.target.value)} /></FormField>
            <div className="md:col-span-2">
              <FormField label="配送先住所"><input className={inputCls} value={String(editData.deliveryAddress ?? "")} onChange={e => set("deliveryAddress", e.target.value)} /></FormField>
            </div>
            <FormField label="配送先名義（宛名）"><input className={inputCls} value={String(editData.deliveryName ?? "")} onChange={e => set("deliveryName", e.target.value)} /></FormField>
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
        <EditModal title="レベル情報を編集" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="現在レベル">
              <select className={selectCls} value={String(editData.currentLevel ?? 0)} onChange={e => set("currentLevel", Number(e.target.value))}>
                {[0,1,2,3,4,5].map(lv => <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>)}
              </select>
            </FormField>
            <FormField label="称号レベル">
              <select className={selectCls} value={String(editData.titleLevel ?? 0)} onChange={e => set("titleLevel", Number(e.target.value))}>
                {[0,1,2,3,4,5].map(lv => <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>)}
              </select>
            </FormField>
            <FormField label="強制レベル">
              <select className={selectCls} value={String(editData.forceLevel ?? "")} onChange={e => set("forceLevel", e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">なし</option>
                {[0,1,2,3,4,5].map(lv => <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>)}
              </select>
            </FormField>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(editData.conditionAchieved)} onChange={e => set("conditionAchieved", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">条件達成</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Boolean(editData.forceActive)} onChange={e => set("forceActive", e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">強制アクティブ</span>
              </label>
            </div>
          </div>
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
