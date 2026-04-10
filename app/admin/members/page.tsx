/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MemberActions from "./ui/member-actions";
import MemberStatsSummary from "@/app/admin/ui/member-stats-summary";

function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm  = String(dt.getMonth() + 1).padStart(2, "0");
  const dd  = String(dt.getDate()).padStart(2, "0");
  const hh  = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  const ss  = String(dt.getSeconds()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ja-JP");
}

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspended: "bg-yellow-50 text-yellow-700 border-yellow-200",
  invited:   "bg-blue-50 text-blue-700 border-blue-200",
  canceled:  "bg-red-50 text-red-700 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  active: "有効", suspended: "停止中", invited: "招待中", canceled: "契約解除済",
};

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const sp           = await searchParams;
  const statusFilter = sp.status ?? "";
  const q            = sp.q ?? "";
  const page         = Math.max(1, Number(sp.page ?? "1"));
  const tab          = sp.tab ?? "active";
  const limit        = 30;
  const skip         = (page - 1) * limit;

  // ── where 条件（any キャストで型エラーを回避）──
  const baseWhere: any =
    tab === "canceled"
      ? { status: "canceled" }
      : { status: { in: ["active", "suspended", "invited"] } };

  // アクティブタブでステータス絞り込み
  if (tab === "active" && statusFilter && statusFilter !== "canceled") {
    baseWhere.status = statusFilter;
  }

  // 検索キーワード
  if (q) {
    baseWhere.OR = [
      { name:       { contains: q } },
      { memberCode: { contains: q } },
      { email:      { contains: q } },
    ];
  }

  // ── データ取得 ──
  const [total, members, canceledCount, activeCount] = await Promise.all([
    prisma.user.count({ where: baseWhere }),
    prisma.user.findMany({
      where:   baseWhere,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        pointWallet: {
          select: { availablePointsBalance: true },
        },
        referrals: {
          where:   { isActive: true },
          include: { referrer: { select: { id: true, name: true, memberCode: true } } },
          take: 1,
        },
        contracts: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { confirmedAt: true, startedAt: true, createdAt: true },
        },
      },
    }),
    prisma.user.count({ where: { status: "canceled" } }),
    prisma.user.count({ where: { status: { in: ["active", "suspended", "invited"] } } }),
  ]);

  const pages = Math.ceil(total / limit);

  return (
    <main className="space-y-5">
      {/* 全体統計サマリー */}
      <MemberStatsSummary compact />

      {/* ページヘッダー */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Member Management
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">会員管理</h1>
          <div className="flex gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2 text-center">
              <div className="text-[11px] font-semibold text-emerald-700">有効会員</div>
              <div className="text-xl font-bold text-emerald-700">{activeCount.toLocaleString()}<span className="text-xs ml-0.5">名</span></div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2 text-center">
              <div className="text-[11px] font-semibold text-red-700">契約解除済</div>
              <div className="text-xl font-bold text-red-700">{canceledCount.toLocaleString()}<span className="text-xs ml-0.5">名</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* タブ */}
      <div className="rounded-2xl bg-white border border-stone-100 p-3 flex gap-2" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <Link
          href="/admin/members?tab=active"
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
            tab === "active" ? "text-white" : "bg-stone-50 text-stone-600 hover:bg-stone-100"
          }`}
          style={tab === "active" ? { background: "linear-gradient(135deg, #1c1917, #3d3530)", color: "#fff" } : {}}
        >
          <i className="fas fa-users mr-2 text-xs opacity-70" />
          会員一覧
          <span className="ml-2 text-xs font-bold opacity-70">{activeCount}</span>
        </Link>
        <Link
          href="/admin/members?tab=canceled"
          className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all flex items-center gap-2 ${
            tab === "canceled" ? "text-white" : "bg-red-50 text-red-700 hover:bg-red-100"
          }`}
          style={tab === "canceled" ? { background: "linear-gradient(135deg, #ef4444, #dc2626)" } : {}}
        >
          <i className="fas fa-user-slash text-xs opacity-70" />
          契約解除者一覧
          {canceledCount > 0 && (
            <span className={`rounded-full text-xs font-bold px-2 py-0.5 min-w-[22px] text-center ${
              tab === "canceled" ? "bg-white text-red-600" : "bg-red-500 text-white"
            }`}>
              {canceledCount}
            </span>
          )}
        </Link>
      </div>

      {/* 検索フォーム */}
      <form method="GET" className="rounded-2xl bg-white border border-stone-100 p-4 flex flex-wrap gap-3 items-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={q}
          placeholder="氏名・会員コード・メールで検索"
          className="border border-stone-200 rounded-xl px-4 py-2 text-sm text-stone-800 w-64 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        {tab === "active" && (
          <div className="flex gap-2 flex-wrap">
            {[
              { value: "", label: "すべて" },
              { value: "active", label: "有効" },
              { value: "suspended", label: "停止中" },
              { value: "invited", label: "招待中" },
            ].map(opt => (
              <Link key={opt.value}
                href={`/admin/members?tab=active&status=${opt.value}&q=${q}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  statusFilter === opt.value
                    ? "text-white"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100"
                }`}
                style={statusFilter === opt.value ? { background: "linear-gradient(135deg, #1c1917, #3d3530)" } : {}}>
                {opt.label}
              </Link>
            ))}
          </div>
        )}
        <button type="submit"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #c9a84c, #a88830)", boxShadow: "0 2px 6px rgba(201,168,76,0.3)" }}>
          <i className="fas fa-search mr-1.5 text-xs" />検索
        </button>
      </form>

      {/* ─── 会員一覧テーブル ─── */}
      {tab === "active" && (
        <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">会員</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">メール</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">紹介者</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">利用可能pt</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">状態</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">契約登録日</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">入会日</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                      該当する会員がいません
                    </td>
                  </tr>
                )}
                {members.map(m => {
                  const referrer     = m.referrals[0]?.referrer ?? null;
                  const pts          = m.pointWallet?.availablePointsBalance ?? 0;
                  const contract     = m.contracts[0] ?? null;
                  const contractDate = contract
                    ? (contract.confirmedAt ?? contract.startedAt ?? contract.createdAt)
                    : null;
                  return (
                    <tr key={m.id.toString()} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/admin/users/${m.id}`}
                          className="font-semibold text-slate-800 hover:text-slate-600">
                          {m.name}
                        </Link>
                        <div className="text-xs text-slate-500">{m.memberCode}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-700 text-xs">{m.email}</td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {referrer ? (
                          <Link href={`/admin/users/${referrer.id}`} className="hover:text-slate-800">
                            {referrer.name}
                            <span className="block text-slate-400">{referrer.memberCode}</span>
                          </Link>
                        ) : <span className="text-slate-400">なし</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800">
                        {Number(pts).toLocaleString()}
                        <span className="text-xs text-slate-500 ml-0.5">pt</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status as string] ?? "bg-slate-100 text-slate-600"}`}>
                          {STATUS_LABEL[m.status as string] ?? m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {contractDate ? (
                          <span className="text-emerald-700 font-medium">{fmtDate(contractDate)}</span>
                        ) : (
                          <span className="text-slate-300">未契約</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {fmtDate(m.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2 items-center">
                          <Link href={`/admin/users/${m.id}`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap">
                            詳細
                          </Link>
                          <MemberActions
                            memberId={m.id.toString()}
                            memberName={m.name}
                            currentStatus={m.status}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex justify-center gap-2 px-5 py-4 border-t border-slate-100">
              {page > 1 && (
                <Link href={`/admin/members?tab=active&status=${statusFilter}&q=${q}&page=${page - 1}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← 前へ</Link>
              )}
              <span className="px-4 py-2 text-sm text-slate-500">{page} / {pages}</span>
              {page < pages && (
                <Link href={`/admin/members?tab=active&status=${statusFilter}&q=${q}&page=${page + 1}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">次へ →</Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── 契約解除者一覧テーブル ─── */}
      {tab === "canceled" && (
        <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">🚫 契約解除者一覧</div>
              <div className="text-xs text-slate-500 mt-0.5">更新日時の新しい順</div>
            </div>
            <div className="text-sm font-bold text-slate-700">{total.toLocaleString()} 名</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-red-50 border-b border-red-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">会員</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">メール</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">紹介者</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">契約登録日</th>
                  <th className="text-left px-5 py-3 font-semibold text-red-700">🚫 契約解除日時</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">入会日</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      契約解除者はいません
                    </td>
                  </tr>
                )}
                {members.map(m => {
                  const referrer     = m.referrals[0]?.referrer ?? null;
                  const contract     = m.contracts[0] ?? null;
                  const contractDate = contract
                    ? (contract.confirmedAt ?? contract.startedAt ?? contract.createdAt)
                    : null;
                  // canceledAt がDBにあれば使用、なければ updatedAt で代用
                  const cancelDate = (m as any).canceledAt ?? m.updatedAt;
                  return (
                    <tr key={m.id.toString()} className="hover:bg-red-50/40 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/admin/users/${m.id}`}
                          className="font-semibold text-slate-700 hover:text-slate-500">
                          {m.name}
                        </Link>
                        <div className="text-xs text-slate-400">{m.memberCode}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{m.email}</td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {referrer ? (
                          <Link href={`/admin/users/${referrer.id}`} className="hover:text-slate-800">
                            {referrer.name}
                            <span className="block text-slate-400">{referrer.memberCode}</span>
                          </Link>
                        ) : <span className="text-slate-400">なし</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {contractDate ? fmtDate(contractDate) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs font-bold text-red-700">
                          {fmtDateTime(cancelDate)}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {fmtDate(m.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2 items-center">
                          <Link href={`/admin/users/${m.id}`}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap">
                            詳細
                          </Link>
                          <MemberActions
                            memberId={m.id.toString()}
                            memberName={m.name}
                            currentStatus={m.status}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex justify-center gap-2 px-5 py-4 border-t border-slate-100">
              {page > 1 && (
                <Link href={`/admin/members?tab=canceled&q=${q}&page=${page - 1}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← 前へ</Link>
              )}
              <span className="px-4 py-2 text-sm text-slate-500">{page} / {pages}</span>
              {page < pages && (
                <Link href={`/admin/members?tab=canceled&q=${q}&page=${page + 1}`}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">次へ →</Link>
              )}
            </div>
          )}
        </div>
      )}

    </main>
  );
}
