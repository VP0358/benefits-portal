/**
 * CSVから会員データを一括インポートするスクリプト（新版）
 * 2026-5-1-16-26-9member_mst.csv から794名の会員データを登録
 *
 * 実行: node scripts/import-members-csv-new.mjs
 */

import pg from 'pg'
import { createHash } from 'crypto'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// ─── マッピング ───────────────────────────────────────────
const STATUS_MAP = {
  '活動中':       'active',
  'オートシップ': 'autoship',
  '退会':         'withdrawn',
  'クーリングオフ': 'midCancel',
}

const USER_STATUS_MAP = {
  '活動中':       'active',
  'オートシップ': 'active',
  '退会':         'canceled',
  'クーリングオフ': 'suspended',
}

const LEVEL_MAP = {
  '取得レベルなし': 0,
  'LV.1': 1,
  'LV.2': 2,
  'LV.3': 3,
  'LV.4': 4,
  'LV.5': 5,
}

const FORCE_LEVEL_MAP = {
  '未設定': null,
  'LV.1': 1,
  'LV.2': 2,
  'LV.3': 3,
  'LV.4': 4,
  'LV.5': 5,
}

// ─── ユーティリティ ──────────────────────────────────────
function parseDate(str) {
  if (!str || !str.trim()) return null
  const m = str.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (m) {
    const mm = String(m[2]).padStart(2, '0')
    const dd = String(m[3]).padStart(2, '0')
    return new Date(`${m[1]}-${mm}-${dd}T00:00:00+09:00`)
  }
  return null
}

// bcrypt の代わりに簡易ハッシュ（インポート時のみ）
// 本番では bcryptjs を使うべきだが、依存がある場合に使用
async function hashPassword(raw) {
  // bcryptjs が利用可能か試みる
  try {
    const { hash } = await import('bcryptjs')
    return await hash(raw, 10)
  } catch {
    // fallback: sha256（暫定）
    return '$plain$' + createHash('sha256').update(raw).digest('hex')
  }
}

function nullIf(str, empties = ['', '未設定', '未選択', 'なし']) {
  if (!str) return null
  const t = str.trim()
  return empties.includes(t) ? null : t
}

