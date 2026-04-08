// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNonPurchaseAlert } from "@/lib/mlm-bonus";

const ACTIVE_REQUIRED_PRODUCTS = ["1000", "1001", "1002", "2000"];

/** 直近N ヶ月のスミサイ未購入連続月数を計算 */
async function calcConsecutiveNonPurchase(
  mlmMemberId: bigint,
  targetMonth: string // "YYYY-MM"
): Promise<number> {
  let consecutive = 0;
  const [y, m] = targetMonth.split("-").map(Number);

  for (let i = 0; i < 6; i++) {
    // i=0が先月、i=1が2ヶ月前...
    const d = new Date(y, m - 1 - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    const purchases = await prisma.mlmPurchase.findMany({
      where: {
        mlmMemberId,
        purchaseMonth: ym,
        productCode: { in: ACTIVE_REQUIRED_PRODUCTS },
      },
    });
    if (purchases.length > 0) break;
    consecutive++;
  }
  return consecutive;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = BigInt(session.user.id ?? "0");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  try {
    // 自分のMLM会員情報取得
    const me = await prisma.mlmMember.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, memberCode: true, avatarUrl: true } },
        downlines: {
          include: {
            user: { select: { id: true, name: true, memberCode: true, avatarUrl: true } },
            downlines: {
              include: {
                user: { select: { id: true, name: true, memberCode: true, avatarUrl: true } },
                downlines: {
                  include: {
                    user: { select: { id: true, name: true, memberCode: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!me) {
      return NextResponse.json({ error: "MLM会員情報がありません" }, { status: 404 });
    }

    // 当月の自分の購入pt取得
    const myPurchases = await prisma.mlmPurchase.findMany({
      where: { mlmMemberId: me.id, purchaseMonth: currentMonth },
    });
    const mySelfPoints = myPurchases.reduce((s, p) => s + p.totalPoints, 0);
    const myHasRequiredProduct = myPurchases.some((p) =>
      ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)
    );
    const myIsActive =
      me.forceActive ||
      (me.memberType === "business" &&
        me.contractDate != null &&
        mySelfPoints >= 150 &&
        myHasRequiredProduct);

    // 直下ダウンライン情報を構築（最大3段まで表示）
    type NodeData = {
      id: string;
      name: string;
      memberCode: string;
      avatarUrl: string | null;
      mlmMemberCode: string;
      memberType: string;
      status: string;
      currentLevel: number;
      titleLevel: number;
      isActive: boolean;
      selfPoints: number;
      consecutiveNonPurchase: number;
      nonPurchaseAlert: string;
      children: NodeData[];
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const meNonNull = me!;
    async function buildNode(m: typeof meNonNull.downlines[0], depth: number): Promise<NodeData> {
      const purchases = await prisma.mlmPurchase.findMany({
        where: { mlmMemberId: m.id, purchaseMonth: currentMonth },
      });
      const selfPoints = purchases.reduce((s, p) => s + p.totalPoints, 0);
      const hasRequired = purchases.some((p) =>
        ACTIVE_REQUIRED_PRODUCTS.includes(p.productCode)
      );
      const isActive =
        (m as typeof meNonNull).forceActive ||
        (m.memberType === "business" &&
          (m as typeof meNonNull).contractDate != null &&
          selfPoints >= 150 &&
          hasRequired);

      const consecutive = await calcConsecutiveNonPurchase(m.id, currentMonth);
      const alert = getNonPurchaseAlert(consecutive);

      // 子ノード（最大3段）
      let children: NodeData[] = [];
      if (depth < 3 && (m as typeof meNonNull).downlines) {
        children = await Promise.all(
          (m as typeof meNonNull).downlines.map((child: typeof meNonNull.downlines[0]) =>
            buildNode(child, depth + 1)
          )
        );
      }

      return {
        id: m.user.id.toString(),
        name: m.user.name,
        memberCode: m.user.memberCode,
        avatarUrl: m.user.avatarUrl,
        mlmMemberCode: m.memberCode,
        memberType: m.memberType,
        status: m.status,
        currentLevel: m.currentLevel,
        titleLevel: m.titleLevel,
        isActive,
        selfPoints,
        consecutiveNonPurchase: consecutive,
        nonPurchaseAlert: alert,
        children,
      };
    }

    const downlineNodes = await Promise.all(
      meNonNull.downlines.map((d) => buildNode(d, 1))
    );

    return NextResponse.json({
      month: currentMonth,
      me: {
        id: me.user.id.toString(),
        name: me.user.name,
        memberCode: me.user.memberCode,
        avatarUrl: me.user.avatarUrl,
        mlmMemberCode: me.memberCode,
        memberType: me.memberType,
        currentLevel: me.currentLevel,
        titleLevel: me.titleLevel,
        isActive: myIsActive,
        selfPoints: mySelfPoints,
      },
      downlines: downlineNodes,
    });
  } catch (e) {
    console.error("mlm-org-chart error:", e);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}
