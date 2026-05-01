/**
 * 紹介者・直上者の紐づけ修正スクリプト
 * 2026-5-1-16-26-9member_syoukai.csv を正とし、
 * DBの referrerId / uplineId を全件上書き修正する
 *
 * 実行: node scripts/fix-referrer-upline.mjs
 */

import pg from 'pg'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  console.log('=== 紹介者・直上者 紐づけ修正開始 ===')
  console.log('日時:', new Date().toLocaleString('ja-JP'))

  // ── CSVを読み込む ─────────────────────────────────────
  const csvPath = '/home/user/uploaded_files/2026-5-1-16-26-9member_syoukai.csv'
  const buffer = fs.readFileSync(csvPath)
  const content = iconv.decode(buffer, 'cp932')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  })

  console.log(`CSV読み込み件数: ${records.length}件`)

  // CSV: memberCode -> { referrerCode, uplineCode }
  const csvMap = {}
  for (const row of records) {
    csvMap[row['会員ID']] = {
      referrerCode: row['紹介者ID'] || null,
      uplineCode:   row['直上者ID'] || null,
      name:         row['名前'],
    }
  }

  // ── DB全会員の memberCode -> id マップを取得 ──────────
  const allMembers = await pool.query(`
    SELECT id, "memberCode" FROM mlm_members
  `)
  const codeToId = {}
  for (const row of allMembers.rows) {
    codeToId[row.memberCode] = row.id
  }
  console.log(`DB会員数: ${allMembers.rows.length}件`)

  // ── 現在のDB紐づけを取得して差分チェック ─────────────
  const currentLinks = await pool.query(`
    SELECT m.id, m."memberCode",
           r."memberCode" AS ref_code,
           u."memberCode" AS up_code
    FROM mlm_members m
    LEFT JOIN mlm_members r ON r.id = m."referrerId"
    LEFT JOIN mlm_members u ON u.id = m."uplineId"
  `)
  const dbMap = {}
  for (const row of currentLinks.rows) {
    dbMap[row.memberCode] = {
      id:      row.id,
      refCode: row.ref_code || null,
      upCode:  row.up_code || null,
    }
  }

  // ── 差分を集計 ────────────────────────────────────────
  let diffCount = 0
  const diffs = []
  for (const [code, csv] of Object.entries(csvMap)) {
    const db = dbMap[code]
    if (!db) {
      console.warn(`  SKIP（DBに存在しない）: ${code}`)
      continue
    }
    const refChanged = (csv.referrerCode || null) !== (db.refCode || null)
    const upChanged  = (csv.uplineCode   || null) !== (db.upCode  || null)
    if (refChanged || upChanged) {
      diffs.push({ code, db, csv, refChanged, upChanged })
      diffCount++
    }
  }

  console.log(`\n差分件数: ${diffCount}件`)
  if (diffCount > 0) {
    console.log('差分サンプル（最大20件）:')
    for (const d of diffs.slice(0, 20)) {
      if (d.refChanged) {
        console.log(`  [${d.code}] 紹介者: ${d.db.refCode ?? 'null'} → ${d.csv.referrerCode ?? 'null'}`)
      }
      if (d.upChanged) {
        console.log(`  [${d.code}] 直上者: ${d.db.upCode ?? 'null'} → ${d.csv.uplineCode ?? 'null'}`)
      }
    }
  }

  // ── 全件を CSV の値で上書き更新 ───────────────────────
  console.log('\n--- 全件の紹介者・直上者を修正中 ---')

  let updated = 0
  let cleared = 0
  let skipped = 0
  let failed  = 0

  for (const [code, csv] of Object.entries(csvMap)) {
    const myId = codeToId[code]
    if (!myId) {
      skipped++
      continue
    }

    // 紹介者ID・直上者IDをCSVのmemberCodeからDBのidに変換
    const newReferrerId = csv.referrerCode ? (codeToId[csv.referrerCode] ?? null) : null
    const newUplineId   = csv.uplineCode   ? (codeToId[csv.uplineCode]   ?? null) : null

    // 見つからないコードの警告
    if (csv.referrerCode && !codeToId[csv.referrerCode]) {
      console.warn(`  WARN: 紹介者 ${csv.referrerCode} がDBに存在しません（${code} ${csv.name}）`)
    }
    if (csv.uplineCode && !codeToId[csv.uplineCode]) {
      console.warn(`  WARN: 直上者 ${csv.uplineCode} がDBに存在しません（${code} ${csv.name}）`)
    }

    try {
      await pool.query(`
        UPDATE mlm_members
        SET "referrerId" = $1,
            "uplineId"   = $2,
            "updatedAt"  = NOW()
        WHERE id = $3
      `, [newReferrerId, newUplineId, myId])

      if (newReferrerId === null && newUplineId === null) cleared++
      else updated++

    } catch (err) {
      console.error(`  ERROR [${code}]: ${err.message}`)
      failed++
    }
  }

  console.log(`\n更新完了: ${updated}件 / NULL設定: ${cleared}件 / スキップ: ${skipped}件 / エラー: ${failed}件`)

  // ── 最終検証 ──────────────────────────────────────────
  console.log('\n--- 修正後の検証 ---')

  let mismatch = 0
  for (const [code, csv] of Object.entries(csvMap)) {
    const db = dbMap[code]
    if (!db) continue

    const newRefCode = csv.referrerCode || null
    const newUpCode  = csv.uplineCode   || null

    // DB再取得して確認
    const check = await pool.query(`
      SELECT r."memberCode" AS ref_code, u."memberCode" AS up_code
      FROM mlm_members m
      LEFT JOIN mlm_members r ON r.id = m."referrerId"
      LEFT JOIN mlm_members u ON u.id = m."uplineId"
      WHERE m."memberCode" = $1
    `, [code])

    if (check.rows.length === 0) continue
    const row = check.rows[0]

    if ((row.ref_code || null) !== newRefCode || (row.up_code || null) !== newUpCode) {
      console.error(`  MISMATCH [${code}]: ref=${row.ref_code}≠${newRefCode}, up=${row.up_code}≠${newUpCode}`)
      mismatch++
    }
  }

  if (mismatch === 0) {
    console.log('✅ 全件の紐づけが正確に修正されました！')
  } else {
    console.error(`❌ ${mismatch}件の不一致が残っています`)
  }

  // ── 最終集計 ──────────────────────────────────────────
  const stats = await pool.query(`
    SELECT
      COUNT(*) AS total,
      COUNT("referrerId") AS has_referrer,
      COUNT("uplineId")   AS has_upline
    FROM mlm_members
  `)
  const s = stats.rows[0]
  console.log(`\n=== 最終集計 ===`)
  console.log(`総会員数:       ${s.total}名`)
  console.log(`紹介者あり:     ${s.has_referrer}名`)
  console.log(`直上者あり:     ${s.has_upline}名`)
  console.log(`紹介者なし:     ${Number(s.total) - Number(s.has_referrer)}名（ルートノード）`)

  await pool.end()
}

main().catch(err => {
  console.error('FATAL:', err)
  pool.end()
  process.exit(1)
})
