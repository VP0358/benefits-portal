// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** ユニークな referralCode を生成 */
async function generateReferralCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const exists = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!exists) return code;
  }
  throw new Error("referralCode generation failed");
}

/** GET: 自分の紹介コードを取得（なければ自動生成） */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(session.user.id) },
    select: { id: true, name: true, referralCode: true },
  });

  if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // referralCodeがなければ自動生成
  let code = user.referralCode;
  if (!code) {
    code = await generateReferralCode();
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: code },
    });
  }

  return NextResponse.json({ referralCode: code, name: user.name });
}
