/**
 * 既存会員にreferralCodeを生成するスクリプト
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function generateReferralCode(memberCode: string): string {
  // 会員コードを基にした8文字の英数字コード
  // 例: 10234001 → "10234001" の最後8文字 + ランダム2文字
  const base = memberCode.replace(/\D/g, '').slice(-8).padStart(8, '0')
  const rand = Math.random().toString(36).substring(2, 4).toUpperCase()
  return `${base}${rand}`
}

async function main() {
  console.log('=== referralCode生成開始 ===')

  const users = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true, memberCode: true },
  })

  console.log(`対象ユーザー数: ${users.length}`)

  let updated = 0
  let failed = 0

  for (const user of users) {
    let referralCode: string
    let attempts = 0

    while (attempts < 10) {
      referralCode = generateReferralCode(user.memberCode)
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { referralCode },
        })
        updated++
        break
      } catch (error: any) {
        if (error.message?.includes('Unique constraint')) {
          attempts++
          continue
        }
        console.error(`ERROR [${user.memberCode}]: ${error.message}`)
        failed++
        break
      }
    }
  }

  console.log(`完了: 更新 ${updated}件, エラー ${failed}件`)

  // 確認
  const withCode = await prisma.user.count({ where: { NOT: { referralCode: null } } })
  console.log(`referralCodeあり: ${withCode}件`)
}

main()
  .catch(console.error)
  .finally(() => pool.end())
