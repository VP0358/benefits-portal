import AdminOrderDetail from "./ui/admin-order-detail";

// Next.js 16: params は Promise になった（破壊的変更）
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">注文詳細</h1>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <AdminOrderDetail orderId={id} />
      </section>
    </main>
  );
}
