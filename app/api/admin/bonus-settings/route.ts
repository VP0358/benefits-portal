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
          // LV.1（3段目まで）
          unilevelLv1Rate1: 15.0,
          unilevelLv1Rate2: 7.0,
          unilevelLv1Rate3: 3.0,
          // LV.2（5段目まで）
          unilevelLv2Rate1: 15.0,
          unilevelLv2Rate2: 7.0,
          unilevelLv2Rate3: 3.0,
          unilevelLv2Rate4: 1.0,
          unilevelLv2Rate5: 1.0,
          // LV.3（7段目まで）
          unilevelLv3Rate1: 15.0,
          unilevelLv3Rate2: 8.0,
          unilevelLv3Rate3: 5.0,
          unilevelLv3Rate4: 4.0,
          unilevelLv3Rate5: 2.0,
          unilevelLv3Rate6: 1.0,
          unilevelLv3Rate7: 1.0,
          // LV.4（7段目まで）
          unilevelLv4Rate1: 15.0,
          unilevelLv4Rate2: 9.0,
          unilevelLv4Rate3: 6.0,
          unilevelLv4Rate4: 5.0,
          unilevelLv4Rate5: 3.0,
          unilevelLv4Rate6: 2.0,
          unilevelLv4Rate7: 1.0,
          // LV.5（7段目まで）
          unilevelLv5Rate1: 15.0,
          unilevelLv5Rate2: 10.0,
          unilevelLv5Rate3: 7.0,
          unilevelLv5Rate4: 6.0,
          unilevelLv5Rate5: 4.0,
          unilevelLv5Rate6: 3.0,
          unilevelLv5Rate7: 2.0,
          // 組織構築ボーナス（LV3以上）
          structureLv3Rate: 3.0,
          structureLv4Rate: 3.5,
          structureLv5Rate: 4.0,
          // その他設定
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
          // LV.1（3段目まで）
          unilevelLv1Rate1: bonusSettings.unilevelLv1Rate1,
          unilevelLv1Rate2: bonusSettings.unilevelLv1Rate2,
          unilevelLv1Rate3: bonusSettings.unilevelLv1Rate3,
          // LV.2（5段目まで）
          unilevelLv2Rate1: bonusSettings.unilevelLv2Rate1,
          unilevelLv2Rate2: bonusSettings.unilevelLv2Rate2,
          unilevelLv2Rate3: bonusSettings.unilevelLv2Rate3,
          unilevelLv2Rate4: bonusSettings.unilevelLv2Rate4,
          unilevelLv2Rate5: bonusSettings.unilevelLv2Rate5,
          // LV.3（7段目まで）
          unilevelLv3Rate1: bonusSettings.unilevelLv3Rate1,
          unilevelLv3Rate2: bonusSettings.unilevelLv3Rate2,
          unilevelLv3Rate3: bonusSettings.unilevelLv3Rate3,
          unilevelLv3Rate4: bonusSettings.unilevelLv3Rate4,
          unilevelLv3Rate5: bonusSettings.unilevelLv3Rate5,
          unilevelLv3Rate6: bonusSettings.unilevelLv3Rate6,
          unilevelLv3Rate7: bonusSettings.unilevelLv3Rate7,
          // LV.4（7段目まで）
          unilevelLv4Rate1: bonusSettings.unilevelLv4Rate1,
          unilevelLv4Rate2: bonusSettings.unilevelLv4Rate2,
          unilevelLv4Rate3: bonusSettings.unilevelLv4Rate3,
          unilevelLv4Rate4: bonusSettings.unilevelLv4Rate4,
          unilevelLv4Rate5: bonusSettings.unilevelLv4Rate5,
          unilevelLv4Rate6: bonusSettings.unilevelLv4Rate6,
          unilevelLv4Rate7: bonusSettings.unilevelLv4Rate7,
          // LV.5（7段目まで）
          unilevelLv5Rate1: bonusSettings.unilevelLv5Rate1,
          unilevelLv5Rate2: bonusSettings.unilevelLv5Rate2,
          unilevelLv5Rate3: bonusSettings.unilevelLv5Rate3,
          unilevelLv5Rate4: bonusSettings.unilevelLv5Rate4,
          unilevelLv5Rate5: bonusSettings.unilevelLv5Rate5,
          unilevelLv5Rate6: bonusSettings.unilevelLv5Rate6,
          unilevelLv5Rate7: bonusSettings.unilevelLv5Rate7,
          // 組織構築ボーナス（LV3以上）
          structureLv3Rate: bonusSettings.structureLv3Rate,
          structureLv4Rate: bonusSettings.structureLv4Rate,
          structureLv5Rate: bonusSettings.structureLv5Rate,
          // その他設定
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
