import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Vercelサーバーレス環境向け接続プール設定
    // サーバーレス関数は同時多数起動するため接続数を制限する
    max: 5,                // 最大接続数（デフォルト10は多すぎる）
    idleTimeoutMillis: 30000,  // アイドル接続を30秒で破棄
    connectionTimeoutMillis: 10000, // 接続タイムアウト10秒
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
