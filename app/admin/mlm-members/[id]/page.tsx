"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PurchasePanel from "./ui/purchase-panel";
import OrganizationChart from "./ui/organization-chart";

// ─── 日本語日付ピッカー ────────────────────────────────
function JpDatePicker({
  value,
  onChange,
  clearable = false,
}: {
  value: string;
  onChange: (v: string) => void;
  clearable?: boolean;
}) {
  const currentYear = new Date().getFullYear(); // ブラウザのローカルタイムで十分（年リスト生成用）
  const years = Array.from({ length: 100 }, (_, i) => currentYear + 5 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const parsed = value ? value.split("-") : [];
  const initY = parsed[0] ?? "";
  const initM = parsed[1] ? String(parseInt(parsed[1])) : "";
  const initD = parsed[2] ? String(parseInt(parsed[2])) : "";

  const [y, setY] = useState(initY);
  const [m, setM] = useState(initM);
  const [d, setD] = useState(initD);

  // value が外部から変更された場合に同期
  useEffect(() => {
    if (!value) { setY(""); setM(""); setD(""); return; }
    const p = value.split("-");
    setY(p[0] ?? "");
    setM(p[1] ? String(parseInt(p[1])) : "");
    setD(p[2] ? String(parseInt(p[2])) : "");
  }, [value]);

  const daysInMonth = (yr: string, mo: string) => {
    if (!yr || !mo) return 31;
    return new Date(parseInt(yr), parseInt(mo), 0).getDate();
  };
  const days = Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1);

  const emit = (ny: string, nm: string, nd: string) => {
    if (ny && nm && nd) {
      const maxD = daysInMonth(ny, nm);
      const safeD = Math.min(parseInt(nd), maxD);
      onChange(`${ny}-${nm.padStart(2, "0")}-${String(safeD).padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const sel = "rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white appearance-none";

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* 年 */}
      <select value={y} onChange={e => { setY(e.target.value); emit(e.target.value, m, d); }}
        className={`${sel} w-28`}>
        <option value="">年</option>
        {years.map(yr => <option key={yr} value={String(yr)}>{yr}年</option>)}
      </select>
      {/* 月 */}
      <select value={m} onChange={e => { setM(e.target.value); emit(y, e.target.value, d); }}
        className={`${sel} w-20`}>
        <option value="">月</option>
        {months.map(mo => <option key={mo} value={String(mo)}>{mo}月</option>)}
      </select>
      {/* 日 */}
      <select value={d} onChange={e => { setD(e.target.value); emit(y, m, e.target.value); }}
        className={`${sel} w-20`} disabled={!y || !m}>
        <option value="">日</option>
        {days.map(dy => <option key={dy} value={String(dy)}>{dy}日</option>)}
      </select>
      {/* クリアボタン */}
      {clearable && value && (
        <button type="button"
          onClick={() => { setY(""); setM(""); setD(""); onChange(""); }}
          className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition">
          クリア
        </button>
      )}
      {/* 選択確認表示 */}
      {value && (
        <span className="text-xs text-slate-500">
          ✓ {new Date(value + "T00:00:00+09:00").toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

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
  // クレジットカード情報（クレディックス）3枠
  creditCardId: string | null;
  creditCardExpiry: string | null;
  creditCardLast4: string | null;
  creditCardId2: string | null;
  creditCardExpiry2: string | null;
  creditCardLast4_2: string | null;
  creditCardId3: string | null;
  creditCardExpiry3: string | null;
  creditCardLast4_3: string | null;
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
      bankCode: string | null;
      bankName: string | null;
      branchCode: string | null;
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
  downlines: { id: string; memberCode: string; currentLevel: number; status: string; user: { name: string }; companyName: string | null; referrer: { id: string; memberCode: string; user: { name: string }; companyName: string | null } | null }[];
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
  credit_card:   "クレジットカード",
  bank_transfer: "口座引き落とし",
  bank_payment:  "銀行振込",
  cod:           "代引き",
  other:         "その他",
};

// ─── ゆうちょ銀行 記号番号→振込用口座情報 変換 ────────────────────
/**
 * ゆうちょ銀行の記号番号から、他行振込用の口座情報に変換する。
 *
 * 【変換ルール】
 *   記号：5桁（例: 10020）
 *   番号：最大8桁（例: 12345671）
 *
 *   銀行コード : 9900
 *   銀行名     : ゆうちょ銀行
 *   支店コード : 記号の2・3桁目 + "8"  例: 10020 → "002" → "0028"（3桁+1）
 *               ※正確には: 記号先頭1桁が "1" の場合 → (記号2〜3桁目) + "8"
 *                           記号先頭1桁が "0" の場合 → (記号1〜3桁目) + "8"
 *   支店名     : 支店コードに対応する名称（3桁数字+8）
 *   口座種別   : 普通
 *   口座番号   : 番号の末尾1桁を除いた数字（チェックデジット除去）、左ゼロ除去後7桁
 */
interface YuchoConvertResult {
  bankCode: string;
  bankName: string;
  branchCode: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  error?: string;
}

function convertYucho(kigo: string, bango: string): YuchoConvertResult {
  // 半角数字のみ抽出
  const k = kigo.replace(/[^\d]/g, "");
  const b = bango.replace(/[^\d]/g, "");

  if (k.length < 5) {
    return { bankCode: "", bankName: "", branchCode: "", branchName: "", accountType: "", accountNumber: "", error: "記号は5桁で入力してください（例: 10020）" };
  }
  if (b.length < 2) {
    return { bankCode: "", bankName: "", branchCode: "", branchName: "", accountType: "", accountNumber: "", error: "番号を入力してください" };
  }

  // 支店コード算出
  // 記号先頭が "1" → 2〜3桁目 + "8"
  // 記号先頭が "0" → 1〜3桁目 + "8"
  let branchCode: string;
  if (k[0] === "1") {
    branchCode = k.substring(1, 3) + "8";
  } else {
    branchCode = k.substring(0, 3) + "8";
  }

  // 支店名：コードを漢数字で表現（末尾は必ず「八」）
  const kanjiDigits = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const branchDigits = branchCode.split("").map(c => kanjiDigits[parseInt(c)] ?? c);
  const branchName = branchDigits.join("") + "支店";

  // 振込用口座番号：番号の末尾1桁（チェックデジット）を除去して7桁に整形
  // 番号が8桁の場合: 先頭7桁を使用
  // 番号が7桁以下の場合: そのまま使用（ゼロ除去）
  let accountNumber: string;
  if (b.length >= 8) {
    accountNumber = b.substring(0, 7);
  } else {
    // 番号が短い場合は左ゼロ埋め除去
    accountNumber = String(parseInt(b, 10) || 0).padStart(7, "0");
  }

  return {
    bankCode: "9900",
    bankName: "ゆうちょ銀行",
    branchCode,
    branchName,
    accountType: "普通",
    accountNumber,
  };
}

// ─── ヘルパー ────────────────────────────────────────
/** UTC ISO 文字列 → JST の日本語表示（タイムゾーンずれ対策）*/
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    // JST（Asia/Tokyo）基準で表示する
    return d.toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  } catch { return s; }
}

/**
 * UTC ISO 文字列 → JST 基準の "YYYY-MM-DD" 文字列
 * 編集フォームの初期値設定に使用（slice(0,10)ではUTC日付になるためずれる）
 */
function toJSTDateStr(s: string | null | undefined): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    // Intl.DateTimeFormat で JST の年月日を取得
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    // en-CA は "YYYY-MM-DD" 形式を返す
    return parts;
  } catch { return ""; }
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
    adjustmentAmount: number;
    withholdingTax: number;
    carryoverAmount: number;
    savingsPointsAdded: number;
    isPublished: boolean;
    note: string | null;
    runStatus: string;
  }>>([]);
  const [bonusStatementsLoading, setBonusStatementsLoading] = useState(false);
  const [publishingMonth, setPublishingMonth] = useState<string | null>(null);

  // モーダル管理
  const [editSection, setEditSection] = useState<
    "basic" | "registration" | "bank" | "level" | "autoship" | "bonusStatement" | "relations" | null
  >(null);

  // ─── 会員削除モーダル ───
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!member) return;
    if (deleteConfirmText !== member.memberCode) {
      setDeleteError("会員コードが一致しません");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/mlm-members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/mlm-members");
      } else {
        const err = await res.json();
        setDeleteError(err.error ?? "削除に失敗しました");
      }
    } catch {
      setDeleteError("通信エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  // ─── 紹介者・直上者検索モーダル用 ───
  const [relSearchCode, setRelSearchCode] = useState<{ referrer: string; upline: string }>({ referrer: "", upline: "" });
  const [relSearchResult, setRelSearchResult] = useState<{
    referrer: { id: string; memberCode: string; name: string } | null;
    upline:   { id: string; memberCode: string; name: string } | null;
  }>({ referrer: null, upline: null });
  const [relSearchError, setRelSearchError] = useState<{ referrer: string | null; upline: string | null }>({ referrer: null, upline: null });
  const [relSearching, setRelSearching] = useState<{ referrer: boolean; upline: boolean }>({ referrer: false, upline: false });
  const [relSaving, setRelSaving] = useState(false);

  const searchRelMember = async (type: "referrer" | "upline") => {
    const code = relSearchCode[type].trim();
    if (!code) return;
    setRelSearching(s => ({ ...s, [type]: true }));
    setRelSearchError(s => ({ ...s, [type]: null }));
    setRelSearchResult(s => ({ ...s, [type]: null }));
    try {
      const res = await fetch(`/api/admin/mlm-members/search?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        const m = data.member;
        if (m.id === memberId) {
          setRelSearchError(s => ({ ...s, [type]: "自分自身は設定できません" }));
        } else {
          setRelSearchResult(s => ({ ...s, [type]: { id: m.id, memberCode: m.memberCode, name: m.companyName || m.user?.name || m.userName } }));
        }
      } else {
        setRelSearchError(s => ({ ...s, [type]: "会員が見つかりません" }));
      }
    } catch {
      setRelSearchError(s => ({ ...s, [type]: "通信エラー" }));
    } finally {
      setRelSearching(s => ({ ...s, [type]: false }));
    }
  };

  const handleRelSave = async () => {
    setRelSaving(true);
    try {
      const body: Record<string, string | null> = {};
      // referrer が検索済み → 変更 / クリア指示あり → null
      if (relSearchResult.referrer !== null) {
        body.referrerId = relSearchResult.referrer.id;
      } else if (relSearchCode.referrer === "__CLEAR__") {
        body.referrerId = null;
      }
      if (relSearchResult.upline !== null) {
        body.uplineId = relSearchResult.upline.id;
      } else if (relSearchCode.upline === "__CLEAR__") {
        body.uplineId = null;
      }
      if (Object.keys(body).length === 0) {
        setEditSection(null);
        return;
      }
      const res = await fetch(`/api/admin/mlm-members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "relations", ...body }),
      });
      if (res.ok) {
        await fetchMember();
        setEditSection(null);
        setRelSearchCode({ referrer: "", upline: "" });
        setRelSearchResult({ referrer: null, upline: null });
        setRelSearchError({ referrer: null, upline: null });
      } else {
        const err = await res.json();
        alert(err.error ?? "保存に失敗しました");
      }
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setRelSaving(false);
    }
  };

  // 編集フォームの一時データ
  const [editData, setEditData] = useState<Record<string, string | boolean | number | null>>({});

  // ─── ゆうちょ記号番号変換 ───
  const [yuchoKigo, setYuchoKigo] = useState("");
  const [yuchoBango, setYuchoBango] = useState("");
  const [yuchoResult, setYuchoResult] = useState<YuchoConvertResult | null>(null);
  const [yuchoError, setYuchoError] = useState<string | null>(null);

  const handleYuchoConvert = () => {
    setYuchoError(null);
    setYuchoResult(null);
    const result = convertYucho(yuchoKigo, yuchoBango);
    if (result.error) {
      setYuchoError(result.error);
      return;
    }
    setYuchoResult(result);
  };

  const applyYuchoResult = () => {
    if (!yuchoResult) return;
    set("bankCode", yuchoResult.bankCode);
    set("bankName", yuchoResult.bankName);
    set("branchCode", yuchoResult.branchCode);
    set("branchName", yuchoResult.branchName);
    set("accountType", yuchoResult.accountType);
    set("accountNumber", yuchoResult.accountNumber);
    setYuchoResult(null);
    setYuchoKigo("");
    setYuchoBango("");
  };

  // ─── ポイント調整モーダル ───
  const [pointAdjModal, setPointAdjModal] = useState(false);
  const [pointAdjMode, setPointAdjMode] = useState<"add" | "subtract">("add");
  const [pointAdjType, setPointAdjType] = useState<"manual" | "external">("manual");
  const [pointAdjAmount, setPointAdjAmount] = useState<string>("");
  const [pointAdjDesc, setPointAdjDesc] = useState<string>("");
  const [pointAdjSaving, setPointAdjSaving] = useState(false);
  const [pointAdjError, setPointAdjError] = useState<string | null>(null);

  const handlePointAdjust = async () => {
    if (!member) return;
    const pts = parseInt(pointAdjAmount, 10);
    if (!pts || pts <= 0) { setPointAdjError("1以上の整数を入力してください"); return; }
    if (!pointAdjDesc.trim()) { setPointAdjError("理由・メモを入力してください"); return; }
    // 減算時は残高チェック
    if (pointAdjMode === "subtract") {
      const current = pointAdjType === "manual"
        ? (member.user.pointWallet?.manualPointsBalance ?? 0)
        : (member.user.pointWallet?.externalPointsBalance ?? 0);
      if (pts > current) {
        setPointAdjError(`残高不足です（現在: ${current.toLocaleString()} pt）`);
        return;
      }
    }
    setPointAdjSaving(true);
    setPointAdjError(null);
    try {
      const res = await fetch("/api/admin/points/manual-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.user.id,
          pointSourceType: pointAdjType,
          mode: pointAdjMode,
          points: pts,
          description: pointAdjDesc.trim(),
        }),
      });
      if (!res.ok) {
        let errMsg = "調整に失敗しました";
        try {
          const errBody = await res.text();
          const errJson = errBody ? JSON.parse(errBody) : {};
          errMsg = errJson.error ?? errMsg;
        } catch { /* keep default message */ }
        throw new Error(errMsg);
      }
      setPointAdjModal(false);
      setPointAdjAmount("");
      setPointAdjDesc("");
      await fetchMember(); // 最新データを再取得
    } catch (e: unknown) {
      setPointAdjError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setPointAdjSaving(false);
    }
  };

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
        birthDate: toJSTDateStr(m.birthDate),
        gender: m.gender ?? "",
        postalCode: m.user.postalCode ?? "",
        prefecture: m.prefecture ?? "", city: m.city ?? "",
        address1: m.address1 ?? "", address2: m.address2 ?? "",
        memberType: m.memberType, status: m.status,
        contractDate: toJSTDateStr(m.contractDate),
        firstPayDate: toJSTDateStr(m.firstPayDate),
        creditCardId: m.creditCardId ?? "",
        creditCardExpiry: m.creditCardExpiry ?? "",
        creditCardLast4: m.creditCardLast4 ?? "",
        creditCardId2: m.creditCardId2 ?? "",
        creditCardExpiry2: m.creditCardExpiry2 ?? "",
        creditCardLast4_2: m.creditCardLast4_2 ?? "",
        creditCardId3: m.creditCardId3 ?? "",
        creditCardExpiry3: m.creditCardExpiry3 ?? "",
        creditCardLast4_3: m.creditCardLast4_3 ?? "",
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
        regBankCode: r?.bankCode ?? "", regBankName: r?.bankName ?? "",
        regBranchCode: r?.branchCode ?? "", regBankBranch: r?.bankBranch ?? "",
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
        autoshipStartDate: toJSTDateStr(m.autoshipStartDate),
        // 停止日は常に空欄でモーダルを開く（手動入力時のみ保存）
        autoshipStopDate: "",
        autoshipSuspendMonths: m.autoshipSuspendMonths ?? "",
        paymentMethod: m.paymentMethod,
        // 現在の停止日をDBから表示用に保持（読み取り専用）
        _currentStopDate: toJSTDateStr(m.autoshipStopDate),
      });
    }
    setEditData(d);
    setEditSection(section);
  };

  const handleSave = async () => {
    if (!editSection) return;
    setSaving(true);
    try {
      // autoship セクション保存時は表示専用フィールド(_currentStopDate)を除外
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _currentStopDate, ...cleanEditData } = editData as Record<string, unknown> & { _currentStopDate?: unknown };
      const dataToSend = editSection === "autoship" ? cleanEditData : editData;

      // bank は basic + registration に分けて送信
      let payload: Record<string, unknown> = { section: editSection, ...dataToSend };

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
            bankCode: editData.regBankCode,
            bankName: editData.regBankName,
            branchCode: editData.regBranchCode,
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
        <div className="flex gap-2">
          <button onClick={() => router.back()}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition">
            ← 戻る
          </button>
          <button
            onClick={() => { setDeleteConfirmText(""); setDeleteError(null); setDeleteModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition"
          >
            <i className="fas fa-trash-alt text-xs"></i> 会員削除
          </button>
        </div>
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
            {/* クレジットカード情報（クレディックス）3枠 */}
            {[
              { id: m.creditCardId,  expiry: m.creditCardExpiry,  last4: m.creditCardLast4,   label: "クレジット①" },
              { id: m.creditCardId2, expiry: m.creditCardExpiry2, last4: m.creditCardLast4_2, label: "クレジット②" },
              { id: m.creditCardId3, expiry: m.creditCardExpiry3, last4: m.creditCardLast4_3, label: "クレジット③" },
            ].map((card, idx) => (card.id || card.expiry || card.last4) ? (
              <InfoRow key={idx} label={`${card.label}（クレディックス）`} value={
                <span className="font-mono text-xs space-x-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {card.id && (
                    <>
                      <span>ID: {card.id}</span>
                      {/* ★修正③: 照合キー（正規化済みID）を表示 */}
                      {(() => {
                        const s = card.id.replace(/[\u3000\t\r\n]/g, " ").trim();
                        const wcT = s.match(/^WC[\s\-_]*(\d+)$/i);
                        const norm = wcT ? wcT[1].replace(/^0+/, "") || "0"
                          : /^\d+$/.test(s) ? s.replace(/^0+/, "") || "0" : null;
                        const displayId = card.id.trim();
                        // 正規化できない場合は警告表示
                        if (!norm) return <span className="bg-red-100 text-red-700 px-1 rounded text-[10px]">⚠️ 照合不可（形式エラー）</span>;
                        // 正規化後が元のIDと異なる場合（WC付き等）は照合キーを表示
                        const normWithPrefix = displayId.match(/^WC/i) ? `WC${norm}` : norm;
                        if (displayId !== normWithPrefix) return <span className="bg-amber-100 text-amber-700 px-1 rounded text-[10px]">照合キー: {norm}</span>;
                        return <span className="bg-green-50 text-green-700 px-1 rounded text-[10px]">✓ 照合キー: {norm}</span>;
                      })()}
                    </>
                  )}
                  {card.expiry && <span>期限: {card.expiry}</span>}
                  {card.last4 && <span>下4桁: {card.last4}</span>}
                </span>
              } />
            ) : null)}
            <InfoRow label="備考"             value={m.note} />
            <InfoRow label="継続購入" value={
              m.autoshipEnabled
                ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">継続購入は有効です</span>
                : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">継続購入はしていません</span>
            } />
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
            <InfoRow label="銀行コード" value={r?.bankCode} mono />
            <InfoRow label="銀行名"     value={r?.bankName} />
            <InfoRow label="支店コード" value={r?.branchCode} mono />
            <InfoRow label="支店名"     value={r?.bankBranch} />
            <InfoRow label="口座種別"   value={r?.bankAccountType} />
            <InfoRow label="口座番号"   value={r?.bankAccountNumber} mono />
            <InfoRow label="口座名義"   value={r?.bankAccountHolder} />
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
            <InfoRow label="現在レベル（タイトル）" value={
              m.forceLevel !== null && m.forceLevel !== undefined ? (
                <span className="font-bold text-orange-600 text-base">
                  🏅 {LEVEL_LABELS[m.forceLevel] ?? `LV.${m.forceLevel}`}
                  <span className="ml-1 text-xs font-normal text-slate-400">（強制タイトル）</span>
                </span>
              ) : (
                <span className="font-bold text-blue-600 text-base">{LEVEL_LABELS[m.currentLevel] ?? m.currentLevel}</span>
              )
            } />
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
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="ポイント情報" icon="fas fa-coins" />
          <div className="flex gap-2">
            <button
              onClick={() => { setPointAdjMode("add"); setPointAdjType("manual"); setPointAdjAmount(""); setPointAdjDesc(""); setPointAdjError(null); setPointAdjModal(true); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition"
            >
              <i className="fas fa-plus" /> 加算
            </button>
            <button
              onClick={() => { setPointAdjMode("subtract"); setPointAdjType("manual"); setPointAdjAmount(""); setPointAdjDesc(""); setPointAdjError(null); setPointAdjModal(true); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition"
            >
              <i className="fas fa-minus" /> 減算
            </button>
          </div>
        </div>

        {/* ── 4タブカード ── */}
        <div className="grid grid-cols-2 gap-3">

          {/* ① 貯金ボーナス（SAV）*/}
          {(() => {
            const now = new Date();
            const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const currentMonthStmt = bonusStatements.find(s => s.bonusMonth === currentMonthStr);
            const currentMonthSAV = currentMonthStmt?.savingsPointsAdded ?? 0;
            return (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-piggy-bank text-emerald-500 text-sm" />
                  <span className="text-xs font-bold text-emerald-700">貯金ボーナス（SAV）</span>
                </div>
                {/* 当月付与pt — 当月ボーナス明細の savingsPointsAdded から取得 */}
                <div className="rounded-lg bg-white border border-emerald-100 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">当月付与pt</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {currentMonthSAV.toLocaleString()}
                    <span className="text-[10px] font-normal ml-0.5">SAV</span>
                  </span>
                </div>
                <div className="rounded-lg bg-emerald-100 border border-emerald-200 px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-semibold">合計付与pt</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {(m.savingsPoints ?? 0).toLocaleString()} <span className="text-[10px] font-normal">SAV</span>
                  </span>
                </div>
              </div>
            );
          })()}

          {/* ② 手動追加ポイント */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <i className="fas fa-hand-pointer text-blue-500 text-sm" />
              <span className="text-xs font-bold text-blue-700">手動追加ポイント</span>
            </div>
            <div className="flex-1 flex items-center justify-center rounded-lg bg-white border border-blue-100 px-3 py-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-blue-700">
                  {(m.user.pointWallet?.manualPointsBalance ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-blue-400 mt-0.5">pt</div>
              </div>
            </div>
          </div>

          {/* ③ 外部追加ポイント */}
          <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <i className="fas fa-external-link-alt text-violet-500 text-sm" />
              <span className="text-xs font-bold text-violet-700">外部追加ポイント</span>
            </div>
            <div className="flex-1 flex items-center justify-center rounded-lg bg-white border border-violet-100 px-3 py-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-violet-700">
                  {(m.user.pointWallet?.externalPointsBalance ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-violet-400 mt-0.5">pt</div>
              </div>
            </div>
          </div>

          {/* ④ 利用可能ポイント */}
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <i className="fas fa-coins text-amber-500 text-sm" />
              <span className="text-xs font-bold text-amber-700">利用可能ポイント</span>
            </div>
            <div className="flex-1 flex items-center justify-center rounded-lg bg-amber-100 border border-amber-200 px-3 py-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-amber-700">
                  {(m.user.pointWallet?.availablePointsBalance ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-500 mt-0.5">pt</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── ポイント調整モーダル ─── */}
      {pointAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-bold ${pointAdjMode === "add" ? "text-emerald-600" : "text-rose-600"}`}>
                <i className={`fas ${pointAdjMode === "add" ? "fa-plus-circle" : "fa-minus-circle"} mr-2`} />
                ポイント{pointAdjMode === "add" ? "加算" : "減算"}
              </h3>
              <button onClick={() => setPointAdjModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            {/* 現在残高 */}
            <div className="bg-slate-50 rounded-xl p-3 mb-4 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <div className="text-slate-500">手動pt残高</div>
                <div className="font-bold text-slate-700">{(m.user.pointWallet?.manualPointsBalance ?? 0).toLocaleString()} pt</div>
              </div>
              <div>
                <div className="text-slate-500">外部pt残高</div>
                <div className="font-bold text-slate-700">{(m.user.pointWallet?.externalPointsBalance ?? 0).toLocaleString()} pt</div>
              </div>
              <div>
                <div className="text-slate-500">自動pt残高</div>
                <div className="font-bold text-slate-700">{(m.user.pointWallet?.autoPointsBalance ?? 0).toLocaleString()} pt</div>
              </div>
              <div className="bg-violet-50 rounded-lg">
                <div className="text-violet-500">利用可能</div>
                <div className="font-bold text-violet-700">{(m.user.pointWallet?.availablePointsBalance ?? 0).toLocaleString()} pt</div>
              </div>
            </div>

            <div className="space-y-3">
              {/* ポイント種別 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ポイント種別</label>
                <div className="flex gap-2">
                  {(["manual", "external"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPointAdjType(t)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${
                        pointAdjType === t
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {t === "manual" ? "手動ポイント" : "外部ポイント"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 金額入力 */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {pointAdjMode === "add" ? "加算" : "減算"}ポイント数
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={pointAdjAmount}
                    onChange={(e) => setPointAdjAmount(e.target.value)}
                    placeholder="例: 100"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">pt</span>
                </div>
              </div>

              {/* 理由・メモ */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">理由・メモ <span className="text-rose-500">*</span></label>
                <textarea
                  value={pointAdjDesc}
                  onChange={(e) => setPointAdjDesc(e.target.value)}
                  placeholder="例: 管理者手動調整"
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
              </div>

              {pointAdjError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                  <i className="fas fa-exclamation-circle mr-1" />{pointAdjError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPointAdjModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  キャンセル
                </button>
                <button
                  onClick={handlePointAdjust}
                  disabled={pointAdjSaving}
                  className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition disabled:opacity-50 ${
                    pointAdjMode === "add" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"
                  }`}
                >
                  {pointAdjSaving ? "処理中..." : `${pointAdjMode === "add" ? "加算" : "減算"}する`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 組織情報 ─── */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <SectionHeader title="紹介者（ユニレベル）" icon="fas fa-user-tie"
            onEdit={() => {
              setRelSearchCode({ referrer: "", upline: "" });
              setRelSearchResult({ referrer: null, upline: null });
              setRelSearchError({ referrer: null, upline: null });
              setEditSection("relations");
            }} />
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
          <SectionHeader title="直上者（マトリックス）" icon="fas fa-sitemap"
            onEdit={() => {
              setRelSearchCode({ referrer: "", upline: "" });
              setRelSearchResult({ referrer: null, upline: null });
              setRelSearchError({ referrer: null, upline: null });
              setEditSection("relations");
            }} />
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
                  <th className="px-4 py-2.5 text-left text-xs font-semibold">紹介者</th>
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
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {child.referrer ? (
                        <div>
                          <Link href={`/admin/mlm-members/${child.referrer.id}`} className="font-mono text-blue-600 hover:underline text-[11px]">
                            {child.referrer.memberCode}
                          </Link>
                          <div className="text-slate-500">{child.referrer.companyName || child.referrer.user.name}</div>
                          {child.referrer.memberCode === m.memberCode && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 rounded px-1">直上者と同一</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
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
            <FormField label="生年月日">
              <JpDatePicker value={String(editData.birthDate ?? "")} onChange={v => set("birthDate", v)} />
            </FormField>
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
            <FormField label="契約締結日">
              <JpDatePicker value={String(editData.contractDate ?? "")} onChange={v => set("contractDate", v)} />
            </FormField>
            <FormField label="初回入金日">
              <JpDatePicker value={String(editData.firstPayDate ?? "")} onChange={v => set("firstPayDate", v)} />
            </FormField>
            <FormField label="マイページパスワード変更（6文字以上）">
              <input type="text" className={inputCls} value={String(editData.newPassword ?? "")} onChange={e => set("newPassword", e.target.value)} placeholder="変更する場合のみ入力" />
            </FormField>
          </div>

          {/* クレジットカード情報（クレディックス）3枠 */}
          <div className="md:col-span-2 mt-2">
            <p className="text-xs font-bold text-slate-600 mb-2">💳 クレジットカード情報（クレディックス）</p>
            {/* ★修正③: 入力ガイドを追加（誤入力防止） */}
            <div className="mb-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              <span className="font-bold">💡 決済ID入力ルール：</span>
              クレディックスCSV照合に使用します。<br />
              正しい形式：<code className="bg-blue-100 px-1 rounded font-mono">WC1234567</code> または <code className="bg-blue-100 px-1 rounded font-mono">1234567</code>（数字のみ）<br />
              <span className="text-red-600 font-semibold">❌ NG例：</span><code className="bg-red-100 px-1 rounded font-mono">WC 1234567</code>（スペース）、<code className="bg-red-100 px-1 rounded font-mono">WC-1234567</code>（ハイフン）→ 保存時に自動修正されます
            </div>
            <div className="space-y-3">
              {([
                { label: "①", idKey: "creditCardId", expiryKey: "creditCardExpiry", last4Key: "creditCardLast4" },
                { label: "②", idKey: "creditCardId2", expiryKey: "creditCardExpiry2", last4Key: "creditCardLast4_2" },
                { label: "③", idKey: "creditCardId3", expiryKey: "creditCardExpiry3", last4Key: "creditCardLast4_3" },
              ] as const).map((card) => {
                // ★修正③: プレビュー正規化（入力中に照合形式をリアルタイム表示）
                const rawId = String(editData[card.idKey] ?? "");
                const previewNorm = (() => {
                  const s = rawId.replace(/[\u3000\t\r\n]/g, " ").trim();
                  if (!s || s === "-") return null;
                  const wcT = s.match(/^WC[\s\-_]*(\d+)$/i);
                  if (wcT) return `WC${wcT[1]}`;
                  if (/^\d+$/.test(s)) return s;
                  return null;
                })();
                const hasFormatIssue = rawId.trim() !== "" && previewNorm === null;
                const willBeAutoFixed = rawId.trim() !== previewNorm && previewNorm !== null && rawId.trim() !== "";
                return (
                  <div key={card.label} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500">カード {card.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField label="決済ID（照合キー）">
                        <input
                          className={`${inputCls} ${hasFormatIssue ? "border-red-400 bg-red-50" : willBeAutoFixed ? "border-amber-400 bg-amber-50" : ""}`}
                          value={rawId}
                          onChange={e => set(card.idKey, e.target.value)}
                          placeholder="例: WC1234567 または 1234567"
                        />
                        {/* ★修正③: 照合形式プレビュー */}
                        {previewNorm && willBeAutoFixed && (
                          <p className="text-[10px] text-amber-600 mt-0.5">保存時に自動修正 → <code className="font-mono bg-amber-100 px-1 rounded">{previewNorm}</code></p>
                        )}
                        {hasFormatIssue && (
                          <p className="text-[10px] text-red-600 mt-0.5">⚠️ 照合できない形式です。WC＋数字 or 数字のみで入力してください</p>
                        )}
                        {previewNorm && !willBeAutoFixed && (
                          <p className="text-[10px] text-green-600 mt-0.5">✅ 照合キー: <code className="font-mono bg-green-50 px-1 rounded">{previewNorm}</code></p>
                        )}
                      </FormField>
                      <FormField label="有効期限（MM/YY）">
                        <input
                          className={inputCls}
                          value={String(editData[card.expiryKey] ?? "")}
                          onChange={e => set(card.expiryKey, e.target.value)}
                          placeholder="例: 12/28"
                          maxLength={5}
                        />
                      </FormField>
                      <FormField label="下4桁">
                        <input
                          className={inputCls}
                          value={String(editData[card.last4Key] ?? "")}
                          onChange={e => set(card.last4Key, e.target.value)}
                          placeholder="例: 1234"
                          maxLength={4}
                        />
                      </FormField>
                    </div>
                  </div>
                );
              })}
            </div>
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

          {/* ── ゆうちょ銀行 記号番号変換ツール ── */}
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-700 mb-3">
              <i className="fas fa-exchange-alt mr-1" />
              🏣 ゆうちょ銀行 記号番号 → 振込用口座情報 変換
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">記号（5桁）</label>
                <input
                  className={inputCls + " font-mono"}
                  placeholder="例: 10020"
                  maxLength={7}
                  value={yuchoKigo}
                  onChange={e => { setYuchoKigo(e.target.value); setYuchoResult(null); setYuchoError(null); }}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">番号（8桁）</label>
                <input
                  className={inputCls + " font-mono"}
                  placeholder="例: 12345671"
                  maxLength={9}
                  value={yuchoBango}
                  onChange={e => { setYuchoBango(e.target.value); setYuchoResult(null); setYuchoError(null); }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleYuchoConvert}
              className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-4 transition-colors"
            >
              変換する
            </button>
            {yuchoError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">⚠ {yuchoError}</p>
            )}
            {yuchoResult && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-white p-3 space-y-1">
                <p className="text-xs font-bold text-amber-700 mb-2">✅ 変換結果</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">銀行コード</span><span className="font-mono font-bold">{yuchoResult.bankCode}</span>
                  <span className="text-slate-500">銀行名</span><span className="font-bold">{yuchoResult.bankName}</span>
                  <span className="text-slate-500">支店コード</span><span className="font-mono font-bold">{yuchoResult.branchCode}</span>
                  <span className="text-slate-500">支店名</span><span className="font-bold">{yuchoResult.branchName}</span>
                  <span className="text-slate-500">口座種別</span><span className="font-bold">{yuchoResult.accountType}</span>
                  <span className="text-slate-500">口座番号</span><span className="font-mono font-bold">{yuchoResult.accountNumber}</span>
                </div>
                {/* 反映先ボタン：報酬振込先 ／ 引き落とし先 の2択 */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={applyYuchoResult}
                    className="rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold py-2 px-3 transition-colors"
                  >
                    📥 報酬振込先口座に反映
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!yuchoResult) return;
                      set("regBankCode",    yuchoResult.bankCode);
                      set("regBankName",    yuchoResult.bankName);
                      set("regBranchCode",  yuchoResult.branchCode);
                      set("regBankBranch",  yuchoResult.branchName);
                      set("regAccountType", yuchoResult.accountType);
                      set("regAccountNumber", yuchoResult.accountNumber);
                      setYuchoResult(null);
                      setYuchoKigo("");
                      setYuchoBango("");
                    }}
                    className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3 transition-colors"
                  >
                    💳 引き落とし先口座に反映
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 報酬振込先口座 ── */}
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

          {/* ── 引き落とし先口座 ── */}
          <div className="flex items-center justify-between mt-5 mb-2">
            <p className="text-xs font-bold text-teal-700">💳 引き落とし先口座（クレジット/振替）</p>
            <button
              type="button"
              onClick={() => {
                set("regBankCode",    String(editData.bankCode    ?? ""));
                set("regBankName",    String(editData.bankName    ?? ""));
                set("regBranchCode",  String(editData.branchCode  ?? ""));
                set("regBankBranch",  String(editData.branchName  ?? ""));
                set("regAccountType", String(editData.accountType ?? "普通"));
                set("regAccountNumber", String(editData.accountNumber ?? ""));
                set("regAccountHolder", String(editData.accountHolder ?? ""));
              }}
              className="flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-teal-50 border border-slate-300 hover:border-teal-400 text-slate-600 hover:text-teal-700 text-xs font-bold py-1.5 px-3 transition-colors"
            >
              <i className="fas fa-copy text-[10px]" /> 報酬振込先からコピー
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="銀行コード"><input className={inputCls} value={String(editData.regBankCode ?? "")} onChange={e => set("regBankCode", e.target.value)} /></FormField>
            <FormField label="銀行名"><input className={inputCls} value={String(editData.regBankName ?? "")} onChange={e => set("regBankName", e.target.value)} /></FormField>
            <FormField label="支店コード"><input className={inputCls} value={String(editData.regBranchCode ?? "")} onChange={e => set("regBranchCode", e.target.value)} /></FormField>
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

      {/* ─── 会員削除 確認モーダル ─── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setDeleteModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <i className="fas fa-exclamation-triangle text-red-600 text-lg"></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">会員を削除しますか？</h3>
                <p className="text-xs text-slate-500 mt-0.5">この操作は取り消せません</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-800 space-y-1">
              <p className="font-bold">⚠️ 削除されるデータ</p>
              <p>• 会員情報・ログイン情報（User）</p>
              <p>• 購入履歴・注文履歴</p>
              <p>• ポイントウォレット・取引履歴</p>
              <p>• ボーナス計算結果</p>
              <p>• オートシップ注文履歴</p>
              <p className="font-bold mt-1">🔄 自動処理</p>
              <p>• 継続購入（オートシップ）を自動停止</p>
              <p>• ダウンラインの上位リンクを解除</p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                確認のため会員コード（<span className="font-mono text-red-600">{m.memberCode}</span>）を入力してください
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => { setDeleteConfirmText(e.target.value); setDeleteError(null); }}
                placeholder={m.memberCode}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 font-mono"
              />
              {deleteError && (
                <p className="text-red-600 text-xs mt-1">
                  <i className="fas fa-exclamation-circle mr-1"></i>{deleteError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== m.memberCode}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40 transition"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    削除中...
                  </span>
                ) : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 紹介者・直上者変更 モーダル ─── */}
      {editSection === "relations" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-auto"
          onClick={() => setEditSection(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">
                <i className="fas fa-project-diagram mr-2 text-violet-600"></i>紹介者・直上者を変更
              </h3>
              <button onClick={() => setEditSection(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <div className="px-5 py-4 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-bold mb-1">⚠️ 注意</p>
                <p>• 組織構造（ボーナス計算）に影響します。変更は慎重に行ってください。</p>
                <p>• 変更しない項目は空欄のままにしてください。</p>
                <p>• クリアボタンで現在の設定をなしにできます。</p>
              </div>

              {/* 紹介者変更 */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">
                    <i className="fas fa-user-tie mr-1.5 text-violet-500"></i>紹介者（ユニレベル）
                  </p>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    現在: {m.referrer ? `${m.referrer.memberCode} ${displayName(m.referrer)}` : "なし"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={relSearchCode.referrer === "__CLEAR__" ? "" : relSearchCode.referrer}
                    onChange={e => {
                      setRelSearchCode(s => ({ ...s, referrer: e.target.value }));
                      setRelSearchResult(s => ({ ...s, referrer: null }));
                      setRelSearchError(s => ({ ...s, referrer: null }));
                    }}
                    placeholder="会員コードを入力（例: 123456-01）"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                  />
                  <button
                    onClick={() => searchRelMember("referrer")}
                    disabled={relSearching.referrer || !relSearchCode.referrer.trim()}
                    className="px-3 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition whitespace-nowrap"
                  >
                    {relSearching.referrer ? "検索中..." : "検索"}
                  </button>
                  {m.referrer && (
                    <button
                      onClick={() => {
                        setRelSearchCode(s => ({ ...s, referrer: "__CLEAR__" }));
                        setRelSearchResult(s => ({ ...s, referrer: null }));
                        setRelSearchError(s => ({ ...s, referrer: null }));
                      }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                        relSearchCode.referrer === "__CLEAR__"
                          ? "bg-red-600 text-white border-red-600"
                          : "border-red-300 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      クリア
                    </button>
                  )}
                </div>
                {relSearchError.referrer && (
                  <p className="text-xs text-red-600"><i className="fas fa-exclamation-circle mr-1"></i>{relSearchError.referrer}</p>
                )}
                {relSearchResult.referrer && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
                    <i className="fas fa-check-circle text-green-600"></i>
                    <span className="font-mono font-bold">{relSearchResult.referrer.memberCode}</span>
                    <span>{relSearchResult.referrer.name}</span>
                    <span className="text-green-600 ml-auto">← 新紹介者に設定</span>
                  </div>
                )}
                {relSearchCode.referrer === "__CLEAR__" && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
                    <i className="fas fa-times-circle text-red-600"></i>
                    <span>紹介者をなしにします</span>
                  </div>
                )}
              </div>

              {/* 直上者変更 */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700">
                    <i className="fas fa-sitemap mr-1.5 text-blue-500"></i>直上者（マトリックス）
                  </p>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    現在: {m.upline ? `${m.upline.memberCode} ${displayName(m.upline)}` : "なし"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={relSearchCode.upline === "__CLEAR__" ? "" : relSearchCode.upline}
                    onChange={e => {
                      setRelSearchCode(s => ({ ...s, upline: e.target.value }));
                      setRelSearchResult(s => ({ ...s, upline: null }));
                      setRelSearchError(s => ({ ...s, upline: null }));
                    }}
                    placeholder="会員コードを入力（例: 123456-01）"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 font-mono"
                  />
                  <button
                    onClick={() => searchRelMember("upline")}
                    disabled={relSearching.upline || !relSearchCode.upline.trim()}
                    className="px-3 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition whitespace-nowrap"
                  >
                    {relSearching.upline ? "検索中..." : "検索"}
                  </button>
                  {m.upline && (
                    <button
                      onClick={() => {
                        setRelSearchCode(s => ({ ...s, upline: "__CLEAR__" }));
                        setRelSearchResult(s => ({ ...s, upline: null }));
                        setRelSearchError(s => ({ ...s, upline: null }));
                      }}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap ${
                        relSearchCode.upline === "__CLEAR__"
                          ? "bg-red-600 text-white border-red-600"
                          : "border-red-300 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      クリア
                    </button>
                  )}
                </div>
                {relSearchError.upline && (
                  <p className="text-xs text-red-600"><i className="fas fa-exclamation-circle mr-1"></i>{relSearchError.upline}</p>
                )}
                {relSearchResult.upline && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
                    <i className="fas fa-check-circle text-green-600"></i>
                    <span className="font-mono font-bold">{relSearchResult.upline.memberCode}</span>
                    <span>{relSearchResult.upline.name}</span>
                    <span className="text-green-600 ml-auto">← 新直上者に設定</span>
                  </div>
                )}
                {relSearchCode.upline === "__CLEAR__" && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
                    <i className="fas fa-times-circle text-red-600"></i>
                    <span>直上者をなしにします</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
              <button
                onClick={handleRelSave}
                disabled={relSaving || (
                  relSearchResult.referrer === null && relSearchCode.referrer !== "__CLEAR__" &&
                  relSearchResult.upline === null && relSearchCode.upline !== "__CLEAR__"
                )}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition"
              >
                {relSaving ? "保存中..." : "変更を保存する"}
              </button>
              <button
                onClick={() => setEditSection(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 継続購入設定 編集 */}
      {editSection === "autoship" && (
        <EditModal title="継続購入設定を編集" onClose={() => setEditSection(null)} onSave={handleSave} saving={saving}>
          {/* 有効条件の説明 */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1 mb-1">
            <p className="font-bold text-blue-700">📌 継続購入の有効条件</p>
            <p>• <strong>継続購入を有効にするチェックあり</strong> ＋ <strong>停止日なし（空欄）</strong> → 毎月継続購入が有効（開始日は任意）</p>
            <p>• <strong>開始日を入力した場合</strong>: その日付以降から継続購入が開始されます</p>
            <p>• <strong>停止日を入力した場合</strong>: その日付以降は停止されます</p>
            <p>• いずれの場合も、支払い方法欄に設定した支払方法が適用されます</p>
            <p>• 停止日は手動で入力した場合のみ反映されます。空欄のまま保存すると停止日はクリアされます</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                <input type="checkbox" checked={Boolean(editData.autoshipEnabled)} onChange={e => set("autoshipEnabled", e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <div>
                  <span className="text-sm font-semibold">継続購入を有効にする</span>
                  <p className="text-xs text-slate-500">チェックを入れるだけで有効になります（開始日は任意）。支払い方法欄に設定した方法が適用されます</p>
                </div>
              </label>
            </div>
            <FormField label="開始日">
              <JpDatePicker value={String(editData.autoshipStartDate ?? "")} onChange={v => set("autoshipStartDate", v)} />
            </FormField>
            <FormField label="停止日">
              <div className="space-y-1">
                <div>
                  <JpDatePicker
                    value={String(editData.autoshipStopDate ?? "")}
                    onChange={v => set("autoshipStopDate", v)}
                    clearable
                  />
                  {!editData.autoshipStopDate && (
                    <p className="text-xs text-slate-400 mt-1">空欄 = 停止なし（継続中）</p>
                  )}
                </div>
                {/* 現在DBに保存されている停止日を表示 */}
                {editData._currentStopDate ? (
                  <p className="text-xs text-amber-600">
                    ⚠️ 現在の停止日: <strong>{String(editData._currentStopDate)}</strong>
                    　空欄で保存すると停止日がクリアされます
                  </p>
                ) : (
                  <p className="text-xs text-green-600">✅ 現在の停止日: 未設定（継続中）</p>
                )}
              </div>
            </FormField>
            <FormField label="停止月（カンマ区切り例: 2025-01,2025-02）">
              <input className={inputCls} value={String(editData.autoshipSuspendMonths ?? "")} onChange={e => set("autoshipSuspendMonths", e.target.value)} placeholder="2025-01,2025-02" />
            </FormField>
            <FormField label="支払い方法">
              <select className={selectCls} value={String(editData.paymentMethod ?? "credit_card")} onChange={e => set("paymentMethod", e.target.value)}>
                <option value="credit_card">クレジットカード</option>
                <option value="bank_transfer">口座引き落とし</option>
                <option value="bank_payment">銀行振込</option>
                <option value="cod">代引き</option>
                <option value="other">その他</option>
              </select>
            </FormField>
          </div>
          {/* 有効状態プレビュー */}
          <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${
            editData.autoshipEnabled && !editData.autoshipStopDate
              ? "bg-green-50 border border-green-200 text-green-800"
              : editData.autoshipEnabled && editData.autoshipStopDate
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-gray-50 border border-gray-200 text-gray-600"
          }`}>
            <strong>設定プレビュー: </strong>
            {editData.autoshipEnabled && !editData.autoshipStopDate
              ? editData.autoshipStartDate
                ? `✅ 毎月継続購入が有効（${String(editData.autoshipStartDate)} 開始・停止日なし）`
                : `✅ 毎月継続購入が有効（開始日なし・即時有効・停止日なし）`
              : editData.autoshipEnabled && editData.autoshipStopDate
              ? `⏹️ ${String(editData.autoshipStopDate)} 以降停止予定`
              : "❌ 継続購入無効"}
          </div>
        </EditModal>
      )}
    </main>
  );
}
