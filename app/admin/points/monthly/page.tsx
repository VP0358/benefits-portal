import MonthlyGrantManager from "./ui/monthly-grant-manager";

export default function AdminMonthlyPointsPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">月次ポイント計算</h1>
        <p className="mt-2 text-slate-600">月次紹介ポイントのプレビューと本実行を行います。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <MonthlyGrantManager />
      </section>
    </main>
  );
}
