"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEVEL_LABELS, MEMBER_TYPE_LABELS } from "@/lib/mlm-bonus";
import MemberStatsSummary from "@/app/admin/ui/member-stats-summary";

/* ─── 型定義 ─── */
type MlmMemberRow = {
  id: string;
  userId: string;
  memberCode: string;
  memberType: "business" | "preferred";
  status: string;
  currentLevel: number;
  titleLevel: number;
  conditionAchieved: boolean;
  forceActive: boolean;
  forceLevel: number | null;
  contractDate: string | null;
  autoshipEnabled: boolean;
  autoshipStartDate: string | null;
  autoshipStopDate: string | null;
  autoshipSuspendMonths: string | null;
  paymentMethod: "credit_card" | "bank_transfer" | "bank_payment";
  savingsPoints: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userPostalCode: string | null;
  nickname: string | null;
  birthDate: string | null;
  avatarUrl?: string | null;
  downlineCount: number;
  referralCount: number;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  active:    "活動中",
  autoship:  "オートシップ",
  lapsed:    "失効",
  suspended: "停止",
  withdrawn: "退会",
  midCancel: "中途解約",
};

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  autoship:  "bg-blue-100 text-blue-700",
  lapsed:    "bg-red-100 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
  withdrawn: "bg-slate-100 text-slate-500",
  midCancel: "bg-slate-100 text-slate-400",
};

const SEARCH_FIELD_LABELS: Record<string, string> = {
  all:          "すべて",
  memberCode:   "会員コード",
  name:         "名前",
  nickname:     "ニックネーム",
  phone:        "電話番号",
  postalCode:   "郵便番号",
  birthDate:    "生年月日",
  contractDate: "契約締結日",
};

