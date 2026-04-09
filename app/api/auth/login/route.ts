import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "メールアドレスとパスワードは必須です" }, { status: 400 });
    }

    // 管理者チェック
    const admin = await prisma.admin.findUnique({ where: { email } }).catch(() => null);
    if (admin) {
      const ok = await compare(password, admin.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
      }
      return NextResponse.json({ role: "admin" });
    }

    // 会員チェック
    const user = await prisma.user.findUnique({ where: { email } }).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "このアカウントは現在ご利用いただけません" }, { status: 403 });
    }

    // パスワードOK → member として返す
    return NextResponse.json({ role: "member", email: user.email });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
