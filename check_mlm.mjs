import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(sql, params=[]) {
  const res = await pool.query(sql, params);
  return res.rows;
}

function yen(n) { return `¥${Number(n||0).toLocaleString('ja-JP')}`; }
function pad(s, n) { return String(s??'').padEnd(n).slice(0,n); }
function padL(s, n) { return String(s??'').padStart(n).slice(-n); }

async function main() {
  // ─── ① 会員一覧・組織関係 ───────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('① MLM会員一覧・紹介者(ユニレベル)・直上者(マトリックス)関係');
  console.log('══════════════════════════════════════════════════════════');

  const members = await query(`
    SELECT 
      m.id, m."memberCode", m.status, m."currentLevel",
      m."contractDate", m."autoshipEnabled",
      m."referrerId", m."uplineId", m."forceActive",
      u.name AS "memberName",
      ru.name AS "referrerName",
      rm."memberCode" AS "referrerCode",
      uu.name AS "uplineName",
      um."memberCode" AS "uplineCode"
    FROM mlm_members m
    JOIN "User" u ON u.id = m."userId"
    LEFT JOIN mlm_members rm ON rm.id = m."referrerId"
    LEFT JOIN "User" ru ON ru.id = rm."userId"
    LEFT JOIN mlm_members um ON um.id = m."uplineId"
    LEFT JOIN "User" uu ON uu.id = um."userId"
    ORDER BY m.id
  `);
  
  console.log(`\n● 登録会員数: ${members.length}名\n`);
  console.log('ID  | 会員コード   | 氏名           | ステータス   | 紹介者(ユニレベル)        | 直上者(マトリックス)      | 契約日     | AS | LV | 強A');
  console.log('─'.repeat(140));
  for (const m of members) {
    const cd = m.contractDate ? new Date(m.contractDate).toLocaleDateString('ja-JP') : '      なし';
    const ref = m.referrerId ? `${m.referrerName}(${m.referrerCode})` : '【未設定】';
    const upl = m.uplineId   ? `${m.uplineName}(${m.uplineCode})`   : '【未設定】';
    console.log(`${padL(m.id,3)} | ${pad(m.memberCode,12)} | ${pad(m.memberName,14)} | ${pad(m.status,12)} | ${pad(ref,25)} | ${pad(upl,25)} | ${cd} | ${m.autoshipEnabled?'✓':'✗'} | ${m.currentLevel} | ${m.forceActive?'✓':'✗'}`);
  }

  // 問題チェック
  const noReferrer = members.filter(m => !m.referrerId);
  const noUpline   = members.filter(m => !m.uplineId);
  const noContract = members.filter(m => !m.contractDate);
  console.log('\n── 整合性チェック結果 ──');
  if (noReferrer.length === 0) {
    console.log('✅ 紹介者(referrerId): 全員設定済み');
  } else {
    console.log(`⚠️  紹介者なし: ${noReferrer.length}名`);
    noReferrer.forEach(m => console.log(`   → ${m.memberName}(${m.memberCode}) status=${m.status}`));
  }
  if (noUpline.length === 0) {
    console.log('✅ 直上者(uplineId): 全員設定済み');
  } else {
    console.log(`⚠️  直上者なし: ${noUpline.length}名`);
    noUpline.forEach(m => console.log(`   → ${m.memberName}(${m.memberCode}) status=${m.status}`));
  }
  if (noContract.length === 0) {
    console.log('✅ 契約日(contractDate): 全員設定済み');
  } else {
    console.log(`⚠️  契約日なし: ${noContract.length}名`);
    noContract.forEach(m => console.log(`   → ${m.memberName}(${m.memberCode}) status=${m.status}`));
  }

  // ─── ② ポイント残高確認 ──────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('② ポイント残高（管理・会員マイページ用データ確認）');
  console.log('══════════════════════════════════════════════════════════');

  const wallets = await query(`
    SELECT 
      u.name, u."memberCode",
      pw."autoPointsBalance", pw."manualPointsBalance", pw."externalPointsBalance", pw."availablePointsBalance",
      m."currentLevel", m.status, m."memberType", m."savingsPoints"
    FROM "PointWallet" pw
    JOIN "User" u ON u.id = pw."userId"
    JOIN mlm_members m ON m."userId" = pw."userId"
    ORDER BY u.id
  `);

  console.log(`\n● MLM会員ポイント: ${wallets.length}名\n`);
  console.log('氏名           | 会員コード   | 自動P  |  手動P | 外部P | 利用可P | SAV(mlm) | LV | ステータス');
  console.log('─'.repeat(115));
  for (const w of wallets) {
    console.log(`${pad(w.name,14)} | ${pad(w.memberCode,12)} | ${padL(w.autoPointsBalance||0,6)} | ${padL(w.manualPointsBalance||0,6)} | ${padL(w.externalPointsBalance||0,5)} | ${padL(w.availablePointsBalance||0,7)} | ${padL(w.savingsPoints||0,8)} | ${w.currentLevel} | ${w.status}`);
  }

  // ─── ③ ボーナス計算実行履歴 ──────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('③ ボーナス計算実行履歴（直近10件）');
  console.log('══════════════════════════════════════════════════════════\n');

  const bonusRuns = await query(`
    SELECT id, "bonusMonth", status, "totalMembers", "totalActiveMembers", "totalBonusAmount", "createdAt"
    FROM bonus_runs
    ORDER BY "bonusMonth" DESC
    LIMIT 10
  `);
  if (bonusRuns.length === 0) {
    console.log('  ※ ボーナス計算実行履歴なし（まだ一度も実行されていない）');
  } else {
    for (const r of bonusRuns) {
      const pubRes = await query(`SELECT COUNT(*) as cnt FROM bonus_results WHERE "bonusRunId"=$1 AND "isPublished"=true`,[r.id]);
      console.log(`  月: ${r.bonusMonth} | ${pad(r.status,10)} | 対象: ${r.totalMembers}名 | アクティブ: ${r.totalActiveMembers}名 | 合計: ${yen(r.totalBonusAmount)} | 公開: ${pubRes[0].cnt}件`);
    }
  }

  // ─── ④ ボーナス設定確認 ──────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('④ ボーナス設定（bonus_settings）');
  console.log('══════════════════════════════════════════════════════════\n');
  const settings = await query(`SELECT * FROM bonus_settings LIMIT 1`);
  if (settings.length > 0) {
    const s = settings[0];
    console.log(`  ダイレクトボーナス  : ${yen(s.directBonusAmount)} / 個`);
    console.log(`  組織構築ボーナス率  : LV3=${s.structureLv3Rate}% LV4=${s.structureLv4Rate}% LV5=${s.structureLv5Rate}%`);
    console.log(`  アクティブ判定基準  : ${s.activeThresholdPoints}PV`);
    console.log(`  事務手数料          : ${yen(s.serviceFeeAmount)}`);
    console.log(`  最低振込額          : ${yen(s.minPayoutAmount)}`);
    // ユニレベル率（LV別）
    console.log(`  ユニレベル率(LV1)   : ${[s.unilevelLv1Rate1, s.unilevelLv1Rate2, s.unilevelLv1Rate3].filter(Boolean).join('% / ')}%`);
    console.log(`  ユニレベル率(LV2)   : ${[s.unilevelLv2Rate1, s.unilevelLv2Rate2, s.unilevelLv2Rate3, s.unilevelLv2Rate4, s.unilevelLv2Rate5].filter(Boolean).join('% / ')}%`);
  } else {
    console.log('  ⚠️ ボーナス設定が存在しません！');
  }

  // ─── ⑤ 3月購入実績確認 ──────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('⑤ 2026-03 購入実績（mlm_purchases）');
  console.log('══════════════════════════════════════════════════════════\n');
  const purchases = await query(`
    SELECT 
      u.name, m."memberCode", p."productCode", p."productName",
      p.quantity, p.points, p."totalPoints", p."purchaseStatus", p."purchasedAt"
    FROM mlm_purchases p
    JOIN mlm_members m ON m.id = p."mlmMemberId"
    JOIN "User" u ON u.id = m."userId"
    WHERE p."purchaseMonth" = '2026-03'
       OR (p."purchasedAt" >= '2026-03-01' AND p."purchasedAt" < '2026-04-01')
    ORDER BY p."purchasedAt"
  `);
  if (purchases.length === 0) {
    console.log('  ※ 2026-03の購入記録なし');
  } else {
    console.log('  氏名         | 会員コード   | 商品コード | 数量 | PV  | 合計PV | ステータス');
    console.log('  ' + '─'.repeat(90));
    for (const p of purchases) {
      console.log(`  ${pad(p.name,12)} | ${pad(p.memberCode,12)} | ${pad(p.productCode,10)} | ${padL(p.quantity,4)} | ${padL(p.points,4)} | ${padL(p.totalPoints,6)} | ${p.purchaseStatus}`);
    }
    const totalPV = purchases.reduce((s,p) => s + Number(p.totalPoints), 0);
    console.log(`\n  合計購入PV: ${totalPV}`);
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('チェック完了');
  console.log('══════════════════════════════════════════════════════════\n');

  await pool.end();
}

main().catch(async e => {
  console.error('ERROR:', e.message);
  await pool.end();
  process.exit(1);
});
