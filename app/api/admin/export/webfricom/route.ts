// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";



import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/export/webfricom?bonusMonth=2026-02
 * Webフリコム形式データ出力（固定長120文字）
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bonusMonth = searchParams.get("bonusMonth");

  if (!bonusMonth) {
    return NextResponse.json({ error: "bonusMonth required" }, { status: 400 });
  }

  try {
    // 支払対象者（paymentAmount > 0）のボーナス結果を取得
    const results = await prisma.bonusResult.findMany({
      where: {
        bonusMonth,
        paymentAmount: {
          gt: 0,
        },
      },
      include: {
        mlmMember: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { mlmMember: { memberCode: "asc" } },
    });

    if (results.length === 0) {
      return new NextResponse("", {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=shift_jis",
          "Content-Disposition": `attachment; filename="webfricom_${bonusMonth}.txt"`,
        },
      });
    }

    // Webフリコム形式の固定長120文字データを生成
    const lines = results.map((r) => {
      // 会員の銀行情報を取得（実際のDBスキーマに合わせて調整）
      const bankCode = r.mlmMember.bankCode || "0000"; // 銀行コード（4桁）
      const branchCode = r.mlmMember.branchCode || "000"; // 支店コード（3桁）
      const accountType = r.mlmMember.accountType === "savings" ? "1" : "2"; // 1:普通 2:当座
      const accountNumber = (r.mlmMember.accountNumber || "0000000").padStart(7, "0"); // 口座番号（7桁）
      const accountHolder = (r.mlmMember.accountHolder || r.mlmMember.user.name)
        .substring(0, 30)
        .padEnd(30, " "); // 口座名義（30文字）
      const amount = String(r.paymentAmount).padStart(10, "0"); // 金額（10桁）
      const memberCode = r.mlmMember.memberCode.padEnd(20, " "); // 会員コード（20文字）

      // データコード（1文字）+ 銀行コード（4桁）+ 支店コード（3桁）+ 
      // 預金種目（1桁）+ 口座番号（7桁）+ 受取人名（30文字）+ 
      // 振込金額（10桁）+ 顧客コード（20桁）+ ダミー（44桁）= 120文字
      const dummy = "".padEnd(44, " ");
      
      const line = `2${bankCode}${branchCode}${accountType}${accountNumber}${accountHolder}${amount}${memberCode}${dummy}`;
      
      return line.substring(0, 120); // 念のため120文字に切り詰め
    });

    // ヘッダー行を追加（オプション）
    const header = "1".padEnd(120, " "); // ヘッダーレコード
    const trailer = `9${String(results.length).padStart(6, "0")}${String(
      results.reduce((sum, r) => sum + r.paymentAmount, 0)
    ).padStart(12, "0")}`.padEnd(120, " "); // トレーラーレコード

    const content = [header, ...lines, trailer].join("\r\n");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=shift_jis",
        "Content-Disposition": `attachment; filename="webfricom_${bonusMonth}.txt"`,
      },
    });
  } catch (error) {
    console.error("Error generating webfricom data:", error);
    return NextResponse.json(
      { error: "Failed to generate webfricom data" },
      { status: 500 }
    );
  }
}
