import MonthlyGrantManager from "./ui/monthly-grant-manager";

export default function AdminMonthlyPointsPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="mt-2 text-slate-700 font-semibold">月次紹介ポイントのプレビューと本実行を行います。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <MonthlyGrantManager />
      </section>
    </main>
  );
}
