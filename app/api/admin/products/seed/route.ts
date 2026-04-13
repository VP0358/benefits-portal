// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { prisma } from "@/lib/prisma";

// MLM商品マスタの初期データ（要件で指定された商品）
const mlmInitialProducts = [
  {
    productCode: '1000',
    name: '[新規]VIOLA Pure 翠彩-SUMISAI-',
    price: 16500,
    pv: 150,
    description: '新規会員向けVIOLA Pure 翠彩-SUMISAI-',
    isActive: true,
    isRegistration: true,
  },
  {
    productCode: '2000',
    name: 'VIOLA Pure 翠彩-SUMISAI-',
    price: 16500,
    pv: 150,
    description: '通常版VIOLA Pure 翠彩-SUMISAI-',
    isActive: true,
    isRegistration: false,
  },
  {
    productCode: '4000',
    name: '出荷事務手数料',
    price: 880,
    pv: 0,
    description: '出荷時の事務手数料（税込）',
    isActive: true,
    isRegistration: false,
  },
  {
    productCode: '5000',
    name: '概要書面1部',
    price: 550,
    pv: 0,
    description: '概要書面（1部）',
    isActive: true,
    isRegistration: false,
  },
  {
    productCode: 's1000',
    name: '登録料',
    price: 3300,
    pv: 0,
    description: '新規登録時の登録料（5口）',
    isActive: true,
    isRegistration: true,
  },
];

/**
 * POST /api/admin/products/seed
 * MLM商品マスタ初期データ投入
 */
export async function POST() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const results = [];

    for (const product of mlmInitialProducts) {
      // upsert: 既存なら更新、なければ作成
      const upserted = await prisma.mlmProduct.upsert({
        where: { productCode: product.productCode },
        create: product,
        update: {
          name: product.name,
          price: product.price,
          pv: product.pv,
          description: product.description,
          isActive: product.isActive,
          isRegistration: product.isRegistration,
        },
      });

      results.push({
        productCode: upserted.productCode,
        name: upserted.name,
        price: upserted.price,
        pv: upserted.pv,
        status: 'upserted',
        message: `商品コード ${upserted.productCode} を登録/更新しました`,
      });
    }

    return NextResponse.json({
      message: 'MLM商品マスタデータ投入完了',
      results,
      total: results.length,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error seeding MLM products:", errMsg);
    return NextResponse.json(
      { error: "初期データ投入に失敗しました", detail: errMsg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/products/seed
 * 現在のMLM商品マスタ一覧を返す（確認用）
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const products = await prisma.mlmProduct.findMany({
      orderBy: { productCode: 'asc' },
    });

    return NextResponse.json({
      products: products.map(p => ({
        productCode: p.productCode,
        name: p.name,
        price: p.price,
        pv: p.pv,
        isActive: p.isActive,
        isRegistration: p.isRegistration,
      })),
      total: products.length,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
