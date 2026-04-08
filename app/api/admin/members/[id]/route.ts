// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server";


import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function parseId(id: string) {
  try { return BigInt(id); } catch { return null; }
}

// ── 契約解除（PATCH） ──────────────────────────────────────
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseId(id);
  if (!userId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
  if ((user.status as string) === "canceled") {
    return NextResponse.json({ error: "すでに契約解除済みです" }, { status: 400 });
  }

  const now = new Date();

  // ステータスを「canceled」に更新（canceledAt は DB適用済みなら保存）
  const updated = await prisma.user.update({
    where: { id: userId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { status: "canceled" as any, canceledAt: now },
  });

  // 監査ログ（エラーは無視）
  prisma.adminAuditLog.create({
    data: {
      adminId: session.user.id ? BigInt(session.user.id) : BigInt(0),
      actionType: "cancel_member",
      targetTable: "User",
      targetId: userId.toString(),
      beforeJson: { status: user.status },
      afterJson:  { status: "canceled" },
    },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    id: updated.id.toString(),
    status: updated.status,
  });
}

// ── 物理削除（DELETE） ──────────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseId(id);
  if (!userId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
  if ((user.status as string) !== "canceled") {
    return NextResponse.json({ error: "契約解除済み会員のみ削除できます" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return new NextResponse(null, { status: 204 });
}
