import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">商品管理</h1>
        <Link href="/admin/products/new" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">新規追加</Link>
      </div>
      <div className="rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-[150px_1fr_120px_80px_80px] gap-4 border-b px-6 py-4 font-semibold text-slate-700 text-sm">
          <div>商品コード</div><div>商品名</div><div>価格</div><div>状態</div><div>操作</div>
        </div>
        {products.length === 0 && <div className="px-6 py-8 text-center text-slate-700 text-sm">商品がありません</div>}
        {products.map(p => (
          <div key={p.id.toString()} className="grid grid-cols-[150px_1fr_120px_80px_80px] gap-4 border-b px-6 py-4 text-sm hover:bg-slate-50">
            <div>
              <div className="font-mono text-slate-600">{p.code || '-'}</div>
            </div>
            <div>
              <div className="font-semibold text-slate-800">{p.name}</div>
              {p.description && <div className="text-xs text-slate-700">{p.description}</div>}
            </div>
            <div className="font-medium text-slate-800">{p.price.toLocaleString()}円</div>
            <div><span className={`rounded-full px-2 py-1 text-xs ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{p.isActive ? "公開" : "非公開"}</span></div>
            <div><Link href={`/admin/products/${p.id.toString()}/edit`} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50">編集</Link></div>
          </div>
        ))}
      </div>
    </main>
  );
}
