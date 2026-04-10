import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ReferralRewardsPanel from "./ui/referral-rewards-panel";

export default async function AdminReferralRewardsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#34d399" }}>
          Referral Rewards
        </p>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">紹介者報酬 計算一覧</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          直紹介者が契約した携帯プランの月額料金 × 1/4（25%）を紹介者ごとに個別集計します。
        </p>
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800 font-semibold flex items-center gap-2">
          <i className="fas fa-bolt text-amber-500" />
          ショット配当（初回のみ）：契約確定日（confirmedAt）に1回だけ発生します。毎月繰り返しの配当は行いません。
        </div>
      </div>
      <ReferralRewardsPanel />
    </main>
  );
}
