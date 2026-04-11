import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // ① 全MLM会員と紹介者・直上者の関係
    console.log('\n=== ① MLM会員一覧・紹介者(ユニレベル)・直上者(マトリックス)関係 ===\n');
    
    const membersResult = await client.query(`
      SELECT 
        m.id,
        m."memberCode",
        m.status,
        u.name AS "memberName",
        m."referrerId",
        ref_u.name AS "referrerName",
        ref_m."memberCode" AS "referrerMemberCode",
        m."uplineId",
        up_u.name AS "uplineName",
        up_m."memberCode" AS "uplineMemberCode",
        m."matrixPosition",
        m."currentLevel"
      FROM mlm_members m
      JOIN "User" u ON u.id = m."userId"
      LEFT JOIN mlm_members ref_m ON ref_m.id = m."referrerId"
      LEFT JOIN "User" ref_u ON ref_u.id = ref_m."userId"
      LEFT JOIN mlm_members up_m ON up_m.id = m."uplineId"
      LEFT JOIN "User" up_u ON up_u.id = up_m."userId"
      ORDER BY m.id
    `);
    
    console.log(`総会員数: ${membersResult.rows.length}`);
    console.log('\n会員コード | 氏名 | ステータス | 紹介者コード | 紹介者名 | 直上者コード | 直上者名 | 行列位置 | 現在LV');
    console.log('-'.repeat(120));
    
    for (const row of membersResult.rows) {
      console.log(
        `${row.memberCode} | ${row.memberName} | ${row.status} | ` +
        `${row.referrerMemberCode || 'なし'} | ${row.referrerName || 'なし'} | ` +
        `${row.uplineMemberCode || 'なし'} | ${row.uplineName || 'なし'} | ` +
        `pos:${row.matrixPosition} | LV:${row.currentLevel}`
      );
    }
    
    // 孤立チェック（紹介者あるが実際に存在しないケース）
    const orphanRef = await client.query(`
      SELECT m."memberCode", m."referrerId"
      FROM mlm_members m
      WHERE m."referrerId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM mlm_members r WHERE r.id = m."referrerId")
    `);
    console.log(orphanRef.rows.length > 0 ? '\n⚠️ 紹介者が存在しない会員:' + JSON.stringify(orphanRef.rows) : '\n✅ 紹介者の整合性: 全OK');
    
    const orphanUp = await client.query(`
      SELECT m."memberCode", m."uplineId"
      FROM mlm_members m
      WHERE m."uplineId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM mlm_members u WHERE u.id = m."uplineId")
    `);
    console.log(orphanUp.rows.length > 0 ? '⚠️ 直上者が存在しない会員:' + JSON.stringify(orphanUp.rows) : '✅ 直上者の整合性: 全OK');

    // PointWallet確認
    console.log('\n=== ポイントウォレット確認 ===\n');
    const walletResult = await client.query(`
      SELECT u.name, u."memberCode", pw."autoPointsBalance", pw."manualPointsBalance", pw."availablePointsBalance"
      FROM "PointWallet" pw
      JOIN "User" u ON u.id = pw."userId"
      ORDER BY u.id
      LIMIT 20
    `);
    console.log('氏名 | 会員コード | 自動P | 手動P | 利用可能P');
    walletResult.rows.forEach(r => 
      console.log(`${r.name} | ${r.memberCode} | ${r.autoPointsBalance} | ${r.manualPointsBalance} | ${r.availablePointsBalance}`)
    );

    // 購買(mlm_purchases)確認
    console.log('\n=== mlm_purchases (購買履歴) ===\n');
    const purchaseResult = await client.query(`
      SELECT mp."purchaseMonth", COUNT(*) as cnt, SUM(mp."totalPoints") as totalPts
      FROM mlm_purchases mp
      GROUP BY mp."purchaseMonth"
      ORDER BY mp."purchaseMonth" DESC
      LIMIT 10
    `);
    console.log('購買月 | 件数 | 合計PV');
    purchaseResult.rows.forEach(r => console.log(`${r.purchaseMonth} | ${r.cnt} | ${r.totalPts}`));

    // ボーナスラン確認
    console.log('\n=== BonusRun (報酬計算ラン) ===\n');
    const bonusRunResult = await client.query(`
      SELECT id, "bonusMonth", status, "totalMembers", "totalActiveMembers", "totalBonusAmount", "createdAt"
      FROM bonus_runs
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);
    console.log('ID | 月 | ステータス | 総会員 | アクティブ | 総報酬額 | 作成日時');
    bonusRunResult.rows.forEach(r => 
      console.log(`${r.id} | ${r.bonusMonth} | ${r.status} | ${r.totalMembers} | ${r.totalActiveMembers} | ${r.totalBonusAmount} | ${r.createdAt}`)
    );

  } finally {
    client.release();
  }
}

main().catch(console.error).finally(() => pool.end());
