import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_Rijek4FWvcT6@ep-super-tree-amnvg5fu-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function checkMLMRelations() {
  const client = await pool.connect();
  try {
    console.log('=== MLM会員関係値整合性チェック ===\n');

    // 総会員数
    const totalResult = await client.query(`SELECT COUNT(*) as cnt FROM "mlm_members"`);
    console.log(`総MLM会員数: ${totalResult.rows[0].cnt}名\n`);

    // 全会員情報取得
    const members = await client.query(`
      SELECT 
        m.id, m.member_code, m.status, m.upline_id, m.referrer_id,
        m.matrix_position, m.current_level,
        u.name, u.email
      FROM "mlm_members" m
      JOIN "users" u ON u.id = m.user_id
      ORDER BY m.id
    `);

    let errors = [];
    let warnings = [];
    let ok = 0;

    for (const member of members.rows) {
      let memberOk = true;

      // 紹介者チェック
      if (member.referrer_id) {
        const refCheck = await client.query(
          `SELECT id, member_code FROM "mlm_members" WHERE id = $1`,
          [member.referrer_id]
        );
        if (refCheck.rows.length === 0) {
          errors.push(`[ERROR] 会員${member.member_code}(id:${member.id}): 紹介者ID=${member.referrer_id} が存在しない`);
          memberOk = false;
        } else {
          // UniLevelReferralsテーブル確認
          const uniCheck = await client.query(
            `SELECT id FROM "uni_level_referrals" WHERE referred_id = $1 AND referrer_id = $2`,
            [member.id, member.referrer_id]
          );
          if (uniCheck.rows.length === 0) {
            warnings.push(`[WARN] 会員${member.member_code}: UniLevelReferrals記録なし (紹介者:${refCheck.rows[0].member_code})`);
          }
        }
      } else {
        warnings.push(`[WARN] 会員${member.member_code}(id:${member.id}): 紹介者未設定`);
      }

      // 直上者チェック
      if (member.upline_id) {
        const uplineCheck = await client.query(
          `SELECT id, member_code FROM "mlm_members" WHERE id = $1`,
          [member.upline_id]
        );
        if (uplineCheck.rows.length === 0) {
          errors.push(`[ERROR] 会員${member.member_code}(id:${member.id}): 直上者ID=${member.upline_id} が存在しない`);
          memberOk = false;
        } else {
          // MatrixDownlineテーブル確認
          const matrixCheck = await client.query(
            `SELECT id FROM "matrix_downlines" WHERE downline_id = $1 AND upline_id = $2`,
            [member.id, member.upline_id]
          );
          if (matrixCheck.rows.length === 0) {
            warnings.push(`[WARN] 会員${member.member_code}: MatrixDownlines記録なし (直上者:${uplineCheck.rows[0].member_code})`);
          }
        }
      } else {
        warnings.push(`[WARN] 会員${member.member_code}(id:${member.id}): 直上者未設定`);
      }

      if (memberOk) ok++;
    }

    console.log(`✅ 正常会員: ${ok}名`);
    console.log(`⚠️  警告: ${warnings.length}件`);
    console.log(`❌ エラー: ${errors.length}件\n`);

    if (errors.length > 0) {
      console.log('--- エラー詳細 ---');
      errors.forEach(e => console.log(e));
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('--- 警告詳細 ---');
      warnings.slice(0, 20).forEach(w => console.log(w));
      if (warnings.length > 20) console.log(`... 他${warnings.length - 20}件`);
      console.log('');
    }

    // UserReferralテーブルの確認
    console.log('=== UserReferral テーブル確認 ===');
    const urTotal = await client.query(`SELECT COUNT(*) as cnt FROM "user_referrals"`);
    console.log(`UserReferral総数: ${urTotal.rows[0].cnt}件`);

    // 孤立したUserReferral確認
    const orphanUR = await client.query(`
      SELECT COUNT(*) as cnt FROM "user_referrals" ur
      WHERE NOT EXISTS (SELECT 1 FROM "mlm_members" m WHERE m.user_id = ur.referred_id)
         OR NOT EXISTS (SELECT 1 FROM "mlm_members" m WHERE m.user_id = ur.referrer_id)
    `);
    console.log(`孤立UserReferral: ${orphanUR.rows[0].cnt}件\n`);

    return { errors: errors.length, warnings: warnings.length, ok };

  } finally {
    client.release();
    await pool.end();
  }
}

checkMLMRelations().catch(console.error);
