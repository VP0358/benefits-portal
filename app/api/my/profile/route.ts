// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

// GET /api/my/profile - 現在のプロフィール取得
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true, memberCode: true, name: true, nameKana: true,
      email: true, phone: true, postalCode: true, address: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    ...user,
    id: user.id.toString(),
  });
}

// PATCH /api/my/profile - プロフィール更新
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, nameKana, phone, postalCode, address, newEmail,
          currentPassword, newPassword } = body;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  // パスワード変更 or メール変更の場合は現在のパスワード必須
  if ((newPassword || newEmail) && !currentPassword) {
    return NextResponse.json(
      { error: "現在のパスワードを入力してください。" },
      { status: 400 }
    );
  }

  // 現在のパスワード確認
  if (currentPassword) {
    const ok = await compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません。" },
        { status: 400 }
      );
    }
  }

  // メールアドレス重複チェック
  if (newEmail && newEmail !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスはすでに使用されています。" },
        { status: 400 }
      );
    }
  }

  // 更新データ構築
  const updateData: Record<string, unknown> = {};
  if (name)       updateData.name       = name;
  if (nameKana !== undefined) updateData.nameKana = nameKana;
  if (phone !== undefined)    updateData.phone    = phone;
  if (postalCode !== undefined) updateData.postalCode = postalCode;
  if (address !== undefined)  updateData.address  = address;
  if (newEmail && newEmail !== user.email) updateData.email = newEmail;
  if (newPassword) updateData.passwordHash = await hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true, memberCode: true, name: true, nameKana: true,
      email: true, phone: true, postalCode: true, address: true,
    },
  });

  return NextResponse.json({
    ...updated,
    id: updated.id.toString(),
    emailChanged: !!newEmail && newEmail !== user.email,
  });
}
