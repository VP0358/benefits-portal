/**
 * POST /api/cron/monthly-lapse
 *
 * Vercel Cron により毎月1日 00:00 UTC（= 毎月1日 09:00 JST）に自動実行。
 * ────────────────────────────────────────────────────────────────
 * 処理①: 失効バッチ
 *   スミサイ対象商品（1000 / 1002 / 2000）の最終購入月から
 *   7か月目に突入した会員（= 6か月間購入なし）のステータスを
 *   active / autoship → lapsed に自動変更する。
 *
 * 処理②: 来月失効予定通知
 *   最終購入月から 6か月目（来月失効）の会員一覧を
 *   全管理者へメールで通知する。
 * ────────────────────────────────────────────────────────────────
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

// ── 対象商品コード（スミサイ関連のみ） ──────────────────────────
const SUMISAI_CODES = ["1000", "1002", "2000"];

// ── Resend（メール送信） ─────────────────────────────────────────
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}
const FROM_ADDRESS = process.env.MAIL_FROM ?? "noreply@viola-pure.net";

// ── 認証ヘルパー ──────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron は Authorization: Bearer <CRON_SECRET> を付与する
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // 開発環境（secretなし）は通過
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${cronSecret}`;
}

// ── YYYY-MM ヘルパー ──────────────────────────────────────────────
function toYM(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** YYYY-MM に monthDelta 月を加算した YYYY-MM を返す */
function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toYM(d);
}

