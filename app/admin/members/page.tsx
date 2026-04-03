import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MemberActions from "./ui/member-actions";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { memberCode: { contains: q } },
      { email: { contains: q } },
    ];
  }

  const [total, members] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        pointWallet: true,
        referrals: {
          where: { isActive: true },
          include: { referrer: { select: { id: true, name: true, memberCode: true } } },
          take: 1,
        },
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  const STATUS_STYLE: Record<string, string> = {
    active:    "bg-emerald-50 text-emerald-700",
    suspended: "bg-yellow-50 text-yellow-700",
    invited:   "bg-blue-50 text-blue-700",
    canceled:  "bg-red-50 text-red-700",
  };
  const STATUS_LABEL: Record<string, string> = {
    active: "有効", suspended: "停止中", invited: "招待中", canceled: "退会済",
  };

  return (
    <main className="space-y-5">
      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">👥 会員管理</h1>
          <p className="text-sm text-slate-600 mt-0.5">全 {total.toLocaleString()} 件</p>
        </div>
      </div>

      {/* 検索・フィルター */}
      <form method="GET" className="rounded-3xl bg-white p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="氏名・会員コード・メールで検索"
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 w-64 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "すべて" },
            { value: "active", label: "有効" },
            { value: "suspended", label: "停止中" },
            { value: "invited", label: "招待中" },
            { value: "canceled", label: "退会済" },
          ].map(opt => (
            <Link key={opt.value}
              href={`/admin/members?status=${opt.value}&q=${q}`}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}>
              {opt.label}
            </Link>
          ))}
        </div>
        <button type="submit"
          className="rounded-xl bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700">
          検索
        </button>
      </form>

      {/* テーブル */}
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">会員</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">メール</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">紹介者</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-700">利用可能pt</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">状態</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">登録日</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    該当する会員がいません
                  </td>
                </tr>
              )}
              {members.map(m => {
                const referrer = m.referrals[0]?.referrer ?? null;
                const pts = m.pointWallet?.availablePointsBalance ?? 0;
                const isCanceled = m.status === "canceled";
                return (
                  <tr key={m.id.toString()}
                    className={`hover:bg-slate-50/50 transition-colors ${isCanceled ? "opacity-60" : ""}`}>
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
                        <Link href={`/admin/users/${referrer.id}`}
                          className="hover:text-slate-800">
                          {referrer.name}
                          <span className="block text-slate-400">{referrer.memberCode}</span>
                        </Link>
                      ) : <span className="text-slate-300">なし</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">
                      {pts.toLocaleString()}<span className="text-xs text-slate-500 ml-0.5">pt</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[m.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(m.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 items-center">
                        <Link href={`/admin/users/${m.id}`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          詳細
                        </Link>
                        {isCanceled && (
                          <MemberActions memberId={m.id.toString()} memberName={m.name} />
                        )}
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
              <Link href={`/admin/members?status=${statusFilter}&q=${q}&page=${page - 1}`}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                ← 前へ
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">{page} / {pages}</span>
            {page < pages && (
              <Link href={`/admin/members?status=${statusFilter}&q=${q}&page=${page + 1}`}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                次へ →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
