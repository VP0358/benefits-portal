"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ─── 型定義 ─── */
type ContractInfo = {
  id: string;
  planName: string;
  monthlyFee: number;
  startedAt: string | null;
  confirmedAt: string | null;
  status: string;
  isPaidThisMonth: boolean;
};

type MemberNode = {
  id: string;
  name: string;
  memberCode: string;
  avatarUrl: string | null;
  contracts: ContractInfo[];
  hasActiveContract: boolean;
  hasPaidThisMonth: boolean;
};

type OrgGroup = {
  referrer: {
    id: string;
    name: string;
    memberCode: string;
    avatarUrl: string | null;
  };
  children: MemberNode[];
};

type OrgData = {
  year: number;
  month: number;
  groups: OrgGroup[];
  summary: {
    totalPaid: number;
    totalUnpaid: number;
    totalNoContract: number;
    totalMembers: number;
  };
};

/* ─── ユーティリティ ─── */
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function AvatarIcon({ avatarUrl, name, size = "md" }: { avatarUrl: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "w-14 h-14 text-2xl" : size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-xl";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${sizeClass} rounded-full object-cover border-2 border-white shadow`} />;
  }
  return <div className={`${sizeClass} rounded-full bg-slate-200 flex items-center justify-center`}>😊</div>;
}

/* ─── 子会員カード ─── */
function ChildCard({ member, month, year }: { member: MemberNode; month: number; year: number }) {
  const [expanded, setExpanded] = useState(false);

  const payStatus = member.hasPaidThisMonth
    ? { icon: "😊", label: "支払済", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" }
    : member.hasActiveContract
    ? { icon: "😢", label: "未払い", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" }
    : { icon: "💤", label: "契約なし", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-500" };

  return (
    <div className={`rounded-xl border-2 ${payStatus.border} ${payStatus.bg} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="relative flex-shrink-0">
          <AvatarIcon avatarUrl={member.avatarUrl} name={member.name} size="sm" />
          <span className="absolute -bottom-0.5 -right-0.5 text-sm leading-none">{payStatus.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{member.name}</div>
          <div className="text-xs text-slate-500">{member.memberCode}</div>
          {member.contracts[0] && (
            <div className="text-xs text-slate-600 truncate">📱 {member.contracts[0].planName}</div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-xs font-semibold ${payStatus.text}`}>
            {payStatus.icon} {payStatus.label}
          </span>
          <div className="text-[10px] text-slate-400 mt-0.5">{expanded ? "▲" : "▼"}</div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 bg-white/70 space-y-1.5">
          <div className="pt-2 flex justify-end">
            <Link
              href={`/admin/users/${member.id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              会員詳細 →
            </Link>
          </div>
          {member.contracts.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">有効な契約はありません</p>
          ) : (
            member.contracts.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg border p-2.5 ${c.isPaidThisMonth ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{c.planName}</div>
                    <div className="text-[10px] text-slate-500">契約日: {fmtDate(c.startedAt)}</div>
                    <div className="text-[10px] text-slate-500">確定日: {fmtDate(c.confirmedAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-800">¥{c.monthlyFee.toLocaleString()}</div>
                    <div className={`text-[10px] font-semibold ${c.isPaidThisMonth ? "text-emerald-600" : "text-amber-600"}`}>
                      {c.isPaidThisMonth ? `😊 ${year}/${month}月済` : `😢 ${year}/${month}月未払`}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 紹介者グループ ─── */
function ReferrerGroup({ group, month, year }: { group: OrgGroup; month: number; year: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const paidCount = group.children.filter((c) => c.hasPaidThisMonth).length;
  const unpaidCount = group.children.filter((c) => !c.hasPaidThisMonth && c.hasActiveContract).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* 紹介者ヘッダー */}
      <div className="flex items-center gap-3 p-4 bg-slate-50 border-b border-slate-100">
        <AvatarIcon avatarUrl={group.referrer.avatarUrl} name={group.referrer.name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800">{group.referrer.name}</div>
          <div className="text-xs text-slate-500">{group.referrer.memberCode}</div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              😊 支払済 {paidCount}名
            </span>
            {unpaidCount > 0 && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                😢 未払い {unpaidCount}名
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/users/${group.referrer.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            詳細
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sm text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
          >
            {collapsed ? "▼ 展開" : "▲ 閉じる"}
          </button>
        </div>
      </div>

      {/* 子会員リスト */}
      {!collapsed && (
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 pl-2 mb-2">
            <div className="w-0.5 h-4 bg-slate-300 rounded"></div>
            <span className="text-xs text-slate-400">直紹介メンバー ({group.children.length}名)</span>
          </div>
          {group.children.map((child) => (
            <div key={child.id} className="pl-4 border-l-2 border-slate-200">
              <ChildCard member={child} month={month} year={year} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── メインコンポーネント ─── */
export default function ContractsOrgChart() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/contracts-org")
      .then((r) => {
        if (!r.ok) throw new Error("取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("データを読み込めませんでした"))
      .finally(() => setLoading(false));
  }, []);

  const filteredGroups = data?.groups.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.referrer.name.toLowerCase().includes(q) ||
      g.referrer.memberCode.toLowerCase().includes(q) ||
      g.children.some(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.memberCode.toLowerCase().includes(q)
      )
    );
  }) ?? [];

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400">
        <div className="text-4xl mb-3">🌳</div>
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-600 text-sm">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* サマリー */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-3">
          {data.year}年{data.month}月 · 直紹介関係のある会員 {data.summary.totalMembers}名
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
            <div className="text-2xl mb-1">😊</div>
            <div className="text-xs text-emerald-700 font-semibold">当月支払済</div>
            <div className="text-2xl font-bold text-emerald-700">{data.summary.totalPaid}</div>
            <div className="text-xs text-emerald-500">名</div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
            <div className="text-2xl mb-1">😢</div>
            <div className="text-xs text-amber-700 font-semibold">当月未払い</div>
            <div className="text-2xl font-bold text-amber-700">{data.summary.totalUnpaid}</div>
            <div className="text-xs text-amber-500">名</div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
            <div className="text-2xl mb-1">💤</div>
            <div className="text-xs text-slate-600 font-semibold">契約なし</div>
            <div className="text-2xl font-bold text-slate-600">{data.summary.totalNoContract}</div>
            <div className="text-xs text-slate-400">名</div>
          </div>
        </div>
      </div>

      {/* 検索 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="会員名・会員コードで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-300 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
        />
      </div>

      {/* 組織グループ一覧 */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-400 shadow-sm">
          <div className="text-4xl mb-2">🌱</div>
          {searchQuery ? "検索結果がありません" : "直紹介関係のあるデータがありません"}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <ReferrerGroup
              key={group.referrer.id}
              group={group}
              month={data.month}
              year={data.year}
            />
          ))}
        </div>
      )}

      {/* 凡例 */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold text-slate-600 mb-2">凡例</div>
        <div className="space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-2"><span>😊</span><span className="text-emerald-700">当月の携帯料金 支払い完了（confirmedAt が今月内）</span></div>
          <div className="flex items-center gap-2"><span>😢</span><span className="text-amber-700">当月の携帯料金 未払い（有効契約はある）</span></div>
          <div className="flex items-center gap-2"><span>💤</span><span className="text-slate-500">有効な携帯契約なし</span></div>
        </div>
      </div>
    </div>
  );
}
