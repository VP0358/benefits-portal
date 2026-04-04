import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";

// GET /api/admin/account - 現在の管理者情報取得
export async function GET() {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!admin) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ ...admin, id: admin.id.toString() });
}

// PATCH /api/admin/account - ログインID（メール）・パスワード変更
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { newName, newEmail, currentPassword, newPassword } = await req.json();

  const admin = await prisma.admin.findUnique({
    where: { email: session.user.email },
  });
  if (!admin) return NextResponse.json({ error: "not found" }, { status: 404 });

  // メールアドレス変更・パスワード変更時のみ現在のパスワードが必要
  const needsPasswordCheck =
    (newEmail && newEmail !== admin.email) || !!newPassword;

  if (needsPasswordCheck) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードを変更する場合は現在のパスワードが必要です。" },
        { status: 400 }
      );
    }
    const ok = await compare(currentPassword, admin.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "現在のパスワードが正しくありません。" },
        { status: 400 }
      );
    }
  }

  // メールアドレス重複チェック
  if (newEmail && newEmail !== admin.email) {
    const existing = await prisma.admin.findUnique({ where: { email: newEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスはすでに使用されています。" },
        { status: 400 }
      );
    }
  }

  // 更新データ構築
  const updateData: Record<string, unknown> = {};
  if (newName && newName !== admin.name) updateData.name = newName;
  if (newEmail && newEmail !== admin.email) updateData.email = newEmail;
  if (newPassword) {
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上にしてください。" },
        { status: 400 }
      );
    }
    updateData.passwordHash = await hash(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "変更内容がありません。" }, { status: 400 });
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: updateData,
  });

  return NextResponse.json({
    ok: true,
    emailChanged: !!updateData.email,
    passwordChanged: !!updateData.passwordHash,
  });
}
