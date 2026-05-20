/**
 * GET /api/admin/bonus-run/diagnose
 *
 * bonus_results テーブルの実際のカラム一覧を取得し、
 * テスト INSERT を試みて何が失敗するか診断する。
 */
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. bonus_results の実際のカラム一覧を取得
  try {
    const columns = await prisma.$queryRaw<{ column_name: string; data_type: string; column_default: string | null; is_nullable: string }[]>`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bonus_results'
      ORDER BY ordinal_position
    `;
    results.columns = columns;
  } catch (e) {
    results.columnsError = e instanceof Error ? e.message : String(e);
  }

  // 2. bonus_runs の最新1件を取得（テスト用bonusRunId）
  let testBonusRunId: bigint | null = null;
  try {
    const latestRun = await prisma.bonusRun.findFirst({ orderBy: { id: "desc" } });
    if (latestRun) {
      testBonusRunId = latestRun.id;
      results.latestBonusRunId = latestRun.id.toString();
      results.latestBonusRunMonth = latestRun.bonusMonth;
    }
  } catch (e) {
    results.bonusRunError = e instanceof Error ? e.message : String(e);
  }

  // 3. mlm_members の最初の1件を取得（テスト用mlmMemberId）
  let testMlmMemberId: bigint | null = null;
  try {
    const firstMember = await prisma.mlmMember.findFirst({ orderBy: { id: "asc" } });
    if (firstMember) {
      testMlmMemberId = firstMember.id;
      results.testMlmMemberId = firstMember.id.toString();
      results.testMemberCode = firstMember.memberCode;
    }
  } catch (e) {
    results.mlmMemberError = e instanceof Error ? e.message : String(e);
  }

  // 4. フルカラムでテスト INSERT を試みる（即 DELETE）
  if (testBonusRunId && testMlmMemberId) {
    // まず既存レコードを確認（UNIQUE制約エラー回避）
    try {
      const existing = await prisma.bonusResult.findUnique({
        where: { bonusRunId_mlmMemberId: { bonusRunId: testBonusRunId, mlmMemberId: testMlmMemberId } },
      });
      if (existing) {
        results.testInsertSkipped = "既存レコードあり（UNIQUE制約回避のためスキップ）";
      } else {
        // フルカラム INSERT テスト
        try {
          const created = await prisma.bonusResult.create({
            data: {
              bonusRunId:                testBonusRunId,
              mlmMemberId:               testMlmMemberId,
              bonusMonth:                "2099-01",  // テスト用ダミー月
              isActive:                  false,
              selfPurchasePoints:        0,
              groupPoints:               0,
              directActiveCount:         0,
              achievedLevel:             0,
              forcedLevel:               0,
              previousTitleLevel:        0,
              newTitleLevel:             0,
              directBonus:               0,
              unilevelBonus:             0,
              structureBonus:            0,
              adjustmentAmount:          0,
              amountBeforeAdjustment:    0,
              paymentAdjustmentRate:     0,
              paymentAdjustmentAmount:   0,
              finalAmount:               0,
              withholdingTax:            0,
              serviceFee:                0,
              paymentAmount:             0,
              unilevelDetail:            {},
              minLinePoints:             0,
              lineCount:                 0,
              savingsPointsAdded:        0,
              savingsPoints:             0,
              savingsPtAFromRegistration: false,
            },
          });
          results.testInsertFull = "✅ フルカラムINSERT成功";
          // すぐ削除
          await prisma.bonusResult.delete({ where: { id: created.id } });
          results.testDeleteFull = "✅ テストレコード削除成功";
        } catch (insertErr) {
          results.testInsertFullError = insertErr instanceof Error ? insertErr.message : String(insertErr);
        }

        // 貯金カラム除外 INSERT テスト
        try {
          const created2 = await prisma.bonusResult.create({
            data: {
              bonusRunId:              testBonusRunId,
              mlmMemberId:             testMlmMemberId,
              bonusMonth:              "2099-02",  // テスト用ダミー月
              isActive:                false,
              selfPurchasePoints:      0,
              groupPoints:             0,
              directActiveCount:       0,
              achievedLevel:           0,
              forcedLevel:             0,
              previousTitleLevel:      0,
              newTitleLevel:           0,
              directBonus:             0,
              unilevelBonus:           0,
              structureBonus:          0,
              adjustmentAmount:        0,
              amountBeforeAdjustment:  0,
              paymentAdjustmentRate:   0,
              paymentAdjustmentAmount: 0,
              finalAmount:             0,
              withholdingTax:          0,
              serviceFee:              0,
              paymentAmount:           0,
              unilevelDetail:          {},
              minLinePoints:           0,
              lineCount:               0,
            },
          });
          results.testInsertNoSavings = "✅ 貯金カラム除外INSERT成功";
          await prisma.bonusResult.delete({ where: { id: created2.id } });
          results.testDeleteNoSavings = "✅ テストレコード削除成功";
        } catch (insertErr2) {
          results.testInsertNoSavingsError = insertErr2 instanceof Error ? insertErr2.message : String(insertErr2);
        }
      }
    } catch (checkErr) {
      results.checkExistingError = checkErr instanceof Error ? checkErr.message : String(checkErr);
    }
  } else {
    results.testInsertSkipped = "bonusRunId または mlmMemberId が取得できなかったためスキップ";
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
