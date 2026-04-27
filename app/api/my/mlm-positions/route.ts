// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { currentAndLastMonthJST } from "@/lib/japan-time";

/**
 * GET /api/my/mlm-positions
 * 
 * 自分の複数ポジション情報を返す
 * 
 * 同一ベースコード（先頭6桁が同じ）のポジションを全件返す
 * 複数ポジションがない場合は空配列または単一要素を返す
 * 
 * 返却データ:
 * - isMultiPosition: 複数ポジションかどうか
 * - positionCount: ポジション数
 * - positions: 各ポジションの詳細
 *   - memberCode: 会員コード
 *   - status: ステータス
 *   - currentLevel: 現在レベル
 *   - contractDate: 契約締結日
 *   - autoshipEnabled: オートシップ有効
 *   - currentMonthPoints: 今月ポイント
 *   - lastMonthPoints: 先月ポイント
 * - totalCurrentMonthPoints: 今月合計ポイント
 * - totalLastMonthPoints: 先月合計ポイント
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const userId = BigInt(session.user.id);

  try {
    // 自分のMLM会員情報を取得
    const myMember = await prisma.mlmMember.findUnique({
      where: { userId },
    });

    if (!myMember) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // ベースコード（先頭6桁）を取得
    const myCode = myMember.memberCode.replace(/-/g, "");
    const baseCode = myCode.substring(0, myCode.length - 2);

    // 同一ベースコードの全ポジションを取得（他ポジションはUserのmemberCodeで検索）
    // ポジションコードのパターン: baseCode + "01"〜"99"
    const allPositions = await prisma.mlmMember.findMany({
      where: {
        memberCode: {
          // 例: "123456-01"〜"123456-99" または "12345601"〜"12345699"
          startsWith: baseCode,
        },
      },
      orderBy: { memberCode: "asc" },
    });

    // ポジション数が1の場合は複数ポジションではない
    if (allPositions.length <= 1) {
      // 今月・先月のポイント計算（JST基準）
      const { currentMonth: currentMonthStr, lastMonth: lastMonthStr } = currentAndLastMonthJST();

      const [currentAgg, lastAgg] = await Promise.all([
        prisma.mlmPurchase.aggregate({
          where: { mlmMemberId: myMember.id, purchaseMonth: currentMonthStr },
          _sum: { totalPoints: true },
        }),
        prisma.mlmPurchase.aggregate({
          where: { mlmMemberId: myMember.id, purchaseMonth: lastMonthStr },
          _sum: { totalPoints: true },
        }),
      ]);

      return NextResponse.json({
        isMultiPosition: false,
        positionCount: 1,
        positions: [{
          memberCode: myMember.memberCode,
          status: myMember.status,
          currentLevel: myMember.currentLevel,
          contractDate: myMember.contractDate?.toISOString() ?? null,
          autoshipEnabled: myMember.autoshipEnabled,
          currentMonthPoints: currentAgg._sum.totalPoints ?? 0,
          lastMonthPoints: lastAgg._sum.totalPoints ?? 0,
        }],
        totalCurrentMonthPoints: currentAgg._sum.totalPoints ?? 0,
        totalLastMonthPoints: lastAgg._sum.totalPoints ?? 0,
      });
    }

    // 複数ポジションの場合：各ポジションのポイントを取得（JST基準）
    const { currentMonth: currentMonthStr, lastMonth: lastMonthStr } = currentAndLastMonthJST();

    const positionsWithPoints = await Promise.all(
      allPositions.map(async (pos) => {
        const [currentAgg, lastAgg] = await Promise.all([
          prisma.mlmPurchase.aggregate({
            where: { mlmMemberId: pos.id, purchaseMonth: currentMonthStr },
            _sum: { totalPoints: true },
          }),
          prisma.mlmPurchase.aggregate({
            where: { mlmMemberId: pos.id, purchaseMonth: lastMonthStr },
            _sum: { totalPoints: true },
          }),
        ]);

        return {
          memberCode: pos.memberCode,
          status: pos.status,
          currentLevel: pos.currentLevel,
          contractDate: pos.contractDate?.toISOString() ?? null,
          autoshipEnabled: pos.autoshipEnabled,
          currentMonthPoints: currentAgg._sum.totalPoints ?? 0,
          lastMonthPoints: lastAgg._sum.totalPoints ?? 0,
        };
      })
    );

    const totalCurrentMonthPoints = positionsWithPoints.reduce((sum, p) => sum + p.currentMonthPoints, 0);
    const totalLastMonthPoints = positionsWithPoints.reduce((sum, p) => sum + p.lastMonthPoints, 0);

    return NextResponse.json({
      isMultiPosition: true,
      positionCount: allPositions.length,
      positions: positionsWithPoints,
      totalCurrentMonthPoints,
      totalLastMonthPoints,
    });

  } catch (error) {
    console.error("mlm-positions error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
