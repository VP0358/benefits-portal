// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0
// Vercel Route Handler の最大実行時間を300秒に設定
// ※ maxDuration は ServerActions だけでなく Route Handlers でも有効
// ※ 設定しないとVercelのデフォルト(10〜60秒)で強制終了されボーナス計算が途中で止まる
export const maxDuration = 300

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { executeBonusCalculationV1WithProgress } from "@/lib/bonus-calculation-engine-v1";

/**
 * GET /api/admin/bonus-run/stream?bonusMonth=2026-04&paymentAdjustmentRate=2
 *
 * SSE（Server-Sent Events）でボーナス計算の進捗をリアルタイム送信する。
 * Vercelのタイムアウト問題を回避し、計算中の進捗ステップをクライアントに配信。
 *
 * イベント形式:
 *   data: {"type":"progress","step":"会員データロード完了","done":false}\n\n
 *   data: {"type":"complete","result":{...}}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");
  const rateParam  = searchParams.get("paymentAdjustmentRate");

  if (!bonusMonth) {
    return new Response("bonusMonth required", { status: 400 });
  }

  // 既存チェック → 存在する場合は削除してから再計算（force recalculate）
  const existing = await prisma.bonusRun.findUnique({ where: { bonusMonth } });
  if (existing) {
    console.log(`🗑️ 既存ボーナス実行を削除してから再計算: ${bonusMonth} (id=${existing.id})`);
    // カスケード削除（BonusResultも自動削除）
    await prisma.bonusRun.delete({ where: { bonusMonth } });
    console.log(`✅ 削除完了: ${bonusMonth}`);
  }

  const rateDecimal =
    rateParam != null && Number(rateParam) > 0
      ? Number(rateParam) / 100
      : null;

  // SSEストリームを作成
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // クライアント切断時は無視
        }
      };

      // ハートビート：Vercelのアイドルタイムアウト対策（15秒ごとに送信）
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      try {
        const result = await executeBonusCalculationV1WithProgress(
          bonusMonth,
          rateDecimal,
          (step: string) => {
            send({ type: "progress", step, done: false });
          }
        );

        send({
          type: "complete",
          result: {
            bonusRunId: result.bonusRunId.toString(),
            totalMembers: result.totalMembers,
            totalActiveMembers: result.totalActiveMembers,
            totalBonusAmount: result.totalBonusAmount,
          },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const detail = err instanceof Error ? err.stack : undefined;
        console.error("SSE bonus calculation error:", err);
        send({ type: "error", message: msg, detail });
      } finally {
        clearInterval(heartbeatInterval);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Nginxバッファリング無効
    },
  });
}
