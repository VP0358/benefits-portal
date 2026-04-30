// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { executeBonusCalculation } from "@/lib/bonus-calculation-engine";

/**
 * GET /api/admin/bonus-run?bonusMonth=2026-02
 * 指定月のボーナス実行情報を取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
    });

    if (!bonusRun) {
      // ボーナス実行がまだ存在しない場合はnullを返す
      return NextResponse.json({ bonusRun: null });
    }

    return NextResponse.json({
      bonusRun: {
        id: bonusRun.id.toString(),
        bonusMonth: bonusRun.bonusMonth,
        status: bonusRun.status,
        paymentAdjustmentRate: bonusRun.paymentAdjustmentRate,
        totalBonusAmount: bonusRun.totalBonusAmount,
        totalMembers: bonusRun.totalMembers,
        totalActiveMembers: bonusRun.totalActiveMembers,
        capAdjustmentAmount: bonusRun.capAdjustmentAmount,
        executedByAdminId: bonusRun.executedByAdminId?.toString(),
        confirmedAt: bonusRun.confirmedAt?.toISOString(),
        createdAt: bonusRun.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching bonus run:", error);
    return NextResponse.json(
      { error: "Failed to fetch bonus run" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/bonus-run
 * ボーナス計算を実行
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth, paymentAdjustmentRate } = body;

    if (!bonusMonth) {
      return NextResponse.json(
        { error: "bonusMonth required" },
        { status: 400 }
      );
    }

    // 既存のボーナス実行をチェック
    const existing = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bonus calculation already exists for this month" },
        { status: 409 }
      );
    }

    // ボーナス計算実行（エンジン呼び出し）
    // UIは%単位（例: 2）で送ってくるので、エンジンが期待する小数（例: 0.02）に変換する
    const rateDecimal =
      paymentAdjustmentRate != null && Number(paymentAdjustmentRate) > 0
        ? Number(paymentAdjustmentRate) / 100
        : null;
    const result = await executeBonusCalculation(bonusMonth, rateDecimal);

    return NextResponse.json({
      success: true,
      bonusRunId: result.bonusRunId.toString(),
      totalMembers: result.totalMembers,
      totalActiveMembers: result.totalActiveMembers,
      totalBonusAmount: result.totalBonusAmount,
      message: `ボーナス計算が完了しました（対象: ${result.totalMembers}名、アクティブ: ${result.totalActiveMembers}名）`,
    });
  } catch (error) {
    console.error("Error executing bonus calculation:", error);
    return NextResponse.json(
      { error: "Failed to execute bonus calculation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/bonus-run
 * ボーナス計算の支払調整率を更新
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusMonth, paymentAdjustmentRate } = body;

    if (!bonusMonth) {
      return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
    }

    const bonusRun = await prisma.bonusRun.findUnique({ where: { bonusMonth } });
    if (!bonusRun) {
      return NextResponse.json({ error: "Bonus run not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (paymentAdjustmentRate != null) {
      // UIは%単位（例: 2）で送ってくるので、DBには%のまま保存（表示用）
      updateData.paymentAdjustmentRate = Number(paymentAdjustmentRate);
    }
    if (body.note !== undefined) {
      updateData.note = body.note || null;
    }

    const updated = await prisma.bonusRun.update({
      where: { bonusMonth },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      paymentAdjustmentRate: updated.paymentAdjustmentRate,
      message: "支払調整率を更新しました",
    });
  } catch (error) {
    console.error("Error updating payment adjustment rate:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/bonus-run?bonusMonth=2026-02
 * ボーナス計算を削除
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    const force = searchParams.get("force") === "true";

    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
    });

    if (!bonusRun) {
      return NextResponse.json(
        { error: "Bonus run not found" },
        { status: 404 }
      );
    }

    // 確定済みは force=true のみ削除可（通常UIからの誤操作防止）
    if (bonusRun.status === "confirmed" && !force) {
      return NextResponse.json(
        { error: "確定済みのボーナス計算です。強制削除する場合は force=true を指定してください" },
        { status: 403 }
      );
    }

    // カスケード削除（BonusResultも自動削除される）
    await prisma.bonusRun.delete({
      where: { bonusMonth },
    });

    return NextResponse.json({
      success: true,
      message: "ボーナス計算を削除しました",
    });
  } catch (error) {
    console.error("Error deleting bonus run:", error);
    return NextResponse.json(
      { error: "Failed to delete bonus run" },
      { status: 500 }
    );
  }
}
