import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const client = await pool.connect();
  try {
    const admins = await client.query(`SELECT id, email, role, "passwordHash", "createdAt" FROM "Admin" ORDER BY id`);
    console.log('=== Adminテーブル ===');
    console.log(`件数: ${admins.rows.length}`);
    admins.rows.forEach(r => console.log(`ID:${r.id} | ${r.email} | role:${r.role} | hash:${r.passwordHash?.substring(0,30)}... | ${r.createdAt}`));
    
    const userCheck = await client.query(`SELECT id, email, "passwordHash", status FROM "User" WHERE email = 'info@c-p.link'`);
    console.log('\n=== User(info@c-p.link) ===');
    if (userCheck.rows.length > 0) {
      const r = userCheck.rows[0];
      console.log(`存在: ${r.email} | status:${r.status} | hash:${r.passwordHash?.substring(0,30)}...`);
    } else {
      console.log('なし');
    }
  } finally { client.release(); }
}
main().catch(console.error).finally(() => pool.end());
