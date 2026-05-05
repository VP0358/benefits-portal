export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";

/**
 * GET /api/admin/bonus-utilities?bonusMonth=YYYY-MM&tab=payment|purchase|savings|history
 * ボーナスユーティリティ各タブのデータを返す
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");
  const tab = searchParams.get("tab") ?? "payment";

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    // =====================================================
    // 支払調書一覧 (tab=payment)
    // =====================================================
    if (tab === "payment") {
      const bonusRun = await prisma.bonusRun.findUnique({
        where: { bonusMonth },
        select: { id: true },
      });

      if (!bonusRun) {
        return NextResponse.json({ records: [] });
      }

      const results = await prisma.bonusResult.findMany({
        where: {
          bonusRunId: bonusRun.id,
          paymentAmount: { gt: 0 },
        },
        select: {
          id: true,
          bonusMonth: true,
          paymentAmount: true,
          withholdingTax: true,
          finalAmount: true,
          consumptionTax: true,
          serviceFee: true,
          adjustmentAmount: true,
          carryoverAmount: true,
          shortageAmount: true,
          mlmMember: {
            select: {
              memberCode: true,
              companyName: true,
              user: {
                select: {
                  name: true,
                  nameKana: true,
                },
              },
            },
          },
        },
        orderBy: { mlmMember: { memberCode: "asc" } },
      });

      const records = results.map((r) => ({
        id: r.id.toString(),
        memberCode: r.mlmMember.memberCode,
        memberName: r.mlmMember.user.name,
        memberNameKana: r.mlmMember.user.nameKana ?? "",
        companyName: r.mlmMember.companyName ?? null,
        paymentAmount: r.paymentAmount,
        withholdingTax: r.withholdingTax,
        finalAmount: r.finalAmount,
        consumptionTax: r.consumptionTax,
        serviceFee: r.serviceFee,
        adjustmentAmount: r.adjustmentAmount,
        carryoverAmount: r.carryoverAmount,
        shortageAmount: r.shortageAmount,
        bonusMonth: r.bonusMonth,
      }));

      return NextResponse.json({ records });
    }

    // =====================================================
    // 商品別購入一覧 (tab=purchase)
    // 選択月を含む直近6ヶ月分
    // =====================================================
    if (tab === "purchase") {
      const [year, month] = bonusMonth.split("-").map(Number);

      // 直近6ヶ月のリストを生成
      const months: string[] = [];
      for (let i = 0; i < 6; i++) {
        const total = year * 12 + (month - 1) - i;
        const ny = Math.floor(total / 12);
        const nm = (total % 12) + 1;
        months.push(`${ny}-${String(nm).padStart(2, "0")}`);
      }

      // 商品コード別・月別に集計
      const purchases = await prisma.mlmPurchase.groupBy({
        by: ["productCode", "productName", "purchaseMonth"],
        where: {
          purchaseMonth: { in: months },
        },
        _sum: {
          unitPrice: true,
          quantity: true,
          totalPoints: true,
        },
        _count: { id: true },
      });

      // 商品コード別に整形
      const productMap: Record<string, {
        productCode: string;
        productName: string;
        monthlyData: Record<string, { amount: number; count: number; points: number }>;
      }> = {};

      for (const p of purchases) {
        const key = p.productCode;
        if (!productMap[key]) {
          productMap[key] = {
            productCode: p.productCode,
            productName: p.productName,
            monthlyData: {},
          };
        }
        // unitPrice × quantity = totalAmount
        const qty = p._sum.quantity ?? 1;
        const unitP = p._sum.unitPrice ?? 0;
        const amount = unitP;  // groupByのsumはunitPriceの合計（qty分込）
        productMap[key].monthlyData[p.purchaseMonth] = {
          amount,
          count: p._count.id,
          points: p._sum.totalPoints ?? 0,
        };
      }

      const records = Object.values(productMap).sort((a, b) =>
        a.productCode.localeCompare(b.productCode)
      );

      return NextResponse.json({ records, months });
    }

    // =====================================================
    // 貯金ポイント一覧 (tab=savings)
    // =====================================================
    if (tab === "savings") {
      const bonusRun = await prisma.bonusRun.findUnique({
        where: { bonusMonth },
        select: { id: true },
      });

      if (!bonusRun) {
        return NextResponse.json({ records: [] });
      }

      const results = await prisma.bonusResult.findMany({
        where: {
          bonusRunId: bonusRun.id,
          savingsPointsAdded: { gt: 0 },
        },
        select: {
          savingsPoints: true,
          savingsPointsAdded: true,
          savingsBonus: true,
          mlmMember: {
            select: {
              memberCode: true,
              companyName: true,
              user: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { mlmMember: { memberCode: "asc" } },
      });

      const records = results.map((r) => ({
        memberCode: r.mlmMember.memberCode,
        memberName: r.mlmMember.user.name,
        companyName: r.mlmMember.companyName ?? null,
        savingsPoints: r.savingsPoints,
        savingsPointsAdded: r.savingsPointsAdded,
        savingsBonus: r.savingsBonus,
      }));

      return NextResponse.json({ records });
    }

    // =====================================================
    // 更新履歴 (tab=history)
    // AdminAuditLogからボーナス関連操作を取得
    // =====================================================
    if (tab === "history") {
      const bonusRun = await prisma.bonusRun.findUnique({
        where: { bonusMonth },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          confirmedAt: true,
          note: true,
        },
      });

      // ボーナス関連のauditログを取得
      const logs = await prisma.adminAuditLog.findMany({
        where: {
          OR: [
            { targetTable: "bonus_runs", targetId: bonusMonth },
            { targetTable: "bonus_runs", targetId: bonusRun?.id.toString() },
            { targetTable: "bonus_results" },
            { targetTable: "bonus_adjustments" },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          adminId: true,
          actionType: true,
          targetTable: true,
          targetId: true,
          createdAt: true,
          afterJson: true,
        },
      });

      const tableLabel: Record<string, string> = {
        bonus_runs:        "ボーナス計算",
        bonus_results:     "ボーナス結果",
        bonus_adjustments: "調整金",
      };

      const historyItems = logs.map((log) => ({
        id: log.id.toString(),
        timestamp: log.createdAt.toISOString(),
        adminId: log.adminId?.toString() ?? null,
        action: log.actionType,
        tableName: tableLabel[log.targetTable] ?? log.targetTable,
        targetId: log.targetId ?? "",
        content: `${tableLabel[log.targetTable] ?? log.targetTable}を${log.actionType}（ID: ${log.targetId ?? "-"}）`,
      }));

      return NextResponse.json({
        history: historyItems,
        bonusRun: bonusRun
          ? {
              id: bonusRun.id.toString(),
              status: bonusRun.status,
              createdAt: bonusRun.createdAt.toISOString(),
              updatedAt: bonusRun.updatedAt.toISOString(),
              confirmedAt: bonusRun.confirmedAt?.toISOString() ?? null,
              note: bonusRun.note ?? "",
            }
          : null,
      });
    }

    return NextResponse.json({ error: "invalid tab" }, { status: 400 });
  } catch (error) {
    console.error("bonus-utilities API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
