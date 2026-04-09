import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LEVEL_LABELS, MEMBER_TYPE_LABELS } from "@/lib/mlm-bonus";
import OrganizationChart from "./ui/organization-chart";

export default async function MlmMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let mlmMemberId: bigint;
  try {
    mlmMemberId = BigInt(id);
  } catch {
    notFound();
    return;
  }

  const mlmMember = await prisma.mlmMember.findUnique({
    where: { id: mlmMemberId },
    include: {
      user: {
        include: {
          pointWallet: true,
        },
      },
      sponsor: {
        include: {
          user: true,
        },
      },
      parent: {
        include: {
          user: true,
        },
      },
      downline: {
        include: {
          user: true,
        },
        take: 20,
      },
    },
  });

  // オートシップ注文履歴（最新30件）
  const autoShipOrders = await prisma.autoShipOrder.findMany({
    where: { mlmMemberId: mlmMemberId },
    include: {
      autoShipRun: {
        select: { targetMonth: true, paymentMethod: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (!mlmMember) notFound();

  const statusLabels: Record<string, string> = {
    active: "活動中",
    autoship: "オートシップ",
    lapsed: "失効",
    suspended: "停止",
    withdrawn: "退会",
    midCancel: "中途解約",
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    autoship: "bg-blue-100 text-blue-700",
    lapsed: "bg-red-100 text-red-700",
    suspended: "bg-orange-100 text-orange-700",
    withdrawn: "bg-slate-100 text-slate-500",
    midCancel: "bg-slate-100 text-slate-400",
  };

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/mlm-members"
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← MLM会員一覧に戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">MLM会員詳細</h1>
          <p className="mt-2 text-gray-600">
            {mlmMember.memberCode} / {mlmMember.user.name}
          </p>
        </div>
        <Link
          href={`/admin/mlm-members/${id}/edit`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <i className="fas fa-edit mr-2"></i>
          編集
        </Link>
      </div>

      {/* 基本情報グリッド */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 基本情報 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-user mr-2"></i>
            基本情報
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">会員コード:</span>
              <span className="font-semibold">{mlmMember.memberCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">氏名:</span>
              <span className="font-semibold">{mlmMember.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">メールアドレス:</span>
              <span>{mlmMember.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">会員タイプ:</span>
              <span className="font-semibold">
                {MEMBER_TYPE_LABELS[mlmMember.memberType]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ステータス:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  statusColors[mlmMember.status]
                }`}
              >
                {statusLabels[mlmMember.status]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">契約締結日:</span>
              <span>
                {mlmMember.contractDate
                  ? new Date(mlmMember.contractDate).toLocaleDateString("ja-JP")
                  : "未設定"}
              </span>
            </div>
          </div>
        </section>

        {/* レベル情報 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-chart-line mr-2"></i>
            レベル情報
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">現在レベル:</span>
              <span className="font-bold text-lg text-blue-600">
                {LEVEL_LABELS[mlmMember.currentLevel || 0]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">称号レベル:</span>
              <span className="font-semibold">
                {LEVEL_LABELS[mlmMember.titleLevel || 0]}
              </span>
            </div>
            {mlmMember.forceLevel !== null && (
              <div className="flex justify-between">
                <span className="text-gray-600">強制レベル:</span>
                <span className="font-semibold text-orange-600">
                  {LEVEL_LABELS[mlmMember.forceLevel]}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">条件達成:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  mlmMember.conditionAchieved
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {mlmMember.conditionAchieved ? "達成" : "未達成"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">強制アクティブ:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  mlmMember.forceActive
                    ? "bg-orange-100 text-orange-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {mlmMember.forceActive ? "有効" : "無効"}
              </span>
            </div>
          </div>
        </section>

        {/* オートシップ情報 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-sync mr-2"></i>
            オートシップ情報
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">オートシップ:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  mlmMember.autoshipEnabled
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {mlmMember.autoshipEnabled ? "有効" : "無効"}
              </span>
            </div>
            {mlmMember.autoshipEnabled && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">開始日:</span>
                  <span>
                    {mlmMember.autoshipStartDate
                      ? new Date(mlmMember.autoshipStartDate).toLocaleDateString(
                          "ja-JP"
                        )
                      : "未設定"}
                  </span>
                </div>
                {mlmMember.autoshipStopDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">停止日:</span>
                    <span>
                      {new Date(mlmMember.autoshipStopDate).toLocaleDateString(
                        "ja-JP"
                      )}
                    </span>
                  </div>
                )}
                {mlmMember.autoshipSuspendMonths && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">停止月:</span>
                    <span>{mlmMember.autoshipSuspendMonths}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">支払方法:</span>
              <span className="font-semibold">
                {mlmMember.paymentMethod === "credit_card"
                  ? "クレジットカード"
                  : mlmMember.paymentMethod === "bank_transfer"
                  ? "口座振替"
                  : "銀行振込"}
              </span>
            </div>
          </div>
        </section>

        {/* ポイント情報 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-coins mr-2"></i>
            ポイント情報
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">自動ポイント:</span>
              <span className="font-semibold">
                {(
                  mlmMember.user.pointWallet?.autoPointsBalance ?? 0
                ).toLocaleString()}
                pt
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">手動ポイント:</span>
              <span className="font-semibold">
                {(
                  mlmMember.user.pointWallet?.manualPointsBalance ?? 0
                ).toLocaleString()}
                pt
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">外部ポイント:</span>
              <span className="font-semibold">
                {(
                  mlmMember.user.pointWallet?.externalPointsBalance ?? 0
                ).toLocaleString()}
                pt
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-700 font-semibold">利用可能:</span>
              <span className="font-bold text-lg text-blue-600">
                {(
                  mlmMember.user.pointWallet?.availablePointsBalance ?? 0
                ).toLocaleString()}
                pt
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">貯金ポイント (SAV):</span>
              <span className="font-semibold text-green-600">
                {mlmMember.savingsPoints?.toLocaleString() ?? 0}pt
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* 組織情報 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* スポンサー情報 */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-user-tie mr-2"></i>
            スポンサー情報
          </h2>
          {mlmMember.sponsor ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">会員コード:</span>
                <Link
                  href={`/admin/mlm-members/${mlmMember.sponsor.id}`}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {mlmMember.sponsor.memberCode}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">氏名:</span>
                <span className="font-semibold">
                  {mlmMember.sponsor.user.name}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">スポンサーなし（トップリーダー）</p>
          )}
        </section>

        {/* 親会員情報（マトリックス） */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-sitemap mr-2"></i>
            親会員情報（マトリックス）
          </h2>
          {mlmMember.parent ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">会員コード:</span>
                <Link
                  href={`/admin/mlm-members/${mlmMember.parent.id}`}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {mlmMember.parent.memberCode}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">氏名:</span>
                <span className="font-semibold">
                  {mlmMember.parent.user.name}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">親会員なし</p>
          )}
        </section>
      </div>

      {/* 直下ダウンライン */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-users mr-2"></i>
          直下ダウンライン（最大20名）
        </h2>
        {mlmMember.downline.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">会員コード</th>
                  <th className="px-4 py-2 text-left">氏名</th>
                  <th className="px-4 py-2 text-left">レベル</th>
                  <th className="px-4 py-2 text-left">ステータス</th>
                  <th className="px-4 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {mlmMember.downline.map((child) => (
                  <tr key={child.id.toString()} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{child.memberCode}</td>
                    <td className="px-4 py-2">{child.user.name}</td>
                    <td className="px-4 py-2">
                      {LEVEL_LABELS[child.currentLevel || 0]}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          statusColors[child.status]
                        }`}
                      >
                        {statusLabels[child.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/mlm-members/${child.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">ダウンラインなし</p>
        )}
      </section>

      {/* オートシップ注文履歴 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-shopping-cart mr-2"></i>
          オートシップ注文履歴
        </h2>
        {autoShipOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">対象月</th>
                  <th className="px-4 py-2 text-left">支払い方法</th>
                  <th className="px-4 py-2 text-right">金額</th>
                  <th className="px-4 py-2 text-center">ステータス</th>
                  <th className="px-4 py-2 text-left">決済日</th>
                  <th className="px-4 py-2 text-left">失敗理由</th>
                </tr>
              </thead>
              <tbody>
                {autoShipOrders.map((order) => {
                  const orderStatusLabel: Record<string, string> = {
                    pending: "未処理",
                    paid: "決済完了",
                    failed: "失敗",
                    canceled: "キャンセル",
                  };
                  const orderStatusColor: Record<string, string> = {
                    pending: "bg-gray-100 text-gray-600",
                    paid: "bg-green-100 text-green-700",
                    failed: "bg-red-100 text-red-700",
                    canceled: "bg-gray-200 text-gray-500",
                  };
                  const pmLabel: Record<string, string> = {
                    credit_card: "💳 クレジットカード",
                    bank_transfer: "🏦 口座振替",
                  };
                  return (
                    <tr key={order.id.toString()} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{order.autoShipRun.targetMonth}</td>
                      <td className="px-4 py-2 text-gray-600 text-xs">{pmLabel[order.autoShipRun.paymentMethod] ?? order.autoShipRun.paymentMethod}</td>
                      <td className="px-4 py-2 text-right">{order.totalAmount.toLocaleString()}円</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${orderStatusColor[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {orderStatusLabel[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {order.paidAt ? new Date(order.paidAt).toLocaleDateString("ja-JP") : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-red-500">{order.failReason ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">オートシップ注文履歴なし</p>
        )}
      </section>

      {/* 組織図 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-sitemap mr-2"></i>
          組織図（ユニレベル）
        </h2>
        <OrganizationChart memberCode={mlmMember.memberCode} />
      </section>
    </main>
  );
}
