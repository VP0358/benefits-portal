import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { pointWallet: true, referrals: true },
  });

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">会員管理</h1>
          <p className="mt-2 text-slate-600">会員情報とポイント残高を確認できます。</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export/members"
            className="rounded-xl border px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            📥 CSV
          </a>
          <Link
            href="/admin/users/new"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white hover:bg-slate-700"
          >
            ＋ 新規登録
          </Link>
        </div>
      </div>
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_1fr_80px_120px_80px] gap-4 border-b px-6 py-4 font-semibold text-slate-700 text-sm">
          <div>会員番号</div><div>氏名</div><div>メール</div><div>紹介者数</div><div>利用可能pt</div><div>操作</div>
        </div>
        {users.length === 0 && <div className="px-6 py-8 text-center text-slate-500 text-sm">会員がいません</div>}
        {users.map(user => (
          <div key={user.id.toString()} className="grid grid-cols-[120px_1fr_1fr_80px_120px_80px] gap-4 border-b px-6 py-4 text-sm hover:bg-slate-50">
            <div className="text-slate-600">{user.memberCode}</div>
            <div className="font-medium text-slate-800">{user.name}</div>
            <div className="truncate text-slate-600">{user.email}</div>
            <div className="text-slate-600">{user.referrals.length}</div>
            <div className="font-medium text-slate-800">{(user.pointWallet?.availablePointsBalance ?? 0).toLocaleString()}</div>
            <div>
              <Link href={`/admin/users/${user.id.toString()}`} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50">詳細</Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
