import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "申込中", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  active: { label: "有効", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  canceled: { label: "解約済", cls: "bg-red-50 text-red-700 border-red-200" },
  suspended: { label: "停止中", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const REWARD_RATE = 0.25;

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const page = Math.max(1, Number(sp.page ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;

  const where = statusFilter
    ? { status: statusFilter as "pending" | "active" | "canceled" | "suspended" }
    : {};

  const [total, contracts] = await Promise.all([
    prisma.mobileContract.count({ where }),
    prisma.mobileContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            memberCode: true,
            name: true,
            referrals: {
              where: { isActive: true },
              include: {
                referrer: { select: { id: true, memberCode: true, name: true } },
              },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  // ステータス別件数
  const statusCounts = await prisma.mobileContract.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countByStatus = Object.fromEntries(statusCounts.map(s => [s.status, s._count.id]));

  return (
    <main className="space-y-5">
      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📱 携帯契約一覧</h1>
            <p className="text-sm text-slate-500 mt-0.5">全 {total.toLocaleString()} 件</p>
          </div>
          {/* 集計カード */}
          <div className="flex gap-3 flex-wrap">
            {(["active", "pending", "canceled", "suspended"] as const).map(s => (
              <div key={s} className="rounded-2xl bg-slate-50 px-4 py-2 text-center min-w-[72px]">
                <div className={`text-xs font-medium mb-0.5 ${STATUS_LABEL[s].cls.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                  {STATUS_LABEL[s].label}
                </div>
                <div className="text-lg font-bold text-slate-800">{countByStatus[s] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "すべて" },
            { value: "active", label: "有効" },
            { value: "pending", label: "申込中" },
            { value: "suspended", label: "停止中" },
            { value: "canceled", label: "解約済" },
          ].map(opt => (
            <Link
              key={opt.value}
              href={`/admin/contracts?status=${opt.value}`}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">会員</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">プラン名</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">契約番号</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600">月額</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600 whitespace-nowrap">
                  報酬額 (×1/4)
                </th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">直紹介者</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">ステータス</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">確定日</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    該当する契約がありません
                  </td>
                </tr>
              )}
              {contracts.map(c => {
                const s = STATUS_LABEL[c.status] ?? STATUS_LABEL.pending;
                const referrer = c.user.referrals[0]?.referrer ?? null;
                const reward = Math.floor(Number(c.monthlyFee) * REWARD_RATE);
                return (
                  <tr key={c.id.toString()} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/users/${c.user.id}`}
                        className="font-medium text-slate-800 hover:text-slate-600"
                      >
                        {c.user.name}
                      </Link>
                      <div className="text-xs text-slate-400">{c.user.memberCode}</div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">{c.planName}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs font-mono">{c.contractNumber}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">
                      ¥{Number(c.monthlyFee).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {c.status === "active" && c.confirmedAt ? (
                        <span className="font-bold text-emerald-600">
                          ¥{reward.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {referrer ? (
                        <Link
                          href={`/admin/users/${referrer.id}`}
                          className="text-slate-700 hover:text-slate-500"
                        >
                          {referrer.name}
                          <span className="block text-xs text-slate-400">{referrer.memberCode}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-300 text-xs">紹介なし</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {c.confirmedAt
                        ? new Date(c.confirmedAt).toLocaleDateString("ja-JP")
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/users/${c.user.id}`}
                        className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {pages > 1 && (
          <div className="flex justify-center gap-2 px-5 py-4 border-t border-slate-100">
            {page > 1 && (
              <Link
                href={`/admin/contracts?status=${statusFilter}&page=${page - 1}`}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                ← 前へ
              </Link>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">
              {page} / {pages}
            </span>
            {page < pages && (
              <Link
                href={`/admin/contracts?status=${statusFilter}&page=${page + 1}`}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                次へ →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
