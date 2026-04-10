// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendContactNotificationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body    = await req.json();

    const { name, phone, email, menuTitle, content } = body;

    if (!name || !email || !content) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    // 会員コードを取得（ログイン中の場合）
    let memberCode: string | null = null;
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: BigInt(session.user.id) },
        select: { memberCode: true },
      });
      memberCode = user?.memberCode ?? null;
    }

    const inquiry = await prisma.contactInquiry.create({
      data: {
        name,
        phone:     phone ?? "",
        email,
        menuTitle: menuTitle ?? null,
        content,
        userId:    session?.user?.id ? BigInt(session.user.id) : null,
      },
    });

    // 管理者へのメール通知（非同期・エラーでも返答は成功扱い）
    sendContactNotificationEmail({
      inquiryId:  inquiry.id.toString(),
      name,
      phone:      phone ?? "",
      email,
      menuTitle:  menuTitle ?? null,
      content,
      memberCode,
    }).catch(err => console.error("[contact] notification email failed:", err));

    return NextResponse.json({ ok: true, id: inquiry.id.toString() }, { status: 201 });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
