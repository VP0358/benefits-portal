/**
 * 商品マスタ初期データ投入スクリプト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const initialProducts = [
  {
    code: '1000',
    name: '[新規]VIOLA Pure 翠彩-SUMISAI-',
    price: 0, // 金額は管理画面から設定
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
]

async function main() {
  console.log('🌱 商品マスタデータ投入開始...')

  for (const product of initialProducts) {
    // 既存チェック
    const existing = await prisma.product.findFirst({
      where: { code: product.code },
    })

    if (existing) {
      console.log(`⏭️  スキップ: ${product.code} - ${product.name} (既に存在)`)
      continue
    }

    // 作成
    const created = await prisma.product.create({
      data: product,
    })

    console.log(`✅ 作成: ${created.code} - ${created.name}`)
  }

  console.log('🎉 商品マスタデータ投入完了！')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
