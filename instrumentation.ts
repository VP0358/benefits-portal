/**
 * Next.js Instrumentation Hook
 * サーバー起動時に自動でDBマイグレーションを実行する
 * ref: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Node.js ランタイムでのみ実行（Edge ランタイムでは Prisma が動かない）
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { runStartupMigrations } = await import("./lib/startup-migrate");
      await runStartupMigrations();
    } catch (e) {
      // マイグレーション失敗はアプリ起動を止めない（ログのみ）
      console.error("[startup-migrate] マイグレーション実行エラー:", e);
    }
  }
}
