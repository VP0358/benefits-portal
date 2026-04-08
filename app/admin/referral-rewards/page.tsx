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
        <p className="text-sm text-slate-700">
          直紹介者が契約した携帯プランの月額料金 × 1/4（25%）を紹介者ごとに個別集計します。
        </p>
        <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-800 font-semibold">
          ⚡ ショット配当（初回のみ）：契約確定日（confirmedAt）に1回だけ発生します。毎月繰り返しの配当は行いません。
        </div>
      </div>
      <ReferralRewardsPanel />
    </main>
  );
}
