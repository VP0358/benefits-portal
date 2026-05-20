/**
 * GET /api/admin/bonus-run/member-debug?memberCode=868206&bonusMonth=2026-04
 * 特定会員の貯金ポイント計算に必要な全データを返す診断API
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const memberCodeQuery = searchParams.get("memberCode") ?? "";
  const bonusMonth      = searchParams.get("bonusMonth") ?? "2026-04";

  // 会員検索（部分一致）
  const members = await prisma.mlmMember.findMany({
    where: { memberCode: { contains: memberCodeQuery } },
    include: { user: { select: { name: true, email: true } } },
  });

  if (members.length === 0) {
    return NextResponse.json({ error: "会員が見つかりません", memberCodeQuery });
  }

  const results = [];

  for (const member of members) {
    // 今月購入データ
    const purchases = await prisma.mlmPurchase.findMany({
      where: { mlmMemberId: member.id, purchaseMonth: bonusMonth },
      include: {
        order: { select: { slipType: true, paidAt: true, paymentStatus: true } },
      },
    });

    // 過去の商品1000購入履歴（今月より前）
    const pastP1000 = await prisma.mlmPurchase.findMany({
      where: {
        mlmMemberId: member.id,
        productCode: "1000",
        purchaseMonth: { lt: bonusMonth },
      },
      select: { purchaseMonth: true },
      orderBy: { purchaseMonth: "asc" },
    });

    // 前月のボーナス結果
    const [y, m] = bonusMonth.split("-").map(Number);
    const prevTotal = y * 12 + (m - 1) - 1;
    const prevYear  = Math.floor(prevTotal / 12);
    const prevMon   = (prevTotal % 12) + 1;
    const prevBonusMonth = `${prevYear}-${String(prevMon).padStart(2, "0")}`;

    let prevResult = null;
    try {
      const bonusRunPrev = await prisma.bonusRun.findUnique({ where: { bonusMonth: prevBonusMonth } });
      if (bonusRunPrev) {
        prevResult = await (prisma as any).bonusResult.findFirst({
          where: { bonusRunId: bonusRunPrev.id, mlmMemberId: member.id },
          select: {
            isActive: true,
            savingsPointsAdded: true,
            savingsPoints: true,
            savingsPtAFromRegistration: true,
          },
        });
      }
    } catch { /* スキップ */ }

    // 当月ボーナス結果
    let currentResult = null;
    try {
      const bonusRunCurrent = await prisma.bonusRun.findUnique({ where: { bonusMonth } });
      if (bonusRunCurrent) {
        currentResult = await (prisma as any).bonusResult.findFirst({
          where: { bonusRunId: bonusRunCurrent.id, mlmMemberId: member.id },
          select: {
            isActive: true,
            achievedLevel: true,
            directBonus: true,
            unilevelBonus: true,
            structureBonus: true,
            groupPoints: true,
            savingsPointsAdded: true,
            savingsPoints: true,
            savingsPtAFromRegistration: true,
          },
        });
      }
    } catch { /* スキップ */ }

    // 登録月判定
    const createdAtJST  = new Date(member.createdAt.getTime() + 9 * 60 * 60 * 1000);
    const createdMonth  = `${createdAtJST.getUTCFullYear()}-${String(createdAtJST.getUTCMonth() + 1).padStart(2, "0")}`;
    const isRegMonth    = createdMonth === bonusMonth;

    // 01ポジション判定
    const parts      = member.memberCode.split("-");
    const isFirstPos = parts.length < 2 || parts[parts.length - 1] === "01";

    // 購入集計
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type P = (typeof purchases)[number];
    const p1000Count  = purchases.filter((p: P) => p.productCode === "1000").reduce((s: number, p: P) => s + p.quantity, 0);
    const p2000Pt     = purchases.filter((p: P) => ["1000","2000"].includes(p.productCode)).reduce((s: number, p: P) => s + (p.totalPoints || 0), 0);
    const asInvoicePt = purchases
      .filter((p: P) => p.order?.slipType === "autoship" && (p.order?.paidAt || p.order?.paymentStatus === "paid") && ["1000","2000"].includes(p.productCode))
      .reduce((s: number, p: P) => s + (p.totalPoints || 0), 0);
    const hasAsInvoice = purchases.some((p: P) => p.order?.slipType === "autoship" && (p.order?.paidAt || p.order?.paymentStatus === "paid"));

    results.push({
      memberCode:        member.memberCode,
      name:              member.user?.name,
      status:            member.status,
      isFirstPosition:   isFirstPos,
      savingsPoints_DB:  member.savingsPoints,
      createdAt:         member.createdAt,
      createdMonth,
      isRegistrationMonth: isRegMonth,

      purchases: purchases.map((p: P) => ({
        productCode:   p.productCode,
        quantity:      p.quantity,
        totalPoints:   p.totalPoints,
        slipType:      p.order?.slipType,
        paidAt:        p.order?.paidAt,
        paymentStatus: p.order?.paymentStatus,
      })),

      summary: {
        selfPurchasePoints:    p2000Pt,
        product1000Count:      p1000Count,
        autoshipInvoicePoints: asInvoicePt,
        hasAutoshipInvoice:    hasAsInvoice,
        hasPastProduct1000:    pastP1000.length > 0,
        pastProduct1000Months: pastP1000.map((p: { purchaseMonth: string }) => p.purchaseMonth),
      },

      conditions: {
        A: {
          label: "A: 初回登録月仮付与",
          pass:  isFirstPos && isRegMonth && pastP1000.length === 0 && p1000Count >= 1,
          checks: {
            isFirstPosition:      isFirstPos,
            isRegistrationMonth:  isRegMonth,
            noPastProduct1000:    pastP1000.length === 0,
            product1000Purchased: p1000Count >= 1,
          },
        },
        B: {
          label: "B: AS伝票による付与",
          pass:  isFirstPos && member.status === "autoship" && hasAsInvoice && asInvoicePt > 0,
          checks: {
            isFirstPosition: isFirstPos,
            statusAutoship:  member.status === "autoship",
            hasAsInvoice,
            asInvoicePt,
          },
        },
        C: {
          label: "C: ボーナス発生による付与",
          pass:  isFirstPos && member.status === "autoship",
          note:  "当月ボーナス計算結果で判定（ボーナス>0かつGP>0が必要）",
          checks: {
            isFirstPosition: isFirstPos,
            statusAutoship:  member.status === "autoship",
          },
        },
      },

      prevBonusMonth,
      prevResult,
      currentResult,
    });
  }

  return NextResponse.json({ bonusMonth, results });
}
