import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // ステータス分布
    console.log('=== ステータス別会員数 ===');
    const statusDist = await client.query(`
      SELECT status, COUNT(*) as cnt FROM mlm_members GROUP BY status ORDER BY cnt DESC
    `);
    statusDist.rows.forEach(r => console.log(`${r.status}: ${r.cnt}名`));

    // 3月購買状況
    console.log('\n=== 2026-03 購買状況 ===');
    const purchases = await client.query(`
      SELECT mp."purchaseMonth", mp."purchaseStatus", COUNT(*) as cnt, SUM(mp."totalPoints") as totalPts, SUM(mp."points") as sumPoints
      FROM mlm_purchases mp
      WHERE mp."purchaseMonth" = '2026-03'
      GROUP BY mp."purchaseMonth", mp."purchaseStatus"
    `);
    purchases.rows.forEach(r => console.log(`ステータス:${r.purchaseStatus} | 件数:${r.cnt} | totalPoints合計:${r.totalPts} | points合計:${r.sumPoints}`));

    // 購買がある会員のスナップショット（上位10件）
    console.log('\n=== 2026-03 購買サンプル（上位10件）===');
    const purchaseSample = await client.query(`
      SELECT mp."mlmMemberId", m."memberCode", u.name, mp."productCode", mp."productName", mp."points", mp."totalPoints", mp."purchaseStatus"
      FROM mlm_purchases mp
      JOIN mlm_members m ON m.id = mp."mlmMemberId"
      JOIN "User" u ON u.id = m."userId"
      WHERE mp."purchaseMonth" = '2026-03'
      ORDER BY mp.id
      LIMIT 10
    `);
    purchaseSample.rows.forEach(r => 
      console.log(`${r.memberCode} | ${r.name} | ${r.productCode} | ${r.productName} | PV:${r.points} | 合計PV:${r.totalPoints} | ${r.purchaseStatus}`)
    );

    // ボーナスラン詳細
    console.log('\n=== BonusRun 詳細 ===');
    const bonusRuns = await client.query(`
      SELECT id, "bonusMonth", status, "totalMembers", "totalActiveMembers", "totalBonusAmount", "paymentAdjustmentRate", "confirmedAt", "createdAt"
      FROM bonus_runs ORDER BY id DESC LIMIT 5
    `);
    bonusRuns.rows.forEach(r => 
      console.log(`ID:${r.id} | ${r.bonusMonth} | ${r.status} | 総:${r.totalMembers} | アクティブ:${r.totalActiveMembers} | 総報酬:¥${r.totalBonusAmount} | 確定:${r.confirmedAt || '未確定'}`)
    );

    // BonusResult（報酬明細）サンプル
    console.log('\n=== BonusResult サンプル（最新ラン上位15件）===');
    const bonusResults = await client.query(`
      SELECT br.id, br."bonusRunId", m."memberCode", u.name, br."finalAmount", br."conditions", br."groupActiveCount", br."forcedLevel"
      FROM bonus_results br
      JOIN mlm_members m ON m.id = br."mlmMemberId"
      JOIN "User" u ON u.id = m."userId"
      WHERE br."bonusRunId" = (SELECT id FROM bonus_runs ORDER BY id DESC LIMIT 1)
      ORDER BY br."finalAmount" DESC
      LIMIT 15
    `);
    console.log('会員コード | 氏名 | 報酬額 | conditions | グループアクティブ | forcedLV');
    bonusResults.rows.forEach(r => 
      console.log(`${r.memberCode} | ${u_name(r)} | ¥${r.finalAmount} | ${r.conditions} | ${r.groupActiveCount} | forceLV:${r.forcedLevel}`)
    );

    function u_name(r) { return r.name; }

    // ポイントウォレットが0以外の会員を確認
    console.log('\n=== ポイント残高ある会員 ===');
    const wallets = await client.query(`
      SELECT u.name, u."memberCode", pw."autoPointsBalance", pw."manualPointsBalance", pw."availablePointsBalance"
      FROM "PointWallet" pw
      JOIN "User" u ON u.id = pw."userId"
      WHERE pw."availablePointsBalance" > 0 OR pw."autoPointsBalance" > 0
      ORDER BY pw."availablePointsBalance" DESC
    `);
    console.log(`残高あり: ${wallets.rows.length}名`);
    wallets.rows.slice(0, 10).forEach(r => 
      console.log(`${r.name} | ${r.memberCode} | 自動P:${r.autoPointsBalance} | 手動P:${r.manualPointsBalance} | 利用可:${r.availablePointsBalance}`)
    );

  } finally {
    client.release();
  }
}
main().catch(console.error).finally(() => pool.end());
