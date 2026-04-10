/**
 * CSVから会員データを一括インポートするスクリプト
 * member_mst.csvから794名の会員データを完全一致で登録
 */

import { PrismaClient, MlmMemberStatus, UserStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { hash } from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ステータスマッピング
const STATUS_MAP: Record<string, MlmMemberStatus> = {
  '活動中': 'active',
  'オートシップ': 'autoship',
  '退会': 'withdrawn',
  'クーリングオフ': 'midCancel',
}

const USER_STATUS_MAP: Record<string, UserStatus> = {
  '活動中': 'active',
  'オートシップ': 'active',
  '退会': 'canceled',
  'クーリングオフ': 'suspended',
}

// レベルマッピング
const LEVEL_MAP: Record<string, number> = {
  '取得レベルなし': 0,
  'LV.1': 1,
  'LV.2': 2,
  'LV.3': 3,
  'LV.4': 4,
  'LV.5': 5,
}

interface CsvRow {
  [key: string]: string
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null
  // YYYY/MM/DD 形式
  const m = dateStr.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})/)
  if (m) {
    return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+09:00`)
  }
  // YYYY-MM-DD 形式
  const m2 = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) {
    return new Date(`${m2[1]}-${m2[2]}-${m2[3]}T00:00:00+09:00`)
  }
  return null
}

function generateEmail(row: CsvRow, index: number): string {
  const email = row['Eメールアドレス']?.trim()
  if (email) {
    // 実メールアドレスが重複する場合も会員IDをサフィックスに追加
    return email
  }
  // メールがない場合はダミーメールを生成（会員IDベース・必ずユニーク）
  return `member_${row['会員ID'].trim()}@viola-pure.internal`
}

async function main() {
  console.log('=== MLM会員CSVインポート開始 ===')

  // CSVファイル読み込み（Shift-JIS）
  const csvPath = path.resolve('/home/user/uploaded_files/2026-4-10-10-38-5member_mst.csv')
  const buffer = fs.readFileSync(csvPath)
  const content = iconv.decode(buffer, 'shift_jis')
  
  const records: CsvRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: false,
  })
  
  console.log(`読み込み件数: ${records.length}件`)

  // 会員ID→行のマッピング
  const idToRecord: Record<string, CsvRow> = {}
  for (const row of records) {
    idToRecord[row['会員ID'].trim()] = row
  }

  // フェーズ1: Userと MlmMember を作成（紹介者・直上者なし）
  console.log('\n--- フェーズ1: 会員基本データ登録 ---')
  
  const memberCodeToId: Record<string, bigint> = {}  // memberCode -> MlmMember.id
  const memberCodeToUserId: Record<string, bigint> = {}  // memberCode -> User.id
  
  let created = 0
  let skipped = 0
  let failed = 0

  for (const row of records) {
    const memberCode = row['会員ID'].trim()
    if (!memberCode) continue

    try {
      // 既存チェック（memberCodeで重複確認）
      const existing = await prisma.mlmMember.findUnique({
        where: { memberCode },
        include: { user: true },
      })

      if (existing) {
        // 既存の場合はステータスとレベルを更新
        const status = STATUS_MAP[row['ステイタス']?.trim()] || 'active'
        const currentLevel = LEVEL_MAP[row['レベル']?.trim()] || 0
        
        await prisma.mlmMember.update({
          where: { memberCode },
          data: {
            status,
            currentLevel,
            titleLevel: currentLevel,
          },
        })
        memberCodeToId[memberCode] = existing.id
        memberCodeToUserId[memberCode] = existing.userId
        skipped++
        continue
      }

      // パスワード処理
      const rawPassword = row['パスワード']?.trim() || memberCode
      const passwordHash = await hash(rawPassword, 10)

      // メールアドレス（重複回避：実メールは会員IDをサフィックスに追加して一意性保証）
      const rawEmail = row['Eメールアドレス']?.trim()
      let email: string
      if (rawEmail) {
        // 既に同じメールが登録済みか確認
        const emailExists = await prisma.user.findUnique({ where: { email: rawEmail } })
        if (emailExists) {
          email = `member_${memberCode}@viola-pure.internal`
        } else {
          email = rawEmail
        }
      } else {
        email = `member_${memberCode}@viola-pure.internal`
      }

      // 住所組み立て
      const postalCode = row['郵便番号']?.trim() || null
      const prefecture = row['都道府県']?.trim() || null
      const city = row['市区町村番地']?.trim() || null
      const address2 = row['建物名・部屋番号']?.trim() || null
      const fullAddress = [prefecture, city, address2].filter(Boolean).join(' ') || null

      // ステータス
      const mlmStatus = STATUS_MAP[row['ステイタス']?.trim()] || 'active'
      const userStatus = USER_STATUS_MAP[row['ステイタス']?.trim()] || 'active'

      // レベル
      const currentLevel = LEVEL_MAP[row['レベル']?.trim()] || 0

      // 生年月日
      const birthDate = parseDate(row['生年月日'])

      // 性別
      const genderStr = row['性別']?.trim()
      let gender: string | null = null
      if (genderStr === '男性' || genderStr === '男') gender = 'male'
      else if (genderStr === '女性' || genderStr === '女') gender = 'female'

      // 契約締結日
      const contractDate = parseDate(row['契約締結日'])

      // オートシップフラグ
      const autoshipEnabled = mlmStatus === 'autoship'

      // 法人名
      const companyName = row['法人名']?.trim() || null
      const companyNameKana = row['法人名カナ']?.trim() || null

      // 銀行情報
      const bankName = row['コミ銀行名']?.trim() || null
      const bankCode = row['コミ銀行番号']?.trim() || null
      const branchName = row['コミ支店名']?.trim() || null
      const branchCode = row['コミ支店番号']?.trim() || null
      const accountType = row['コミ預金種目']?.trim() || null
      const accountNumber = row['コミ口座番号']?.trim() || null
      const accountHolder = row['コミ口座名義']?.trim() || null

      // メモ
      const note = row['メモ']?.trim() || null

      // 電話番号
      const phone = row['主要連絡先']?.trim() || null
      const mobile = row['連絡先']?.trim() || null

      // Userと MlmMember を同時作成
      const user = await prisma.user.create({
        data: {
          memberCode,
          name: row['名前']?.trim() || '未設定',
          nameKana: row['フリガナ']?.trim() || null,
          email,
          passwordHash,
          phone,
          postalCode,
          address: fullAddress,
          status: userStatus,
          mlmMember: {
            create: {
              memberCode,
              memberType: 'business',
              status: mlmStatus,
              currentLevel,
              titleLevel: currentLevel,
              contractDate,
              autoshipEnabled,
              companyName,
              companyNameKana,
              birthDate,
              gender,
              mobile,
              prefecture,
              city,
              address1: city,
              address2,
              bankCode,
              bankName,
              branchCode,
              branchName,
              accountType,
              accountNumber,
              accountHolder,
              note,
              forceActive: false,
            },
          },
        },
        include: { mlmMember: true },
      })

      memberCodeToId[memberCode] = user.mlmMember!.id
      memberCodeToUserId[memberCode] = user.id
      created++

      if (created % 50 === 0) {
        console.log(`  作成済み: ${created}件...`)
      }

    } catch (error: any) {
      console.error(`  ERROR [${memberCode}] ${row['名前']}: ${error.message}`)
      failed++
    }
  }

  console.log(`フェーズ1完了: 新規作成 ${created}件, 更新 ${skipped}件, エラー ${failed}件`)

  // フェーズ2: 紹介者（ユニレベル）と直上者（マトリックス）の紐づけ
  console.log('\n--- フェーズ2: 組織構造（紹介者・直上者）の紐づけ ---')
  
  let orgLinked = 0
  let orgFailed = 0

  for (const row of records) {
    const memberCode = row['会員ID'].trim()
    const mlmMemberId = memberCodeToId[memberCode]
    if (!mlmMemberId) continue

    const referrerId_code = row['紹介者ID']?.trim()
    const uplineId_code = row['直上者ID']?.trim()

    if (!referrerId_code && !uplineId_code) continue

    try {
      const updateData: any = {}

      // 紹介者（ユニレベル）
      if (referrerId_code && memberCodeToId[referrerId_code]) {
        updateData.referrerId = memberCodeToId[referrerId_code]
      }

      // 直上者（マトリックス）
      if (uplineId_code && memberCodeToId[uplineId_code]) {
        updateData.uplineId = memberCodeToId[uplineId_code]
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.mlmMember.update({
          where: { id: mlmMemberId },
          data: updateData,
        })
        orgLinked++
      }
    } catch (error: any) {
      console.error(`  ORG ERROR [${memberCode}]: ${error.message}`)
      orgFailed++
    }
  }

  console.log(`フェーズ2完了: 組織リンク ${orgLinked}件, エラー ${orgFailed}件`)

  // フェーズ3: ポイントウォレット作成（まだない会員に）
  console.log('\n--- フェーズ3: ポイントウォレット作成 ---')
  
  let walletCreated = 0
  for (const [memberCode, userId] of Object.entries(memberCodeToUserId)) {
    try {
      const existing = await prisma.pointWallet.findUnique({ where: { userId } })
      if (!existing) {
        await prisma.pointWallet.create({
          data: {
            userId,
            balance: 0,
            totalEarned: 0,
            totalUsed: 0,
          },
        })
        walletCreated++
      }
    } catch (error: any) {
      // ignore
    }
  }
  console.log(`フェーズ3完了: ウォレット作成 ${walletCreated}件`)

  // 最終集計
  const totalMembers = await prisma.mlmMember.count()
  const activeMembers = await prisma.mlmMember.count({ where: { status: 'active' } })
  const autoshipMembers = await prisma.mlmMember.count({ where: { status: 'autoship' } })
  const withdrawnMembers = await prisma.mlmMember.count({ where: { status: 'withdrawn' } })
  const midCancelMembers = await prisma.mlmMember.count({ where: { status: 'midCancel' } })
  
  console.log('\n=== インポート完了 ===')
  console.log(`総会員数: ${totalMembers}名`)
  console.log(`  活動中: ${activeMembers}名`)
  console.log(`  オートシップ: ${autoshipMembers}名`)
  console.log(`  退会: ${withdrawnMembers}名`)
  console.log(`  クーリングオフ: ${midCancelMembers}名`)

  // 組織構造統計
  const withReferrer = await prisma.mlmMember.count({ where: { NOT: { referrerId: null } } })
  const withUpline = await prisma.mlmMember.count({ where: { NOT: { uplineId: null } } })
  console.log(`\n組織構造:`)
  console.log(`  紹介者あり: ${withReferrer}名`)
  console.log(`  直上者あり: ${withUpline}名`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