// ─── メイン ──────────────────────────────────────────────
async function main() {
  console.log('=== MLM会員CSVインポート開始 ===')
  console.log('日時:', new Date().toLocaleString('ja-JP'))

  const csvPath = '/home/user/uploaded_files/2026-5-1-16-26-9member_mst.csv'
  const buffer = fs.readFileSync(csvPath)
  const content = iconv.decode(buffer, 'cp932')

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: false,
    relax_column_count: true,
  })

  console.log(`読み込み件数: ${records.length}件`)

  // 会員IDマップ（フェーズ2で紐づけに使用）
  // memberCode -> { mlmId, userId }
  const codeToIds = {}

  // ─── フェーズ1: User + mlm_members 登録 ──────────────
  console.log('\n--- フェーズ1: 会員基本データ登録 ---')

  let created = 0
  let failed = 0

  for (const row of records) {
    const memberCode = row['会員ID']?.trim()
    if (!memberCode) continue

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // ── User 登録 ──
      // メールは必ずユニークにする（同一メールで複数会員IDがある枝番ケース対応）
      // 実メールが空 OR 既に登録済みの場合はダミーメールを使用
      const rawEmail = row['Eメールアドレス']?.trim()
      let email
      if (rawEmail && rawEmail !== '') {
        // 同じメールが既にDBに存在するか確認
        const existing = await client.query('SELECT id FROM "User" WHERE email=$1', [rawEmail])
        if (existing.rows.length > 0) {
          email = `member_${memberCode}@viola-pure.internal`
        } else {
          email = rawEmail
        }
      } else {
        email = `member_${memberCode}@viola-pure.internal`
      }

      const rawPassword = row['パスワード']?.trim() || memberCode
      const passwordHash = await hashPassword(rawPassword)

      const name = row['名前']?.trim() || '未設定'
      const nameKana = nullIf(row['フリガナ'])
      const phone = nullIf(row['主要連絡先'])  // col 38

      const postalCode = nullIf(row['郵便番号'])
      const prefecture = nullIf(row['都道府県'])
      const city = nullIf(row['市区町村番地'])
      const address2 = nullIf(row['建物名・部屋番号'])
      const fullAddress = [prefecture, city, address2].filter(Boolean).join(' ') || null

      const mlmStatus = STATUS_MAP[row['ステイタス']?.trim()] || 'active'
      const userStatus = USER_STATUS_MAP[row['ステイタス']?.trim()] || 'active'

      const userRes = await client.query(`
        INSERT INTO "User"
          ("memberCode","name","nameKana","email","passwordHash",
           "phone","postalCode","address","status","createdAt","updatedAt")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::\"UserStatus\",NOW(),NOW())
        ON CONFLICT ("memberCode") DO UPDATE SET
          "name"=$2,"nameKana"=$3,"email"=$4,"status"=$9::\"UserStatus\",
          "phone"=$6,"postalCode"=$7,"address"=$8,"updatedAt"=NOW()
        RETURNING id
      `, [memberCode, name, nameKana, email, passwordHash,
          phone, postalCode, fullAddress, userStatus])

      const userId = userRes.rows[0].id

      // ── MlmMember 登録 ──
      const currentLevel = LEVEL_MAP[row['レベル']?.trim()] ?? 0
      const forceLevelRaw = FORCE_LEVEL_MAP[row['強制レベル']?.trim() || '未設定']
      const forceActive = row['強制ACT']?.trim() === 'ACT'
      const conditionAchieved = row['条件']?.trim() === '達成'
      const autoshipEnabled = mlmStatus === 'autoship'

      const birthDate = parseDate(row['生年月日'])
      const contractDate = parseDate(row['契約締結日'])
      const firstPayDate = parseDate(row['初回入金日'])

      const genderStr = row['性別']?.trim()
      let gender = null
      if (genderStr === '男性' || genderStr === '男') gender = 'male'
      else if (genderStr === '女性' || genderStr === '女') gender = 'female'
      else if (genderStr === '法人') gender = 'other'

      const companyName = nullIf(row['法人名'])
      const companyNameKana = nullIf(row['法人名カナ'])
      const mobile = nullIf(row['連絡先'])  // col 40
      const note = nullIf(row['メモ'])

      // 銀行情報
      const bankName = nullIf(row['コミ銀行名'])
      const bankCode = nullIf(row['コミ銀行番号'])
      const branchName = nullIf(row['コミ支店名'])
      const branchCode = nullIf(row['コミ支店番号'])
      const accountType = nullIf(row['コミ預金種目'])
      const accountNumber = nullIf(row['コミ口座番号'])
      const accountHolder = nullIf(row['コミ口座名義'])

      const mlmRes = await client.query(`
        INSERT INTO mlm_members
          ("userId","memberCode","memberType","status",
           "currentLevel","titleLevel","conditionAchieved",
           "forceActive","forceLevel",
           "contractDate","firstPayDate",
           "autoshipEnabled",
           "companyName","companyNameKana",
           "birthDate","gender","mobile",
           "prefecture","city","address1","address2",
           "bankCode","bankName","branchCode","branchName",
           "accountType","accountNumber","accountHolder",
           "note","matrixPosition","savingsPoints",
           "createdAt","updatedAt")
        VALUES
          ($1,$2,'business',$3::\"MlmMemberStatus\",
           $4,$4,$5,
           $6,$7,
           $8,$9,
           $10,
           $11,$12,
           $13,$14,$15,
           $16,$17,$17,$18,
           $19,$20,$21,$22,
           $23,$24,$25,
           $26,0,0,
           NOW(),NOW())
        ON CONFLICT ("userId") DO UPDATE SET
          "memberCode"=$2,"status"=$3::\"MlmMemberStatus\",
          "currentLevel"=$4,"titleLevel"=$4,
          "conditionAchieved"=$5,"forceActive"=$6,"forceLevel"=$7,
          "contractDate"=$8,"firstPayDate"=$9,
          "autoshipEnabled"=$10,
          "companyName"=$11,"companyNameKana"=$12,
          "birthDate"=$13,"gender"=$14,"mobile"=$15,
          "prefecture"=$16,"city"=$17,"address1"=$17,"address2"=$18,
          "bankCode"=$19,"bankName"=$20,"branchCode"=$21,"branchName"=$22,
          "accountType"=$23,"accountNumber"=$24,"accountHolder"=$25,
          "note"=$26,"updatedAt"=NOW()
        RETURNING id
      `, [
        userId, memberCode, mlmStatus,
        currentLevel, conditionAchieved,
        forceActive, forceLevelRaw,
        contractDate, firstPayDate,
        autoshipEnabled,
        companyName, companyNameKana,
        birthDate, gender, mobile,
        prefecture, city, address2,
        bankCode, bankName, branchCode, branchName,
        accountType, accountNumber, accountHolder,
        note,
      ])

      const mlmId = mlmRes.rows[0].id

      // PointWallet 作成
      await client.query(`
        INSERT INTO "PointWallet"
          ("userId","autoPointsBalance","manualPointsBalance","externalPointsBalance",
           "availablePointsBalance","usedPointsBalance","expiredPointsBalance",
           "createdAt","updatedAt")
        VALUES ($1,0,0,0,0,0,0,NOW(),NOW())
        ON CONFLICT ("userId") DO NOTHING
      `, [userId])

      await client.query('COMMIT')

      codeToIds[memberCode] = { mlmId, userId }
      created++

      if (created % 100 === 0) {
        console.log(`  作成済み: ${created}件...`)
      }

    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`  ERROR [${memberCode}] ${row['名前']?.trim()}: ${err.message}`)
      failed++
    } finally {
      client.release()
    }
  }

  console.log(`フェーズ1完了: 作成 ${created}件 / エラー ${failed}件`)

  // ─── フェーズ2: 紹介者・直上者の紐づけ ──────────────
  console.log('\n--- フェーズ2: 組織構造（紹介者・直上者）の紐づけ ---')

  let orgLinked = 0
  let orgFailed = 0

  for (const row of records) {
    const memberCode = row['会員ID']?.trim()
    const myIds = codeToIds[memberCode]
    if (!myIds) continue

    const referrerCode = row['紹介者ID']?.trim()
    const uplineCode = row['直上者ID']?.trim()

    const referrerIds = referrerCode ? codeToIds[referrerCode] : null
    const uplineIds = uplineCode ? codeToIds[uplineCode] : null

    if (!referrerIds && !uplineIds) continue

    try {
      const sets = []
      const vals = []
      let idx = 1

      if (referrerIds) {
        sets.push(`"referrerId"=$${idx++}`)
        vals.push(referrerIds.mlmId)
      }
      if (uplineIds) {
        sets.push(`"uplineId"=$${idx++}`)
        vals.push(uplineIds.mlmId)
      }

      vals.push(myIds.mlmId)
      await pool.query(
        `UPDATE mlm_members SET ${sets.join(',')},"updatedAt"=NOW() WHERE id=$${idx}`,
        vals
      )
      orgLinked++
    } catch (err) {
      console.error(`  ORG ERROR [${memberCode}]: ${err.message}`)
      orgFailed++
    }
  }

  console.log(`フェーズ2完了: 紐づけ ${orgLinked}件 / エラー ${orgFailed}件`)

  // ─── 最終集計 ─────────────────────────────────────────
  const total  = await pool.query('SELECT COUNT(*) FROM mlm_members')
  const active = await pool.query("SELECT COUNT(*) FROM mlm_members WHERE status='active'")
  const auto   = await pool.query("SELECT COUNT(*) FROM mlm_members WHERE status='autoship'")
  const wthdrn = await pool.query("SELECT COUNT(*) FROM mlm_members WHERE status='withdrawn'")
  const mid    = await pool.query("SELECT COUNT(*) FROM mlm_members WHERE status='midCancel'")
  const withRef = await pool.query('SELECT COUNT(*) FROM mlm_members WHERE "referrerId" IS NOT NULL')
  const withUp  = await pool.query('SELECT COUNT(*) FROM mlm_members WHERE "uplineId" IS NOT NULL')

  console.log('\n=== インポート完了 ===')
  console.log(`総会員数:       ${total.rows[0].count}名`)
  console.log(`  活動中:       ${active.rows[0].count}名`)
  console.log(`  オートシップ: ${auto.rows[0].count}名`)
  console.log(`  退会:         ${wthdrn.rows[0].count}名`)
  console.log(`  クーリングオフ:${mid.rows[0].count}名`)
  console.log(`組織構造:`)
  console.log(`  紹介者あり:   ${withRef.rows[0].count}名`)
  console.log(`  直上者あり:   ${withUp.rows[0].count}名`)

  await pool.end()
}

main().catch(err => {
  console.error('FATAL:', err)
  pool.end()
  process.exit(1)
})
