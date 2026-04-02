import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const REWARD_RATE = 0.25;

export default async function AdminReferralRewardsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  // 有効な携帯契約（active + confirmedAt あり）を紹介関係込みで取得
  const contracts = await prisma.mobileContract.findMany({
    where: {
      status: "active",
      confirmedAt: { not: null },
    },
    orderBy: { confirmedAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          memberCode: true,
          name: true,
          referrals: {
            where: { isActive: true },
            include: {
              referrer: {
                select: { id: true, memberCode: true, name: true },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  // 紹介者ごとに集計
  type ReferrerEntry = {
    referrerId: string;
    referrerCode: string;
    referrerName: string;
    totalReward: number;
    contracts: {
      contractId: string;
      contractedUserId: string;
      contractedUserCode: string;
      contractedUserName: string;
      planName: string;
      monthlyFee: number;
      reward: number;
      confirmedAt: Date;
    }[];
  };

  const referrerMap = new Map<string, ReferrerEntry>();

  for (const contract of contracts) {
    const referral = contract.user.referrals[0];
    if (!referral?.referrer) continue;

    const ref = referral.referrer;
    const refIdStr = ref.id.toString();

    if (!referrerMap.has(refIdStr)) {
      referrerMap.set(refIdStr, {
        referrerId: refIdStr,
        referrerCode: ref.memberCode,
        referrerName: ref.name,
        totalReward: 0,
        contracts: [],
      });
    }

    const fee = Number(contract.monthlyFee);
    const reward = Math.floor(fee * REWARD_RATE);
    const entry = referrerMap.get(refIdStr)!;
    entry.totalReward += reward;
    entry.contracts.push({
      contractId: contract.id.toString(),
      contractedUserId: contract.user.id.toString(),
      contractedUserCode: contract.user.memberCode,
      contractedUserName: contract.user.name,
      planName: contract.planName,
      monthlyFee: fee,
      reward,
      confirmedAt: contract.confirmedAt!,
    });
  }

  const referrers = Array.from(referrerMap.values())
    .sort((a, b) => b.totalReward - a.totalReward);

  const totalReward = referrers.reduce((s, r) => s + r.totalReward, 0);
  const totalContracts = contracts.filter(c => c.user.referrals[0]?.referrer).length;

  return (
    <main className="space-y-5">
      {/* ヘッダー・サマリー */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-4">💰 紹介者報酬 計算一覧</h1>
        <p className="text-sm text-slate-500 mb-5">
          直紹介者が契約した携帯プランの月額料金 × 1/4（{(REWARD_RATE * 100).toFixed(0)}%）を自動計算しています。
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-emerald-50 p-4 text-center">
            <div className="text-xs text-emerald-600 font-medium mb-1">紹介者数</div>
            <div className="text-2xl font-bold text-emerald-700">{referrers.length}</div>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4 text-center">
            <div className="text-xs text-blue-600 font-medium mb-1">対象契約数</div>
            <div className="text-2xl font-bold text-blue-700">{totalContracts}</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-center col-span-2">
            <div className="text-xs text-amber-600 font-medium mb-1">月次報酬合計</div>
            <div className="text-2xl font-bold text-amber-700">¥{totalReward.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 報酬一覧テーブル */}
      {referrers.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 shadow-sm text-center text-slate-400">
          <div className="text-4xl mb-3">📭</div>
          <div>有効な携帯契約（紹介あり）がありません</div>
          <div className="text-sm mt-1">携帯契約の確定日を設定するとここに表示されます</div>
        </div>
      ) : (
        <div className="space-y-4">
          {referrers.map(r => (
            <div key={r.referrerId} className="rounded-3xl bg-white shadow-sm overflow-hidden">
              {/* 紹介者ヘッダー */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                    {r.referrerName.charAt(0)}
                  </div>
                  <div>
                    <Link
                      href={`/admin/users/${r.referrerId}`}
                      className="font-bold text-slate-800 hover:text-slate-600"
                    >
                      {r.referrerName}
                    </Link>
                    <div className="text-xs text-slate-400">{r.referrerCode}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 mb-0.5">月次報酬合計</div>
                  <div className="text-xl font-bold text-emerald-600">
                    ¥{r.totalReward.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 契約明細テーブル */}
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr className="text-xs text-slate-500">
                    <th className="text-left px-6 py-2 font-medium">直紹介した会員</th>
                    <th className="text-left px-6 py-2 font-medium">プラン名</th>
                    <th className="text-right px-6 py-2 font-medium">月額</th>
                    <th className="text-right px-6 py-2 font-medium">
                      報酬（×1/4）
                    </th>
                    <th className="text-left px-6 py-2 font-medium">確定日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {r.contracts.map(c => (
                    <tr key={c.contractId} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3">
                        <Link
                          href={`/admin/users/${c.contractedUserId}`}
                          className="font-medium text-slate-700 hover:text-slate-500"
                        >
                          {c.contractedUserName}
                        </Link>
                        <span className="ml-2 text-xs text-slate-400">{c.contractedUserCode}</span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{c.planName}</td>
                      <td className="px-6 py-3 text-right text-slate-700 font-medium">
                        ¥{c.monthlyFee.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-600">
                        ¥{c.reward.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500">
                        {new Date(c.confirmedAt).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/50">
                  <tr>
                    <td colSpan={3} className="px-6 py-2 text-xs text-slate-500 text-right font-medium">
                      {r.contracts.length} 件の契約
                    </td>
                    <td className="px-6 py-2 text-right font-bold text-emerald-600">
                      ¥{r.totalReward.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* 注記 */}
      <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
        ※ 対象：ステータスが「有効」かつ「確定日」が設定された携帯契約のみ<br />
        ※ 報酬額 = 月額料金 × 25%（小数点以下切り捨て）<br />
        ※ 紹介関係は直紹介のみ（relationType = direct、isActive = true）を対象とします
      </div>
    </main>
  );
}
