import AdminDashboardContainer from "./ui/admin-dashboard-container";

export default function AdminDashboardPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">売上 / ポイント ダッシュボード</h1>
        <p className="mt-2 text-slate-600">期間を指定して売上、注文、ポイント状況を確認できます。</p>
      </div>
      <AdminDashboardContainer />
    </main>
  );
}
