import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { memberCode, password } = await req.json();

    if (!memberCode || !password) {
      return NextResponse.json({ error: "会員IDとパスワードは必須です" }, { status: 400 });
    }

    // 管理者チェック（メールアドレスで検索）
    const admin = await prisma.admin.findUnique({ where: { email: memberCode } }).catch(() => null);
    if (admin) {
      const ok = await compare(password, admin.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "会員IDまたはパスワードが正しくありません" }, { status: 401 });
      }
      return NextResponse.json({ role: "admin" });
    }

    // 会員チェック（会員IDで検索）
    const user = await prisma.user.findUnique({ where: { memberCode } }).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "会員IDまたはパスワードが正しくありません" }, { status: 401 });
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "会員IDまたはパスワードが正しくありません" }, { status: 401 });
    }

    // 退会者（canceled）はログイン不可
    if (user.status === "canceled") {
      return NextResponse.json({ error: "退会済みのアカウントはご利用いただけません" }, { status: 403 });
    }

    // 停止中（suspended）もログイン不可
    if (user.status === "suspended") {
      return NextResponse.json({ error: "このアカウントは現在ご利用いただけません" }, { status: 403 });
    }

    return NextResponse.json({ role: "member", email: user.email });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
