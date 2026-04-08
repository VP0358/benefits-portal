import { NextRequest, NextResponse } from "next/server";

// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/my/vp-phone/[id]/cancel
 * 会員が自分のVP未来phone申込を解約・キャンセル申請する
 * - pending/reviewing/contracted のみキャンセル可能
 * - statusを "canceled" に変更
 * - cancelType: "cancel_apply"（申込取消）| "contract_cancel"（解約申請）| "plan_change"（プラン変更申請）
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const appId = BigInt(id);
  const userId = BigInt(session.user.id);

  // リクエストボディからcancelTypeを取得
  let cancelType = "cancel_apply";
  try {
    const body = await req.json();
    if (body?.cancelType) cancelType = body.cancelType;
  } catch {
    // body なしでもOK
  }

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

  // cancelTypeに応じてメモを生成
  const cancelTypeLabel =
    cancelType === "contract_cancel" ? "【解約申請】" :
    cancelType === "plan_change"     ? "【プラン変更申請】" :
    "【申込取消申請】";

  const prevStatus = application.status;
  const prevStatusLabel =
    prevStatus === "contracted" ? "契約済み" :
    prevStatus === "reviewing"  ? "審査中" : "審査待ち";

  const notePrefix = `${cancelTypeLabel} 会員より${cancelTypeLabel.replace(/[【】]/g, "")}。（申請時ステータス: ${prevStatusLabel}）`;
  const existingNote = application.adminNote ?? "";
  const newNote = existingNote
    ? `${notePrefix}\n---\n${existingNote}`
    : notePrefix;

  // ステータスを canceled に更新し、担当者メモに申請種別を記録
  await prisma.vpPhoneApplication.update({
    where: { id: appId },
    data: {
      status: "canceled",
      adminNote: newNote.slice(0, 500), // 500文字以内
      updatedAt: new Date(),
    },
  });

  const msg =
    cancelType === "contract_cancel" ? "解約申請を受け付けました。担当者よりご連絡いたします。" :
    cancelType === "plan_change"     ? "プラン変更申請を受け付けました。担当者よりご連絡いたします。" :
    "申込取消を受け付けました。";

  return NextResponse.json({ success: true, message: msg });
}
