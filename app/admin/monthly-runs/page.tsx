import MonthlyRunsTable from "./ui/monthly-runs-table";

export default function AdminMonthlyRunsPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">月次ポイント実行履歴</h1>
        <p className="mt-2 text-slate-800">プレビューと本実行の履歴を確認できます。</p>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <MonthlyRunsTable />
      </section>
    </main>
  );
}
