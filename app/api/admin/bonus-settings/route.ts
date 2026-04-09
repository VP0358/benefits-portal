import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/bonus-settings
 * ボーナス設定取得
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ボーナス計算設定取得
    let bonusSettings = await prisma.bonusSettings.findFirst();
    
    // 存在しない場合はデフォルト値で作成
    if (!bonusSettings) {
      bonusSettings = await prisma.bonusSettings.create({
        data: {
          directBonusAmount: 2000,
          unilevelRate1: 15.0,
          unilevelRate2: 10.0,
          unilevelRate3: 7.0,
          unilevelRate4: 5.0,
          unilevelRate5: 3.0,
          unilevelRate6: 2.0,
          unilevelRate7: 1.0,
          structureMinSeriesRate1: 3.0,
          structureMinSeriesRate2: 4.0,
          activeThresholdPoints: 150,
          serviceFeeAmount: 440,
          minPayoutAmount: 2560,
        },
      });
    }

    // 貯金ボーナス設定取得
    let savingsConfig = await prisma.savingsBonusConfig.findFirst();
    
    // 存在しない場合はデフォルト値で作成
    if (!savingsConfig) {
      savingsConfig = await prisma.savingsBonusConfig.create({
        data: {
          registrationRate: 20.0,
          autoshipRate: 5.0,
          bonusRate: 3.0,
        },
      });
    }

    return NextResponse.json({
      bonusSettings,
      savingsConfig,
    });
  } catch (error: any) {
    console.error("❌ ボーナス設定取得エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/bonus-settings
 * ボーナス設定更新
 */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { bonusSettings, savingsConfig } = body;

    // バリデーション
    if (!bonusSettings || !savingsConfig) {
      return NextResponse.json(
        { error: "設定データが不正です" },
        { status: 400 }
      );
    }

    // ボーナス計算設定を更新
    const existingBonusSettings = await prisma.bonusSettings.findFirst();
    let updatedBonusSettings;

    if (existingBonusSettings) {
      updatedBonusSettings = await prisma.bonusSettings.update({
        where: { id: existingBonusSettings.id },
        data: {
          directBonusAmount: bonusSettings.directBonusAmount,
          unilevelRate1: bonusSettings.unilevelRate1,
          unilevelRate2: bonusSettings.unilevelRate2,
          unilevelRate3: bonusSettings.unilevelRate3,
          unilevelRate4: bonusSettings.unilevelRate4,
          unilevelRate5: bonusSettings.unilevelRate5,
          unilevelRate6: bonusSettings.unilevelRate6,
          unilevelRate7: bonusSettings.unilevelRate7,
          structureMinSeriesRate1: bonusSettings.structureMinSeriesRate1,
          structureMinSeriesRate2: bonusSettings.structureMinSeriesRate2,
          activeThresholdPoints: bonusSettings.activeThresholdPoints,
          serviceFeeAmount: bonusSettings.serviceFeeAmount,
          minPayoutAmount: bonusSettings.minPayoutAmount,
        },
      });
    } else {
      updatedBonusSettings = await prisma.bonusSettings.create({
        data: bonusSettings,
      });
    }

    // 貯金ボーナス設定を更新
    const existingSavingsConfig = await prisma.savingsBonusConfig.findFirst();
    let updatedSavingsConfig;

    if (existingSavingsConfig) {
      updatedSavingsConfig = await prisma.savingsBonusConfig.update({
        where: { id: existingSavingsConfig.id },
        data: {
          registrationRate: savingsConfig.registrationRate,
          autoshipRate: savingsConfig.autoshipRate,
          bonusRate: savingsConfig.bonusRate,
        },
      });
    } else {
      updatedSavingsConfig = await prisma.savingsBonusConfig.create({
        data: savingsConfig,
      });
    }

    return NextResponse.json({
      message: "ボーナス設定を更新しました",
      bonusSettings: updatedBonusSettings,
      savingsConfig: updatedSavingsConfig,
    });
  } catch (error: any) {
    console.error("❌ ボーナス設定更新エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
