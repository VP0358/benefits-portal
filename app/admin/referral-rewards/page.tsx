import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ReferralRewardsPanel from "./ui/referral-rewards-panel";

export default async function AdminReferralRewardsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  return (
    <main className="space-y-5">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-1">💰 紹介者報酬 計算一覧</h1>
        <p className="text-sm text-slate-500">
          直紹介者が契約した携帯プランの月額料金 × 1/4（25%）を紹介者ごとに個別集計します。
        </p>
      </div>
      <ReferralRewardsPanel />
    </main>
  );
}
