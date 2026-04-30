export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * カラムが存在しない場合に自動追加するヘルパー
 * bonus_results テーブルに isPublished / publishedAt がなければ ALTER TABLE で追加する
 */
async function ensureColumns() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false`
    );
  } catch {
    // 既に存在する場合は無視
  }
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "bonus_results" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3)`
    );
  } catch {
    // 既に存在する場合は無視
  }
}

/**
 * GET /api/admin/bonus-results/publish-all?bonusMonth=2026-03
 * 指定月の公開状態サマリーを取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bonusMonth = req.nextUrl.searchParams.get("bonusMonth");
  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    // カラムが存在することを保証してからカウント
    await ensureColumns();

    const total = await prisma.bonusResult.count({ where: { bonusMonth } });

    // isPublished でカウント（カラムが確実に存在する状態で実行）
    const publishedRows = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*) as cnt FROM "bonus_results" WHERE "bonusMonth" = $1 AND "isPublished" = true`,
      bonusMonth
    );
    const published = Number(publishedRows[0]?.cnt ?? 0);

    return NextResponse.json({
      bonusMonth,
      total,
      published,
      unpublished: total - published,
      allPublished: total > 0 && total === published,
    });
  } catch (error) {
    console.error("Error fetching publish status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/bonus-results/publish-all
 * 指定月の全会員ボーナス明細を一括公開（または一括非公開）
 * body: { bonusMonth: "2026-03", isPublished: true }
 * 公開時：各会員に savingsBonusRate(3%)分の貯金ポイントを付与
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bonusMonth, isPublished } = await req.json();

    if (!bonusMonth) {
      return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
    }

    const willPublish = Boolean(isPublished);

    // カラムが存在することを保証（未マイグレーション環境でも動作）
    await ensureColumns();

    // 公開する場合：まだ非公開の確定済みボーナス結果を取得して貯金ポイントを付与
    if (willPublish) {
      // 貯金ボーナス設定を取得（デフォルト3%）
      const savingsConfig = await prisma.savingsBonusConfig.findFirst();
      const bonusRate = savingsConfig?.bonusRate ?? 3.0;

      // 未公開の確定済みボーナス結果を Raw SQL で取得（isPublished カラムを直接参照）
      type RawBonusRow = { id: string; mlmMemberId: string; paymentAmount: number };
      const unpublishedRows = await prisma.$queryRawUnsafe<RawBonusRow[]>(`
        SELECT br.id, br."mlmMemberId", br."paymentAmount"
        FROM "bonus_results" br
        INNER JOIN "bonus_runs" brun ON brun.id = br."bonusRunId"
        WHERE br."bonusMonth" = $1
          AND brun.status = 'confirmed'
          AND br."paymentAmount" > 0
          AND br."isPublished" = false
      `, bonusMonth);

      // 各会員に貯金ポイントを付与
      let totalSavingsPoints = 0;
      for (const row of unpublishedRows) {
        const mlmMemberId = BigInt(row.mlmMemberId);
        const paymentAmount = Number(row.paymentAmount ?? 0);
        const savingsPoints = Math.floor(paymentAmount * (bonusRate / 100));

        if (savingsPoints > 0) {
          // mlmMember の userId を取得
          const member = await prisma.mlmMember.findUnique({
            where: { id: mlmMemberId },
            select: { id: true, memberCode: true, userId: true },
          });
          if (!member) continue;

          await prisma.pointWallet.upsert({
            where: { userId: member.userId },
            create: {
              userId: member.userId,
              externalPointsBalance: savingsPoints,
              availablePointsBalance: savingsPoints,
            },
            update: {
              externalPointsBalance: { increment: savingsPoints },
              availablePointsBalance: { increment: savingsPoints },
            },
          });

          // MLM会員の貯金ポイント累計を更新
          await prisma.mlmMember.update({
            where: { id: member.id },
            data: { savingsPoints: { increment: savingsPoints } },
          });

          // ボーナス結果に貯金ポイント付与数を記録
          await prisma.$executeRawUnsafe(
            `UPDATE "bonus_results" SET "savingsPointsAdded" = $1 WHERE id = $2`,
            savingsPoints,
            BigInt(row.id)
          );

          totalSavingsPoints += savingsPoints;
          console.log(`💰 貯金ポイント付与: ${member.memberCode} +${savingsPoints}pt`);
        }
      }

      console.log(`✅ 一括貯金ポイント付与完了: ${unpublishedRows.length}名 合計${totalSavingsPoints}pt`);
    }

    // 確定済みのボーナスのみ対象として公開状態を Raw SQL で更新
    const nowIso = new Date().toISOString();
    const updatedResult = await prisma.$queryRawUnsafe<{ count: string }[]>(`
      WITH updated AS (
        UPDATE "bonus_results" br
        SET
          "isPublished" = $1,
          "publishedAt" = $2
        FROM "bonus_runs" brun
        WHERE brun.id = br."bonusRunId"
          AND br."bonusMonth" = $3
          AND brun.status = 'confirmed'
        RETURNING br.id
      )
      SELECT COUNT(*) as count FROM updated
    `,
      willPublish,
      willPublish ? nowIso : null,
      bonusMonth
    );

    const updatedCount = Number(updatedResult[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      updatedCount,
      isPublished: willPublish,
      message: willPublish
        ? `${bonusMonth}のボーナス明細を${updatedCount}件公開しました`
        : `${bonusMonth}のボーナス明細を${updatedCount}件非公開にしました`,
    });
  } catch (error) {
    console.error("Error bulk-publishing bonus results:", error);
    return NextResponse.json({ error: "Internal server error", detail: String(error) }, { status: 500 });
  }
}