// ── メイン処理 ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  return handler(req);
}
export async function POST(req: NextRequest) {
  return handler(req);
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 実行時点の JST 月（毎月1日に動くので、これが「今月」）
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const currentYM = toYM(nowJST); // 例: "2026-06"

  console.log(`[monthly-lapse] 開始 currentMonth=${currentYM}`);

  // ──────────────────────────────────────────────────────────────
  // 1. active / autoship の会員を全件取得
  // ──────────────────────────────────────────────────────────────
  const members = await prisma.mlmMember.findMany({
    where: { status: { in: ["active", "autoship"] } },
    select: {
      id: true,
      memberCode: true,
      contractDate: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (members.length === 0) {
    console.log("[monthly-lapse] 対象会員なし");
    return NextResponse.json({ lapsed: [], warned: [] });
  }

  const memberIds = members.map((m: { id: bigint }) => m.id);

  // ──────────────────────────────────────────────────────────────
  // 2. 各会員の「スミサイ最終購入月」を一括取得
  //    purchaseMonth の最大値 = 最終購入月
  // ──────────────────────────────────────────────────────────────
  const latestPurchases = await prisma.mlmPurchase.groupBy({
    by: ["mlmMemberId"],
    where: {
      mlmMemberId: { in: memberIds },
      productCode: { in: SUMISAI_CODES },
    },
    _max: { purchaseMonth: true },
  });

  // memberId → 最終購入月 のマップ
  const lastPurchaseMap = new Map<string, string>();
  for (const row of latestPurchases) {
    if (row._max.purchaseMonth) {
      lastPurchaseMap.set(row.mlmMemberId.toString(), row._max.purchaseMonth);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 3. 失効判定・来月失効予定判定
  //
  //   lastMonth = 最終購入月
  //   7か月目 = lastMonth + 7 <= currentYM → 失効（lapsed）
  //   6か月目 = lastMonth + 6 == currentYM → 来月失効予定（warn）
  //
  //   ※ 一度も購入がない場合は contractDate を起点に判定
  // ──────────────────────────────────────────────────────────────
  const toLapse:  { id: bigint; memberCode: string; name: string; email: string; lastMonth: string }[] = [];
  const toWarn:   { memberCode: string; name: string; email: string; lastMonth: string }[] = [];

  for (const m of members) {
    const mid = m.id.toString();
    let lastMonth = lastPurchaseMap.get(mid);

    // 一度も購入なし → contractDate の月を起点にする
    if (!lastMonth) {
      if (!m.contractDate) continue; // contractDate もなければスキップ
      lastMonth = toYM(m.contractDate);
    }

    // 7か月後 <= currentYM → 失効（7か月目に突入）
    const lapseYM = addMonths(lastMonth, 7);
    if (lapseYM <= currentYM) {
      toLapse.push({
        id: m.id,
        memberCode: m.memberCode,
        name: m.user.name,
        email: m.user.email,
        lastMonth,
      });
      continue;
    }

    // 6か月後 == currentYM → 来月失効予定
    const warnYM = addMonths(lastMonth, 6);
    if (warnYM === currentYM) {
      toWarn.push({
        memberCode: m.memberCode,
        name: m.user.name,
        email: m.user.email,
        lastMonth,
      });
    }
  }

  console.log(`[monthly-lapse] 失効対象: ${toLapse.length}件 / 来月失効予定: ${toWarn.length}件`);

  // ──────────────────────────────────────────────────────────────
  // 4. 失効処理: status → lapsed、autoshipEnabled → false
  // ──────────────────────────────────────────────────────────────
  let lapsedCount = 0;
  if (toLapse.length > 0) {
    const result = await prisma.mlmMember.updateMany({
      where: {
        id: { in: toLapse.map((m) => m.id) },
        status: { in: ["active", "autoship"] }, // 念のため二重チェック
      },
      data: {
        status: "lapsed",
        autoshipEnabled: false,
      },
    });
    lapsedCount = result.count;

    // 監査ログ
    await prisma.adminAuditLog.createMany({
      data: toLapse.map((m) => ({
        adminId: null, // システム自動実行
        actionType: "auto_lapse",
        targetTable: "MlmMember",
        targetId: m.id.toString(),
        beforeJson: { status: "active_or_autoship" },
        afterJson:  { status: "lapsed", reason: `最終購入月 ${m.lastMonth} から7か月経過` },
      })),
      skipDuplicates: true,
    });

    console.log(`[monthly-lapse] ${lapsedCount}件を lapsed に更新`);
  }

  // ──────────────────────────────────────────────────────────────
  // 5. 管理者への通知メール送信
  //    ・失効した会員一覧
  //    ・来月失効予定の会員一覧
  // ──────────────────────────────────────────────────────────────
  if (toLapse.length > 0 || toWarn.length > 0) {
    await sendAdminNotification({
      currentYM,
      lapsedMembers: toLapse,
      warnMembers: toWarn,
    });
  }

  return NextResponse.json({
    ok: true,
    currentMonth: currentYM,
    lapsed: toLapse.map((m) => ({ memberCode: m.memberCode, name: m.name, lastMonth: m.lastMonth })),
    warned: toWarn.map((m) => ({ memberCode: m.memberCode, name: m.name, lastMonth: m.lastMonth })),
    lapsedCount,
    warnCount: toWarn.length,
  });
}

// ── 管理者通知メール ──────────────────────────────────────────────
async function sendAdminNotification({
  currentYM,
  lapsedMembers,
  warnMembers,
}: {
  currentYM: string;
  lapsedMembers: { memberCode: string; name: string; email: string; lastMonth: string }[];
  warnMembers:   { memberCode: string; name: string; email: string; lastMonth: string }[];
}) {
  // 全管理者のメールアドレスを取得
  const admins = await prisma.admin.findMany({
    select: { email: true, name: true },
  });
  if (admins.length === 0) return;

  const [y, m] = currentYM.split("-");
  const monthLabel = `${y}年${Number(m)}月`;
  const nextMonthLabel = (() => {
    const d = new Date(Number(y), Number(m) - 1 + 1, 1);
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  })();

  // ── HTMLメール本文 ──
  const lapsedRows = lapsedMembers.length > 0
    ? lapsedMembers.map(m =>
        `<tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${m.memberCode}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${m.name}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${m.lastMonth}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#dc2626;font-weight:bold;">失効済み</td>
        </tr>`
      ).join("")
    : `<tr><td colspan="4" style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;color:#6b7280;">対象者なし</td></tr>`;

  const warnRows = warnMembers.length > 0
    ? warnMembers.map(m =>
        `<tr>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${m.memberCode}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${m.name}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;">${m.lastMonth}</td>
          <td style="padding:6px 12px;border:1px solid #e5e7eb;color:#d97706;font-weight:bold;">${nextMonthLabel}に失効予定</td>
        </tr>`
      ).join("")
    : `<tr><td colspan="4" style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;color:#6b7280;">対象者なし</td></tr>`;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>会員資格 失効通知</title></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:700px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

    <!-- ヘッダー -->
    <div style="background:#1e3a5f;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">【VIOLA Pure】会員資格 月次失効レポート</h1>
      <p style="color:#93c5fd;margin:6px 0 0;font-size:14px;">${monthLabel}度 自動処理結果</p>
    </div>

    <div style="padding:28px 32px;">

      <!-- 失効処理済み -->
      <h2 style="font-size:16px;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin-top:0;">
        ✖ 今月 失効処理した会員（${lapsedMembers.length}件）
      </h2>
      <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
        最終購入月から7か月が経過し、ステータスを <strong>「失効」</strong> に自動変更しました。
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <thead>
          <tr style="background:#fee2e2;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">会員コード</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">氏名</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">最終購入月</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">処理結果</th>
          </tr>
        </thead>
        <tbody>${lapsedRows}</tbody>
      </table>

      <!-- 来月失効予定 -->
      <h2 style="font-size:16px;color:#d97706;border-left:4px solid #f59e0b;padding-left:10px;">
        ⚠ 来月（${nextMonthLabel}）失効予定の会員（${warnMembers.length}件）
      </h2>
      <p style="font-size:13px;color:#6b7280;margin-bottom:12px;">
        最終購入月から6か月が経過した会員です。来月1日に自動で失効となります。<br>
        必要に応じてフォローアップをご検討ください。
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:28px;">
        <thead>
          <tr style="background:#fef3c7;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">会員コード</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">氏名</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">最終購入月</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">状態</th>
          </tr>
        </thead>
        <tbody>${warnRows}</tbody>
      </table>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:14px 18px;font-size:13px;color:#0369a1;">
        <strong>ℹ 自動処理について</strong><br>
        このメールは毎月1日 00:00（JST）に自動送信されます。<br>
        詳細は管理画面の「会員管理」からご確認ください。
      </div>
    </div>

    <!-- フッター -->
    <div style="background:#f3f4f6;padding:16px 32px;font-size:12px;color:#9ca3af;text-align:center;">
      CLAIRホールディングス株式会社 / VIOLA Pure 管理システム
    </div>
  </div>
</body>
</html>`;

  const textBody = [
    `【VIOLA Pure】会員資格 月次失効レポート（${monthLabel}度）`,
    "",
    `■ 今月 失効処理した会員（${lapsedMembers.length}件）`,
    ...lapsedMembers.map(m => `  ${m.memberCode} ${m.name}（最終購入: ${m.lastMonth}）→ 失効`),
    lapsedMembers.length === 0 ? "  対象者なし" : "",
    "",
    `■ 来月（${nextMonthLabel}）失効予定の会員（${warnMembers.length}件）`,
    ...warnMembers.map(m => `  ${m.memberCode} ${m.name}（最終購入: ${m.lastMonth}）`),
    warnMembers.length === 0 ? "  対象者なし" : "",
    "",
    "このメールは毎月1日 00:00（JST）に自動送信されます。",
    "CLAIRホールディングス株式会社 / VIOLA Pure 管理システム",
  ].join("\n");

  const resend = getResend();
  for (const admin of admins) {
    try {
      await resend.emails.send({
        from: `CLAIRホールディングス株式会社 <${FROM_ADDRESS}>`,
        to: admin.email,
        subject: `【VIOLA Pure】${monthLabel}度 会員失効レポート（失効${lapsedMembers.length}件・来月予定${warnMembers.length}件）`,
        html,
        text: textBody,
      });
      console.log(`[monthly-lapse] 通知メール送信: ${admin.email}`);
    } catch (err) {
      console.error(`[monthly-lapse] メール送信失敗: ${admin.email}`, err);
    }
  }
}
