import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // 44504701の詳細確認
    const result = await client.query(`
      SELECT 
        u.id, u.name, u."memberCode", u.email, u.phone, u.status as userStatus,
        m.id as mlmId, m."memberCode" as mlmCode, m.status, m."companyName", m."companyNameKana",
        m."memberType", m.gender, m.mobile, m."birthDate",
        m."referrerId", ref_m."memberCode" as refCode, ref_u.name as refName,
        m."uplineId", up_m."memberCode" as upCode, up_u.name as upName,
        r."mlmRegistration" as hasRegistration
      FROM "User" u
      JOIN mlm_members m ON m."userId" = u.id
      LEFT JOIN mlm_members ref_m ON ref_m.id = m."referrerId"
      LEFT JOIN "User" ref_u ON ref_u.id = ref_m."userId"
      LEFT JOIN mlm_members up_m ON up_m.id = m."uplineId"
      LEFT JOIN "User" up_u ON up_u.id = up_m."userId"
      LEFT JOIN mlm_registrations r ON r."userId" = u.id
      WHERE m."memberCode" = '44504701'
    `);

    if (result.rows.length === 0) {
      console.log('会員が見つかりません');
      return;
    }

    const row = result.rows[0];
    console.log('=== 44504701 会員詳細 ===');
    console.log(`User.name: ${row.name}`);
    console.log(`memberCode: ${row.memberCode}`);
    console.log(`email: ${row.email}`);
    console.log(`phone: ${row.phone}`);
    console.log(`userStatus: ${row.userStatus}`);
    console.log(`mlm.status: ${row.status}`);
    console.log(`mlm.memberType: ${row.memberType}`);
    console.log(`companyName: ${row.companyName}`);
    console.log(`companyNameKana: ${row.companyNameKana}`);
    console.log(`gender: ${row.gender}`);
    console.log(`mobile: ${row.mobile}`);
    console.log(`birthDate: ${row.birthDate}`);
    console.log(`referrer: ${row.refCode} / ${row.refName}`);
    console.log(`upline: ${row.upCode} / ${row.upName}`);
    console.log(`MlmRegistration: ${row.hasRegistration}`);

    // ボーナス報酬も確認
    const bonus = await client.query(`
      SELECT br."finalAmount", br."groupActiveCount", br."forcedLevel", br.conditions, run."bonusMonth"
      FROM bonus_results br
      JOIN bonus_runs run ON run.id = br."bonusRunId"
      JOIN mlm_members m ON m.id = br."mlmMemberId"
      WHERE m."memberCode" = '44504701'
      ORDER BY run."bonusMonth" DESC
      LIMIT 5
    `);
    console.log('\n=== ボーナス履歴 ===');
    bonus.rows.forEach(r => console.log(`月:${r.bonusMonth} | 報酬:¥${r.finalAmount} | グループアクティブ:${r.groupActiveCount} | forceLV:${r.forcedLevel} | cond:${r.conditions}`));

    // MlmRegistration詳細
    const reg = await client.query(`
      SELECT * FROM mlm_registrations WHERE "userId" = ${row.id}
    `);
    if (reg.rows.length > 0) {
      console.log('\n=== MlmRegistration詳細 ===');
      const r2 = reg.rows[0];
      console.log(JSON.stringify(r2, null, 2));
    } else {
      console.log('\nMlmRegistration: レコードなし');
    }

  } finally {
    client.release();
  }
}
main().catch(console.error).finally(() => pool.end());
