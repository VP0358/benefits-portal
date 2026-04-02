import AdminOrderDetail from "./ui/admin-order-detail";

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">注文詳細</h1>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <AdminOrderDetail orderId={params.id} />
      </section>
    </main>
  );
}
