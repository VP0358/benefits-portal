import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        u.id, u.name, u."memberCode", u.email, u.phone, u.status as "userStatus",
        m.id as "mlmId", m."memberCode" as "mlmCode", m.status,
        m."companyName", m."companyNameKana",
        m."memberType", m.gender, m.mobile, m."birthDate",
        m."referrerId", ref_m."memberCode" as "refCode", ref_u.name as "refName",
        m."uplineId", up_m."memberCode" as "upCode", up_u.name as "upName"
      FROM "User" u
      JOIN mlm_members m ON m."userId" = u.id
      LEFT JOIN mlm_members ref_m ON ref_m.id = m."referrerId"
      LEFT JOIN "User" ref_u ON ref_u.id = ref_m."userId"
      LEFT JOIN mlm_members up_m ON up_m.id = m."uplineId"
      LEFT JOIN "User" up_u ON up_u.id = up_m."userId"
      WHERE m."memberCode" = '44504701'
    `);

    if (result.rows.length === 0) { console.log('not found'); return; }
    const row = result.rows[0];

    console.log('=== 44504701 会員詳細 ===');
    console.log(`User.name: "${row.name}"`);
    console.log(`memberCode: ${row.memberCode}`);
    console.log(`email: ${row.email}`);
    console.log(`phone: ${row.phone}`);
    console.log(`userStatus: ${row.userStatus}`);
    console.log(`mlm.status: ${row.status}`);
    console.log(`mlm.memberType: ${row.memberType}`);
    console.log(`companyName: "${row.companyName}"`);
    console.log(`companyNameKana: "${row.companyNameKana}"`);
    console.log(`gender: ${row.gender}`);
    console.log(`mobile: ${row.mobile}`);
    console.log(`birthDate: ${row.birthDate}`);
    console.log(`referrer: ${row.refCode} / ${row.refName}`);
    console.log(`upline: ${row.upCode} / ${row.upName}`);

    // MlmRegistration
    const reg = await client.query(`SELECT * FROM mlm_registrations WHERE "userId" = $1`, [row.id]);
    if (reg.rows.length > 0) {
      console.log('\n=== MlmRegistration ===');
      console.log(JSON.stringify(reg.rows[0], null, 2));
    } else {
      console.log('\nMlmRegistration: なし');
    }

    // ボーナス
    const bonus = await client.query(`
      SELECT run."bonusMonth", br."finalAmount", br."groupActiveCount"
      FROM bonus_results br
      JOIN bonus_runs run ON run.id = br."bonusRunId"
      WHERE br."mlmMemberId" = $1
      ORDER BY run."bonusMonth" DESC LIMIT 5
    `, [row.mlmId]);
    console.log('\n=== ボーナス履歴 ===');
    if (bonus.rows.length === 0) console.log('なし');
    bonus.rows.forEach(r => console.log(`月:${r.bonusMonth} | ¥${r.finalAmount} | グループアクティブ:${r.groupActiveCount}`));

    // 同じuser名の他会員も確認
    const others = await client.query(`
      SELECT m."memberCode", m.status, u.name, m."companyName"
      FROM mlm_members m JOIN "User" u ON u.id = m."userId"
      WHERE u.name = '未設定' OR u.name IS NULL OR u.name = ''
      ORDER BY m."memberCode"
    `);
    console.log(`\n=== name="未設定"の会員 ===`);
    console.log(`件数: ${others.rows.length}`);
    others.rows.slice(0, 5).forEach(r => console.log(`${r.memberCode} | ${r.status} | name:${r.name} | company:${r.companyName}`));

  } finally { client.release(); }
}
main().catch(console.error).finally(() => pool.end());
