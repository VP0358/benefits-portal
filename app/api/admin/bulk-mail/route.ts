import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import {
  sendWelcomeEmail,
  sendMlmWelcomeEmail,
  sendMobileContractEmail,
  sendTravelSubscriptionEmail,
} from "@/lib/mailer";

/**
 * メール種別に対応する対象者の取得と送信設定
 * mailType:
 *   "member"          - 全会員（activeユーザー）
 *   "mlm"             - MLM会員（MlmMemberが存在するユーザー）
 *   "mobile_contract" - 携帯契約者（activeのMobileContract保有ユーザー）
 *   "travel"          - 旅行サブスク加入者（activeのTravelSubscription保有ユーザー）
 */

const schema = z.object({
  mailType: z.enum(["member", "mlm", "mobile_contract", "travel"]),
  subject: z.string().max(255).optional().nullable(),
  textBody: z.string().max(10000).optional().nullable(),
  htmlBody: z.string().max(50000).optional().nullable(),
  // テスト送信用（指定した場合はそのアドレスにだけ送信）
  testEmail: z.string().email().optional().nullable(),
});

// レート制限: 300ms間隔で送信（Resendの制限対策）
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { mailType, subject, textBody, htmlBody, testEmail } = parsed.data;

  // 対象者リストを取得
  type Recipient = { email: string; name: string; memberCode?: string; planName?: string; contractNumber?: string };
  let recipients: Recipient[] = [];

  if (testEmail) {
    // テスト送信: 管理者のみに送信
    recipients = [{ email: testEmail, name: "テスト送信", memberCode: "TEST001", planName: "テストプラン" }];
  } else {
    switch (mailType) {
      case "member": {
        const users = await prisma.user.findMany({
          where: { status: "active" },
          select: { email: true, name: true, memberCode: true },
          orderBy: { createdAt: "asc" },
        });
        recipients = users.map(u => ({ email: u.email, name: u.name, memberCode: u.memberCode }));
        break;
      }
      case "mlm": {
        const members = await prisma.mlmMember.findMany({
          where: { status: "active" },
          include: {
            user: { select: { email: true, name: true, memberCode: true } },
          },
          orderBy: { createdAt: "asc" },
        });
        recipients = members.map(m => ({
          email: m.user.email,
          name: m.user.name,
          memberCode: m.memberCode,
        }));
        break;
      }
      case "mobile_contract": {
        const contracts = await prisma.mobileContract.findMany({
          where: { status: "active" },
          include: {
            user: { select: { email: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        });
        // 同一ユーザーへの重複送信を避ける
        const seen = new Set<string>();
        for (const c of contracts) {
          if (!seen.has(c.user.email)) {
            seen.add(c.user.email);
            recipients.push({
              email: c.user.email,
              name: c.user.name,
              planName: c.planName,
              contractNumber: c.contractNumber,
            });
          }
        }
        break;
      }
      case "travel": {
        const subs = await prisma.travelSubscription.findMany({
          where: { status: "active" },
          include: {
            user: { select: { email: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        });
        const seen = new Set<string>();
        for (const s of subs) {
          if (!seen.has(s.user.email)) {
            seen.add(s.user.email);
            recipients.push({
              email: s.user.email,
              name: s.user.name,
              planName: s.planName,
            });
          }
        }
        break;
      }
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, message: "送信対象者がいません" });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    try {
      let result;
      const opts = {
        subject: subject ?? undefined,
        htmlBody: htmlBody ?? undefined,
        textBody: textBody ?? undefined,
      };

      switch (mailType) {
        case "member":
          result = await sendWelcomeEmail({ to: r.email, name: r.name, ...opts });
          break;
        case "mlm":
          result = await sendMlmWelcomeEmail({ to: r.email, name: r.name, memberCode: r.memberCode ?? "", ...opts });
          break;
        case "mobile_contract":
          result = await sendMobileContractEmail({
            to: r.email, name: r.name,
            planName: r.planName ?? "",
            contractNumber: r.contractNumber,
            ...opts,
          });
          break;
        case "travel":
          result = await sendTravelSubscriptionEmail({ to: r.email, name: r.name, planName: r.planName ?? "", ...opts });
          break;
      }

      if (result?.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${r.email}: ${String(result?.error ?? "unknown error")}`);
      }
    } catch (err) {
      failed++;
      errors.push(`${r.email}: ${String(err)}`);
    }

    // レート制限回避（300ms間隔）
    if (!testEmail && sent + failed < recipients.length) {
      await sleep(300);
    }
  }

  // 監査ログ
  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "bulk_mail_send",
      targetTable: "users",
      targetId: mailType,
      afterJson: { mailType, sent, failed, total: recipients.length, testEmail: testEmail ?? null },
    },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: recipients.length,
    errors: errors.slice(0, 10), // 最大10件のエラーのみ返す
  });
}

/**
 * GET /api/admin/bulk-mail?mailType=xxx
 * 送信対象者の件数を取得（プレビュー用）
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const mailType = req.nextUrl.searchParams.get("mailType");
  if (!mailType) return NextResponse.json({ error: "mailType is required" }, { status: 400 });

  let count = 0;
  switch (mailType) {
    case "member":
      count = await prisma.user.count({ where: { status: "active" } });
      break;
    case "mlm":
      count = await prisma.mlmMember.count({ where: { status: "active" } });
      break;
    case "mobile_contract": {
      const emails = await prisma.mobileContract.findMany({
        where: { status: "active" },
        select: { user: { select: { email: true } } },
        distinct: ["userId"],
      });
      count = emails.length;
      break;
    }
    case "travel": {
      const emails = await prisma.travelSubscription.findMany({
        where: { status: "active" },
        select: { user: { select: { email: true } } },
        distinct: ["userId"],
      });
      count = emails.length;
      break;
    }
  }

  return NextResponse.json({ mailType, count });
}
