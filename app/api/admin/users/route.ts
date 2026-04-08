// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";


import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { hash } from "bcryptjs";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pointWallet: true,
      referrals: true,
    },
  });

  return NextResponse.json(
    users.map((user) => ({
      id: user.id.toString(),
      memberCode: user.memberCode,
      name: user.name,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      referralCount: user.referrals.length,
      availablePointsBalance: user.pointWallet?.availablePointsBalance ?? 0,
    }))
  );
}

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  nameKana: z.string().max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().max(30).optional(),
  postalCode: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
  memberCode: z.string().min(1).max(50).optional(),
  status: z.enum(["active", "suspended", "invited"]).optional().default("active"),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const json = await req.json();
  const parsed = createUserSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, nameKana, email, password, phone, postalCode, address, status } = parsed.data;

  // 既存チェック
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "このメールアドレスは既に使用されています。" }, { status: 409 });

  // 会員番号自動採番
  let memberCode = parsed.data.memberCode;
  if (!memberCode) {
    const count = await prisma.user.count();
    memberCode = `M${String(count + 1).padStart(4, "0")}`;
    // 重複チェック
    let tries = 0;
    while (await prisma.user.findUnique({ where: { memberCode } })) {
      tries++;
      memberCode = `M${String(count + 1 + tries).padStart(4, "0")}`;
    }
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: { name, nameKana, email, passwordHash, memberCode, phone, postalCode, address, status },
  });

  // ポイントウォレット初期化
  await prisma.pointWallet.create({
    data: { userId: user.id },
  });

  const adminId = guard.session?.user?.id ? BigInt(guard.session.user.id) : null;
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      actionType: "create",
      targetTable: "user",
      targetId: user.id.toString(),
      beforeJson: undefined,
      afterJson: { email, name, memberCode },
    },
  }).catch(() => {});

  return NextResponse.json({
    id: user.id.toString(),
    memberCode: user.memberCode,
    name: user.name,
    email: user.email,
    status: user.status,
    createdAt: user.createdAt,
  }, { status: 201 });
}
