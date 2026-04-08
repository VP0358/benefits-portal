// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { prisma } from "@/lib/prisma";

const initialProducts = [
  {
    code: '1000',
    name: '[新規]VIOLA Pure 翠彩-SUMISAI-',
    price: 0,
    description: '新規会員向けVIOLA Pure 翠彩',
    isActive: true,
  },
  {
    code: '2000',
    name: 'VIOLA Pure 翠彩-SUMISAI-',
    price: 0,
    description: '通常版VIOLA Pure 翠彩',
    isActive: true,
  },
  {
    code: '4000',
    name: '出荷事務手数料',
    price: 0,
    description: '出荷時の事務手数料',
    isActive: true,
  },
  {
    code: '5000',
    name: '概要書面1部',
    price: 0,
    description: '概要書面',
    isActive: true,
  },
  {
    code: 's1000',
    name: '登録料',
    price: 0,
    description: '新規登録時の登録料',
    isActive: true,
  },
];

/**
 * POST /api/admin/products/seed
 * 商品マスタ初期データ投入
 */
export async function POST() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const results = [];

    for (const product of initialProducts) {
      // 既存チェック
      const existing = await prisma.product.findFirst({
        where: { code: product.code },
      });

      if (existing) {
        results.push({
          code: product.code,
          name: product.name,
          status: 'skipped',
          message: '既に存在します',
        });
        continue;
      }

      // 作成
      const created = await prisma.product.create({
        data: product,
      });

      results.push({
        code: created.code,
        name: created.name,
        status: 'created',
        message: '作成しました',
      });
    }

    return NextResponse.json({
      message: '商品マスタデータ投入完了',
      results,
    });
  } catch (error) {
    console.error("Error seeding products:", error);
    return NextResponse.json(
      { error: "初期データ投入に失敗しました" },
      { status: 500 }
    );
  }
}
