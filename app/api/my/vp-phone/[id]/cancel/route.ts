import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/my/vp-phone/[id]/cancel
 * 会員が自分のVP未来phone申込を解約・キャンセル申請する
 * - pending/reviewing/contracted のみキャンセル可能
 * - statusを "canceled" に変更
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const appId = BigInt(id);
  const userId = BigInt(session.user.id);

  // 自分の申し込みか確認
  const application = await prisma.vpPhoneApplication.findFirst({
    where: { id: appId, userId },
  });

  if (!application) {
    return NextResponse.json({ error: "申し込みが見つかりません" }, { status: 404 });
  }

  // キャンセル可能なステータスのみ
  if (!["pending", "reviewing", "contracted"].includes(application.status)) {
    return NextResponse.json(
      { error: "この申し込みはキャンセルできません" },
      { status: 400 }
    );
  }

  // ステータスを canceled に更新
  await prisma.vpPhoneApplication.update({
    where: { id: appId },
    data: {
      status: "canceled",
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, message: "解約申請を受け付けました" });
}
