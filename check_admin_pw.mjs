import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT id, email, "passwordHash", role FROM "Admin" WHERE email = 'info@c-p.link'`);
    if (result.rows.length === 0) {
      console.log('❌ info@c-p.link がAdminテーブルに存在しない');
      return;
    }
    const admin = result.rows[0];
    console.log(`Admin発見: ${admin.email} | role: ${admin.role}`);
    console.log(`hash: ${admin.passwordHash}`);
    
    // パスワード照合テスト
    const testPassword = 'clair0909';
    const match = await bcrypt.compare(testPassword, admin.passwordHash);
    console.log(`\nパスワード "clair0909" 照合結果: ${match ? '✅ 一致' : '❌ 不一致'}`);
    
    if (!match) {
      // ハッシュを新規作成してUPDATE
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log(`\n新ハッシュ生成: ${newHash}`);
      await client.query(`UPDATE "Admin" SET "passwordHash" = $1 WHERE email = 'info@c-p.link'`, [newHash]);
      console.log('✅ パスワードを "clair0909" でリセットしました');
      
      // 確認
      const verify = await bcrypt.compare(testPassword, newHash);
      console.log(`再照合: ${verify ? '✅ OK' : '❌ NG'}`);
    }
  } finally {
    client.release();
  }
}
main().catch(console.error).finally(() => pool.end());
