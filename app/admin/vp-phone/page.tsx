import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import VpPhoneAdminActions from "./ui/vp-phone-admin-actions";

const STATUS_LABEL: Record<string, { label: string; cls: string; icon: string }> = {
  pending:    { label: "審査待ち",       cls: "bg-yellow-50 text-yellow-800 border-yellow-200", icon: "⏳" },
  reviewing:  { label: "審査中",         cls: "bg-blue-50 text-blue-800 border-blue-200",       icon: "🔍" },
  contracted: { label: "契約済み",       cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: "✅" },
  rejected:   { label: "審査不可",       cls: "bg-red-50 text-red-800 border-red-200",          icon: "❌" },
  canceled:   { label: "キャンセル済み", cls: "bg-gray-50 text-gray-700 border-gray-200",        icon: "🚫" },
};

export default async function AdminVpPhonePage({
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (statusFilter) where.status = statusFilter;

  const [total, applications, statusCounts] = await Promise.all([
    prisma.vpPhoneApplication.count({ where }),
    prisma.vpPhoneApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, memberCode: true, email: true },
        },
      },
    }),
    prisma.vpPhoneApplication.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.id])
  );

  const pages = Math.ceil(total / limit);
  const pendingCount = countByStatus["pending"] ?? 0;

  return (
    <main className="space-y-5">

      {/* ヘッダー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">📱 VP未来phone 申し込み管理</h1>
            <p className="text-sm text-slate-500 mt-0.5">全 {total.toLocaleString()} 件</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {(["pending", "reviewing", "contracted", "rejected"] as const).map(s => (
              <div key={s} className="rounded-2xl bg-slate-50 px-4 py-2 text-center min-w-[72px]">
                <div className={`text-xs font-medium mb-0.5 ${STATUS_LABEL[s].cls.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                  {STATUS_LABEL[s].icon} {STATUS_LABEL[s].label}
                </div>
                <div className="text-lg font-bold text-slate-800">{countByStatus[s] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="mt-3 rounded-2xl bg-yellow-50 border border-yellow-200 px-4 py-2.5 flex items-center gap-2">
            <span className="text-yellow-600 font-bold text-sm">⚠️</span>
            <span className="text-sm font-semibold text-yellow-800">
              審査待ちの申し込みが {pendingCount} 件あります
            </span>
          </div>
        )}
      </div>

      {/* フィルター */}
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "", label: "すべて" },
            { value: "pending",    label: "⏳ 審査待ち" },
            { value: "reviewing",  label: "🔍 審査中" },
            { value: "contracted", label: "✅ 契約済み" },
            { value: "rejected",   label: "❌ 審査不可" },
            { value: "canceled",   label: "🚫 キャンセル" },
          ].map(opt => (
            <Link
              key={opt.value}
              href={`/admin/vp-phone?status=${opt.value}`}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {opt.label}
              {opt.value && (countByStatus[opt.value] ?? 0) > 0 && (
                <span className="ml-1.5 text-xs font-bold opacity-70">
                  {countByStatus[opt.value]}
                </span>
              )}
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
                <th className="text-left px-5 py-3 font-semibold text-slate-700">申込日</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">会員</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">申込者名</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">電話番号</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">希望プラン</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">LINE</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-700">ステータス</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {applications.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                    該当する申し込みがありません
                  </td>
                </tr>
              )}
              {applications.map(a => {
                const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
                return (
                  <tr key={a.id.toString()} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/users/${a.user.id}`}
                        className="font-semibold text-slate-800 hover:text-slate-600 text-sm">
                        {a.user.name}
                      </Link>
                      <div className="text-xs text-slate-400">{a.user.memberCode}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-slate-800">{a.nameKanji}</div>
                      <div className="text-xs text-slate-500">{a.nameKana}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-700">{a.phone}</td>
                    <td className="px-5 py-3 text-xs text-slate-700">
                      {a.desiredPlan || <span className="text-slate-400">未選択</span>}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {a.lineId ? (
                        <div>
                          <div className="font-medium text-slate-800">{a.lineDisplayName}</div>
                          <div className="text-slate-500">ID: {a.lineId}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">なし</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>
                        {st.icon} {st.label}
                      </span>
                      {a.adminNote && (
                        <div className="mt-1 text-[10px] text-slate-500 max-w-[120px] truncate" title={a.adminNote}>
                          📝 {a.adminNote}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <VpPhoneAdminActions
                        applicationId={a.id.toString()}
                        currentStatus={a.status}
                        adminNote={a.adminNote ?? ""}
                        userName={a.nameKanji}
                        userId={a.user.id.toString()}
                      />
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
              <Link href={`/admin/vp-phone?status=${statusFilter}&page=${page - 1}`}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">← 前へ</Link>
            )}
            <span className="px-4 py-2 text-sm text-slate-500">{page} / {pages}</span>
            {page < pages && (
              <Link href={`/admin/vp-phone?status=${statusFilter}&page=${page + 1}`}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">次へ →</Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
