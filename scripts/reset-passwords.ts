/**
 * 管理者・テスト会員のパスワードを再設定するスクリプト
 * 使い方: npx ts-node --project tsconfig.json scripts/reset-passwords.ts
 * または: DATABASE_URL=... npx tsx scripts/reset-passwords.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminHash  = await hash("AdminPass123!", 10);
  const memberHash = await hash("MemberPass123!", 10);

  // 管理者パスワードリセット
  const admin = await prisma.admin.upsert({
    where:  { email: "admin@example.com" },
    update: { passwordHash: adminHash },
    create: {
      email:        "admin@example.com",
      name:         "管理者",
      passwordHash: adminHash,
      role:         "super_admin",
    },
  });
  console.log("✅ 管理者パスワードをリセット:", admin.email);

  // テスト会員パスワードリセット
  const member = await prisma.user.upsert({
    where:  { email: "member@example.com" },
    update: { passwordHash: memberHash, status: "active" },
    create: {
      memberCode:   "M0001",
      name:         "VIOLAさん",
      email:        "member@example.com",
      passwordHash: memberHash,
      status:       "active",
    },
  });
  console.log("✅ テスト会員パスワードをリセット:", member.email);

  console.log("\n📧 ログイン情報:");
  console.log("  管理者: admin@example.com / AdminPass123!");
  console.log("  会員:   member@example.com / MemberPass123!");
}

main()
  .catch(e => { console.error("❌ エラー:", e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
