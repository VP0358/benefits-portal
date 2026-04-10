import AdminDashboardContainer from "./ui/admin-dashboard-container";
import MemberStatsSummary from "@/app/admin/ui/member-stats-summary";

export default function AdminDashboardPage() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">売上 / ポイント ダッシュボード</h1>
        <p className="mt-2 text-slate-800">期間を指定して売上、注文、ポイント状況を確認できます。</p>
      </div>
      {/* 会員・契約 サマリー */}
      <MemberStatsSummary />
      <AdminDashboardContainer />
    </main>
  );
}
