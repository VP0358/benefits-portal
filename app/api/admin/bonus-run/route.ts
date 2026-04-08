import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-run?bonusMonth=2026-02
 * 指定月のボーナス実行情報を取得
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
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
  const session = await getServerSession(authOptions);
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

    // ボーナス計算実行（簡易版）
    // 実際の計算ロジックは複雑なため、ここではスケルトンのみ作成
    const bonusRun = await prisma.bonusRun.create({
      data: {
        bonusMonth,
        closingDate: new Date(),
        status: "draft",
        paymentAdjustmentRate: paymentAdjustmentRate
          ? Number(paymentAdjustmentRate)
          : null,
        totalMembers: 0,
        totalActiveMembers: 0,
        totalBonusAmount: 0,
        capAdjustmentAmount: 0,
      },
    });

    // TODO: 実際のボーナス計算ロジック
    // 1. アクティブ会員を取得
    // 2. 各会員のグループポイント、直接紹介数などを計算
    // 3. レベル判定
    // 4. 各種ボーナス計算（ダイレクト、ユニレベル、ランクアップ等）
    // 5. 調整金・繰越金を適用
    // 6. CAP調整
    // 7. 税金・手数料計算
    // 8. BonusResultレコード作成

    return NextResponse.json({
      success: true,
      bonusRunId: bonusRun.id.toString(),
      message: "ボーナス計算を開始しました（実際の計算ロジックは未実装）",
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
 * DELETE /api/admin/bonus-run?bonusMonth=2026-02
 * ボーナス計算を削除
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    // 確定済みボーナスは削除不可
    const bonusRun = await prisma.bonusRun.findUnique({
      where: { bonusMonth },
    });

    if (!bonusRun) {
      return NextResponse.json(
        { error: "Bonus run not found" },
        { status: 404 }
      );
    }

    if (bonusRun.status === "confirmed") {
      return NextResponse.json(
        { error: "Cannot delete confirmed bonus run" },
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
