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
    // 【リデザイン】
    //   - 当月獲得者: 当月にautoship伝票（入金済）が発行された全会員
    //                BonusRunの有無・紹介者の有無に関係なく全員表示
    //   - 累計獲得者: MlmMember.savingsPoints > 0 の全会員
    // =====================================================
    if (tab === "savings") {
      // ── 当月autoship伝票発行者を MlmPurchase + Order から直接取得 ──
      const autoshipPurchases = await prisma.mlmPurchase.findMany({
        where: {
          purchaseMonth: bonusMonth,
          order: {
            slipType: "autoship",
            OR: [
              { paidAt: { not: null } },
              { paymentStatus: "paid" },
            ],
          },
        },
        select: {
          mlmMemberId: true,
          totalPoints: true,
          mlmMember: {
            select: {
              memberCode: true,
              companyName: true,
              savingsPoints: true,
              user: { select: { name: true } },
            },
          },
        },
        distinct: ["mlmMemberId"],
        orderBy: { mlmMember: { memberCode: "asc" } },
      });

      // 当月autoship伝票発行者のmlmMemberIdセット
      const currentMonthMemberIds = new Set(autoshipPurchases.map((p) => p.mlmMemberId.toString()));

      // BonusRunがある場合は当月BonusResultの貯金ptも取得
      const bonusRun = await prisma.bonusRun.findUnique({
        where: { bonusMonth },
        select: { id: true },
      });

      // BonusResult から当月追加pt・累計ptをマップ
      type BrMap = { savingsPointsAdded: number; savingsPoints: number };
      const brMap = new Map<string, BrMap>();
      if (bonusRun) {
        const bonusResults = await prisma.bonusResult.findMany({
          where: { bonusRunId: bonusRun.id },
          select: {
            mlmMemberId: true,
            savingsPointsAdded: true,
            savingsPoints: true,
          },
        });
        for (const br of bonusResults) {
          brMap.set(br.mlmMemberId.toString(), {
            savingsPointsAdded: br.savingsPointsAdded,
            savingsPoints: br.savingsPoints,
          });
        }
      }

      // 当月獲得者レコード
      const currentMonthRecords = autoshipPurchases.map((p) => {
        const memberIdStr = p.mlmMemberId.toString();
        const br = brMap.get(memberIdStr);
        return {
          memberCode: p.mlmMember.memberCode,
          memberName: p.mlmMember.user.name,
          companyName: p.mlmMember.companyName ?? null,
          // BonusResultがあればそこから、なければMlmMemberの累計を表示
          savingsPoints: br ? br.savingsPoints : p.mlmMember.savingsPoints,
          // 今月追加pt (×10整数→実数に戻す、BonusResultなしは0)
          savingsPointsAdded: br ? br.savingsPointsAdded : 0,
          hasBonus: br ? br.savingsPointsAdded > 0 : false,
        };
      });

      // 累計獲得者: MlmMember.savingsPoints > 0 の全会員
      const allSavingsMembers = await prisma.mlmMember.findMany({
        where: { savingsPoints: { gt: 0 } },
        select: {
          memberCode: true,
          companyName: true,
          savingsPoints: true,
          user: { select: { name: true } },
        },
        orderBy: { savingsPoints: "desc" },
      });

      const cumulativeRecords = allSavingsMembers.map((m) => ({
        memberCode: m.memberCode,
        memberName: m.user.name,
        companyName: m.companyName ?? null,
        savingsPoints: m.savingsPoints,
      }));

      return NextResponse.json({
        records: currentMonthRecords,         // 当月autoship伝票発行者（後方互換）
        currentMonthRecords,                  // 当月獲得者
        cumulativeRecords,                    // 累計獲得者
        hasBonusRun: !!bonusRun,
        currentMonthMemberCount: currentMonthMemberIds.size,
      });
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