/* ─── 編集モーダル ─── */
function EditModal({
  member,
  onClose,
  onSave,
}: {
  member: MlmMemberRow;
  onClose: () => void;
  onSave: (id: string, updates: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    memberType: member.memberType,
    status: member.status,
    conditionAchieved: member.conditionAchieved,
    forceActive: member.forceActive,
    forceLevel: member.forceLevel?.toString() ?? "",
    contractDate: member.contractDate ? member.contractDate.slice(0, 10) : "",
    autoshipEnabled: member.autoshipEnabled,
    autoshipStartDate: member.autoshipStartDate ? member.autoshipStartDate.slice(0, 10) : "",
    autoshipStopDate: member.autoshipStopDate ? member.autoshipStopDate.slice(0, 10) : "",
    autoshipSuspendMonths: member.autoshipSuspendMonths ?? "",
    paymentMethod: member.paymentMethod,
    titleLevel: member.titleLevel.toString(),
    savingsPoints: member.savingsPoints.toString(),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(member.id, {
        memberType: form.memberType,
        status: form.status,
        conditionAchieved: form.conditionAchieved,
        forceActive: form.forceActive,
        forceLevel: form.forceLevel !== "" ? parseInt(form.forceLevel) : null,
        contractDate: form.contractDate || null,
        autoshipEnabled: form.autoshipEnabled,
        autoshipStartDate: form.autoshipStartDate || null,
        autoshipStopDate: form.autoshipStopDate || null,
        autoshipSuspendMonths: form.autoshipSuspendMonths || null,
        paymentMethod: form.paymentMethod,
        titleLevel: parseInt(form.titleLevel),
        savingsPoints: parseInt(form.savingsPoints),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">会員編集: {member.userName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="space-y-3">
          {/* 会員タイプ */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">会員タイプ</label>
            <select
              value={form.memberType}
              onChange={(e) => setForm({ ...form, memberType: e.target.value as "business" | "preferred" })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              <option value="business">ビジネス会員</option>
              <option value="preferred">愛用会員</option>
            </select>
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ステータス</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* 契約締結日 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">契約締結日</label>
            <input
              type="date"
              value={form.contractDate}
              onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </div>

          {/* 称号レベル */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">称号レベル（手動設定）</label>
            <select
              value={form.titleLevel}
              onChange={(e) => setForm({ ...form, titleLevel: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              {[0, 1, 2, 3, 4, 5].map((lv) => (
                <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>
              ))}
            </select>
          </div>

          {/* 強制レベル */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">強制レベル（空欄=通常計算）</label>
            <select
              value={form.forceLevel}
              onChange={(e) => setForm({ ...form, forceLevel: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              <option value="">通常計算</option>
              {[0, 1, 2, 3, 4, 5].map((lv) => (
                <option key={lv} value={lv}>{LEVEL_LABELS[lv]}</option>
              ))}
            </select>
          </div>

          {/* オートシップ開始日 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">オートシップ開始日</label>
            <input
              type="date"
              value={form.autoshipStartDate}
              onChange={(e) => setForm({ ...form, autoshipStartDate: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </div>

          {/* オートシップ停止日 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">オートシップ停止日</label>
            <input
              type="date"
              value={form.autoshipStopDate}
              onChange={(e) => setForm({ ...form, autoshipStopDate: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </div>

          {/* オートシップ休止月 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              オートシップ休止月（カンマ区切り: 2026-04,2026-05）
            </label>
            <input
              type="text"
              value={form.autoshipSuspendMonths}
              onChange={(e) => setForm({ ...form, autoshipSuspendMonths: e.target.value })}
              placeholder="例: 2026-04,2026-05"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
            <p className="text-xs text-slate-500 mt-1">休止月を過ぎると自動で再開されます</p>
          </div>

          {/* 支払い方法 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">支払い方法</label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as "credit_card" | "bank_transfer" | "bank_payment" })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              <option value="credit_card">💳 クレジットカード（クレディックス）</option>
              <option value="bank_transfer">🏦 口座振替（三菱UFJファクター）</option>
              <option value="bank_payment">💵 銀行振込</option>
            </select>
          </div>

          {/* 貯金ポイント */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">貯金ポイント累計</label>
            <input
              type="number"
              value={form.savingsPoints}
              onChange={(e) => setForm({ ...form, savingsPoints: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            />
          </div>

          {/* チェックボックス系 */}
          <div className="space-y-2">
            {[
              { key: "conditionAchieved", label: "条件達成（レベルアップ条件③）" },
              { key: "forceActive", label: "強制アクティブ（条件無視でActive扱い）" },
              { key: "autoshipEnabled", label: "オートシップ有効" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[item.key as keyof typeof form] as boolean}
                  onChange={(e) =>
                    setForm({ ...form, [item.key]: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── メインページ ─── */
export default function MlmMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MlmMemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [memberType, setMemberType] = useState("");
  const [status, setStatus] = useState("");
  const [editTarget, setEditTarget] = useState<MlmMemberRow | null>(null);
  const [page, setPage] = useState(1);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(search && { search }),
        ...(searchField && searchField !== "all" && { searchField }),
        ...(memberType && { memberType }),
        ...(status && { status }),
      });
      const res = await fetch(`/api/admin/mlm-members?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error ?? `APIエラー (HTTP ${res.status})`);
        setMembers([]);
        setTotal(0);
      } else {
        setMembers(data.members ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (e) {
      setApiError(`ネットワークエラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, searchField, memberType, status]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleSave = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch("/api/admin/mlm-members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "更新に失敗しました");
      return;
    }
    await fetchMembers();
  };

  const handleRowClick = (m: MlmMemberRow) => {
    router.push(`/admin/mlm-members/${m.id}`);
  };

  const fmtDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getSearchPlaceholder = () => {
    switch (searchField) {
      case "memberCode":   return "例: 123456-01";
      case "name":         return "例: 山田太郎";
      case "nickname":     return "例: たろう";
      case "phone":        return "例: 090-1234-5678";
      case "postalCode":   return "例: 020-0026";
      case "birthDate":    return "例: 1990-01-01 または 1990-01";
      case "contractDate": return "例: 2024-04-01 または 2024-04";
      default:             return "名前・メール・会員コード・電話番号など...";
    }
  };

  return (
    <main className="space-y-6">
      {/* MLM統計サマリー */}
      <MemberStatsSummary show={["mlm"]} compact />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">👥 MLM会員管理</h1>
          <p className="text-sm text-slate-600 mt-1">
            会員タイプ・レベル・条件達成・強制アクティブなどを管理します。行をクリックで会員詳細へ。
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/mlm-members/new"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
          >
            ＋ 新規登録
          </Link>
          <Link
            href="/admin/bonus-calculate"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition"
          >
            🧮 ボーナス計算へ
          </Link>
        </div>
      </div>

      {/* フィルター */}
      <div className="rounded-3xl bg-white p-5 shadow-sm space-y-3">
        {/* 検索フィールド選択 + 検索ワード */}
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">検索項目</label>
            <select
              value={searchField}
              onChange={(e) => { setSearchField(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
            >
              {Object.entries(SEARCH_FIELD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">検索ワード</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={getSearchPlaceholder()}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchMembers(); } }}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button
                onClick={() => { setPage(1); fetchMembers(); }}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 transition"
              >
                検索
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">　</label>
            <button
              onClick={() => { setSearch(""); setSearchField("all"); setMemberType(""); setStatus(""); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              ✕ リセット
            </button>
          </div>
        </div>

        {/* フィルター行 */}
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={memberType}
            onChange={(e) => { setMemberType(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
          >
            <option value="">全会員タイプ</option>
            <option value="business">ビジネス会員</option>
            <option value="preferred">愛用会員</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
          >
            <option value="">全ステータス</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="flex items-center text-sm text-slate-500">
            全 <span className="font-bold text-slate-800 mx-1">{total}</span>件
          </div>
        </div>
      </div>

      {/* APIエラー表示 */}
      {apiError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>エラー:</strong> {apiError}
        </div>
      )}

      {/* テーブル */}
      <div className="rounded-3xl bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="py-3 px-4 text-left text-slate-600 font-semibold">会員</th>
              <th className="py-3 px-4 text-left text-slate-600 font-semibold">電話・郵便番号</th>
              <th className="py-3 px-4 text-left text-slate-600 font-semibold">生年月日</th>
              <th className="py-3 px-4 text-left text-slate-600 font-semibold">契約締結日</th>
              <th className="py-3 px-4 text-center text-slate-600 font-semibold">タイプ</th>
              <th className="py-3 px-4 text-center text-slate-600 font-semibold">ステータス</th>
              <th className="py-3 px-4 text-center text-slate-600 font-semibold">当月LV</th>
              <th className="py-3 px-4 text-right text-slate-600 font-semibold">下位</th>
              <th className="py-3 px-4 text-right text-slate-600 font-semibold">貯金pt</th>
              <th className="py-3 px-4 text-center text-slate-600 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">読み込み中...</td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  会員が見つかりません
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-slate-50 hover:bg-violet-50 cursor-pointer transition"
                  onClick={() => handleRowClick(m)}
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{m.userName}</div>
                    {m.nickname && (
                      <div className="text-xs text-violet-600">「{m.nickname}」</div>
                    )}
                    <div className="text-xs text-slate-500">{m.memberCode}</div>
                    <div className="text-xs text-slate-400">{m.userEmail}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs text-slate-600">{m.userPhone ?? "—"}</div>
                    <div className="text-xs text-slate-400">{m.userPostalCode ?? "—"}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {fmtDate(m.birthDate)}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {fmtDate(m.contractDate)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      m.memberType === "business"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {MEMBER_TYPE_LABELS[m.memberType] ?? m.memberType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[m.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                    {m.forceActive && (
                      <div className="text-xs text-orange-600 mt-0.5 font-semibold">⚡強制Active</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center text-xs font-bold text-violet-700">
                    {LEVEL_LABELS[m.currentLevel] ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-slate-600">
                    ↓{m.downlineCount}名
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-slate-600">
                    {m.savingsPoints.toLocaleString()}pt
                  </td>
                  <td
                    className="py-3 px-4 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-2 justify-center">
                      <Link
                        href={`/admin/mlm-members/${m.id}`}
                        className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-200 transition"
                      >
                        詳細
                      </Link>
                      <button
                        onClick={() => setEditTarget(m)}
                        className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-violet-100 hover:text-violet-700 transition"
                      >
                        編集
                      </button>
                      <a
                        href={`/admin/print/registration-complete?memberId=${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200 transition"
                      >
                        登録完了通知書
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
          >
            ← 前へ
          </button>
          <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm">
            {page} / {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40"
          >
            次へ →
          </button>
        </div>
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <EditModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
