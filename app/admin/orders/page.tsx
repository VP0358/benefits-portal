import AdminOrderList from "./ui/admin-order-list";

export default function AdminOrdersPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">注文管理</h1>
        <p className="mt-2 text-slate-600">全注文を確認し、状態管理できます。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <AdminOrderList />
      </section>
    </main>
  );
}
