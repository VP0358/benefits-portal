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

type OrgChartData = {
  year: number;
  month: number;
  me: {
    id: string;
    name: string;
    memberCode: string;
    avatarUrl: string | null;
  };
  members: MemberNode[];
};

/* ─── ユーティリティ ─── */
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function AvatarIcon({
  avatarUrl,
  name,
  size = "md",
}: {
  avatarUrl: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg"
    ? "w-16 h-16 text-3xl"
    : size === "sm"
    ? "w-8 h-8 text-base"
    : "w-12 h-12 text-2xl";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border-2 border-white shadow`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-slate-200 flex items-center justify-center`}>
      😊
    </div>
  );
}

/* ─── 会員カード ─── */
function MemberCard({ member, month, year }: { member: MemberNode; month: number; year: number }) {
  const [expanded, setExpanded] = useState(false);

  // 支払い状態に応じた色・アイコン
  const payStatus = member.hasPaidThisMonth
    ? { icon: "😊", label: "当月支払済", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" }
    : member.hasActiveContract
    ? { icon: "😢", label: "当月未払い", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" }
    : { icon: "💤", label: "契約なし", bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-500" };

  return (
    <div className={`rounded-2xl border-2 ${payStatus.border} ${payStatus.bg} overflow-hidden transition-all`}>
      {/* ヘッダー部分 */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {/* アバター + 支払いアイコン */}
        <div className="relative flex-shrink-0">
          <AvatarIcon avatarUrl={member.avatarUrl} name={member.name} size="md" />
          <span className="absolute -bottom-1 -right-1 text-lg leading-none">{payStatus.icon}</span>
        </div>

        {/* 名前・会員コード */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate">{member.name}</div>
          <div className="text-xs text-slate-500">{member.memberCode}</div>
          {/* 最初の契約プランを表示 */}
          {member.contracts[0] && (
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              📱 {member.contracts[0].planName}
            </div>
          )}
        </div>

        {/* 支払いバッジ */}
        <div className="flex-shrink-0 text-right">
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${payStatus.border} ${payStatus.text}`}>
            {payStatus.icon} {payStatus.label}
          </span>
          <div className="mt-1 text-xs text-slate-400">
            {expanded ? "▲ 閉じる" : "▼ 詳細"}
          </div>
        </div>
      </button>

      {/* 展開時：契約詳細 */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 space-y-2 bg-white/70">
          {member.contracts.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">有効な契約はありません</p>
          ) : (
            member.contracts.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-3 ${
                  c.isPaidThisMonth
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{c.planName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      契約日: {fmtDate(c.startedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-800">
                      ¥{c.monthlyFee.toLocaleString()}<span className="text-xs font-normal">/月</span>
                    </div>
                    <div className={`text-xs font-semibold mt-0.5 ${c.isPaidThisMonth ? "text-emerald-600" : "text-amber-600"}`}>
                      {c.isPaidThisMonth ? `😊 ${year}/${month}月 支払済` : `😢 ${year}/${month}月 未払い`}
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

/* ─── メインページ ─── */
export default function OrgChartPage() {
  const [data, setData] = useState<OrgChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my/org-chart")
      .then((r) => {
        if (!r.ok) throw new Error("取得に失敗しました");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("データを読み込めませんでした"))
      .finally(() => setLoading(false));
  }, []);

  const paidCount = data?.members.filter((m) => m.hasPaidThisMonth).length ?? 0;
  const unpaidCount = data?.members.filter((m) => !m.hasPaidThisMonth && m.hasActiveContract).length ?? 0;
  const noContractCount = data?.members.filter((m) => !m.hasActiveContract).length ?? 0;

  return (
    <div className="min-h-screen bg-[#e6f2dc] py-6 px-4">
      <div className="mx-auto max-w-lg space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 text-sm">
            ← ダッシュボード
          </Link>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">🌳 直紹介 組織図</h1>
          {data && (
            <p className="text-sm text-slate-500 mt-1">
              {data.year}年{data.month}月 · 直紹介 {data.members.length}名
            </p>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl bg-white p-10 text-center text-slate-400 shadow-sm">
            読み込み中...
          </div>
        )}

        {error && (
          <div className="rounded-3xl bg-red-50 border border-red-200 p-6 text-center text-red-600 text-sm shadow-sm">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* 当月サマリー */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 mb-3">
                {data.year}年{data.month}月 支払い状況まとめ
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                  <div className="text-2xl mb-1">😊</div>
                  <div className="text-xs text-emerald-700 font-semibold">支払済</div>
                  <div className="text-xl font-bold text-emerald-700">{paidCount}</div>
                  <div className="text-xs text-emerald-500">名</div>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center">
                  <div className="text-2xl mb-1">😢</div>
                  <div className="text-xs text-amber-700 font-semibold">未払い</div>
                  <div className="text-xl font-bold text-amber-700">{unpaidCount}</div>
                  <div className="text-xs text-amber-500">名</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 text-center">
                  <div className="text-2xl mb-1">💤</div>
                  <div className="text-xs text-slate-500 font-semibold">契約なし</div>
                  <div className="text-xl font-bold text-slate-600">{noContractCount}</div>
                  <div className="text-xs text-slate-400">名</div>
                </div>
              </div>
            </div>

            {/* 組織図本体 */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">

              {/* 自分（頂点） */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center border-4 border-violet-300 shadow-md overflow-hidden">
                    {data.me.avatarUrl ? (
                      <img src={data.me.avatarUrl} alt={data.me.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">😊</span>
                    )}
                  </div>
                  <span className="absolute -top-1 -right-1 bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">YOU</span>
                </div>
                <div className="mt-2 text-center">
                  <div className="font-bold text-slate-800">{data.me.name}</div>
                  <div className="text-xs text-slate-500">{data.me.memberCode}</div>
                </div>
              </div>

              {/* 矢印・ライン */}
              {data.members.length > 0 && (
                <div className="flex justify-center mb-4">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-8 bg-slate-300"></div>
                    <div className="text-slate-400 text-sm">▼</div>
                    <div className="text-xs text-slate-400 mb-2">直紹介メンバー</div>
                  </div>
                </div>
              )}

              {/* 紹介メンバー一覧 */}
              {data.members.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                  <div className="text-3xl mb-2">🌱</div>
                  <div className="text-sm text-slate-500">まだ直紹介したメンバーがいません</div>
                  <Link
                    href="/referral"
                    className="mt-3 inline-block rounded-xl bg-violet-500 text-white px-4 py-2 text-sm font-semibold"
                  >
                    友達を紹介する →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.members.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      month={data.month}
                      year={data.year}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 凡例 */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 mb-2">凡例</div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>😊</span>
                  <span className="text-emerald-700">当月の携帯料金 支払い完了</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>😢</span>
                  <span className="text-amber-700">当月の携帯料金 未払い（有効契約あり）</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>💤</span>
                  <span className="text-slate-500">有効な携帯契約なし</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
