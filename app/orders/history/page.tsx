import OrderHistoryList from "./ui/order-history-list";

export default function OrderHistoryPage() {
  return (
    <main className="min-h-screen bg-[#e6f2dc] p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">注文履歴</h1>
        <section className="rounded-3xl bg-white p-6 shadow-sm"><OrderHistoryList /></section>
        <a href="/dashboard" className="block text-center text-sm text-slate-500">← ダッシュボードに戻る</a>
      </div>
    </main>
  );
}
