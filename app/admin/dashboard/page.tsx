import AdminDashboardContainer from "./ui/admin-dashboard-container";
import MemberStatsSummary from "@/app/admin/ui/member-stats-summary";

export default function AdminDashboardPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#c9a84c" }}>
          Analytics
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">売上 / ポイント レポート</h1>
        <p className="text-sm text-stone-400 mt-0.5">期間を指定して売上・注文・ポイント状況を確認できます</p>
      </div>
      {/* 会員・契約 サマリー */}
      <MemberStatsSummary />
      <AdminDashboardContainer />
    </main>
  );
}
