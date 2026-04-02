import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const [userCount, menuCount, orderCount, productCount] = await Promise.all([
    prisma.user.count(),
    prisma.menu.count(),
    prisma.order.count(),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">ダッシュボード</h1>
        <p className="mt-2 text-slate-800">管理者向けの概要画面です。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "会員数", value: userCount },
          { label: "メニュー数", value: menuCount },
          { label: "商品数", value: productCount },
          { label: "注文数", value: orderCount },
        ].map(item => (
          <div key={item.label} className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-700">{item.label}</div>
            <div className="mt-2 text-3xl font-bold text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
