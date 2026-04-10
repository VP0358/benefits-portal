// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/export/webfricom?bonusMonth=2026-02
 * Webフリコム形式データ出力（固定長120文字）
 * 
 * 複数ポジション取得者は末尾-01ポジションに合算して出力する
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
        paymentAmount: { gt: 0 },
      },
      include: {
        mlmMember: {
          include: { user: true },
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

    // ── 複数ポジション合算処理 ──
    // memberCodeの先頭6桁をベースコードとして、同一人物の支払額を-01ポジションに合算
    type MergedEntry = {
      memberCode: string; // 末尾-01のコード（例: 123456-01）
      bankCode: string;
      branchCode: string;
      accountType: string;
      accountNumber: string;
      accountHolder: string;
      paymentAmount: number;
    };

    const mergedMap = new Map<string, MergedEntry>();

    for (const r of results) {
      const mc = r.mlmMember.memberCode; // 例: "12345601" or "123456-01"
      // ベースコード：ハイフン除いた先頭6桁 or 8桁全体から末尾2桁を除く
      const normalized = mc.replace(/-/g, "");
      const baseCode = normalized.substring(0, normalized.length - 2); // 先頭6桁
      const primaryCode = `${baseCode}-01`; // 正規化キー（ハイフン付き6桁-01形式）

      if (mergedMap.has(baseCode)) {
        // 合算
        mergedMap.get(baseCode)!.paymentAmount += r.paymentAmount;
      } else {
        // -01ポジションの銀行情報を使用
        const member = r.mlmMember;
        mergedMap.set(baseCode, {
          memberCode: primaryCode,
          bankCode: member.bankCode || "0000",
          branchCode: member.branchCode || "000",
          accountType: member.accountType === "savings" ? "1" : "2",
          accountNumber: (member.accountNumber || "0000000").padStart(7, "0"),
          accountHolder: (member.accountHolder || member.user.name).substring(0, 30).padEnd(30, " "),
          paymentAmount: r.paymentAmount,
        });
      }
    }

    // -01ポジションの銀行情報を正式に取得して上書き
    for (const [baseCode, entry] of mergedMap.entries()) {
      const primaryMemberCode = `${baseCode}-01`;
      const primaryMember = await prisma.mlmMember.findUnique({
        where: { memberCode: primaryMemberCode },
        include: { user: true },
      });
      if (primaryMember) {
        entry.bankCode = primaryMember.bankCode || entry.bankCode;
        entry.branchCode = primaryMember.branchCode || entry.branchCode;
        entry.accountType = primaryMember.accountType === "savings" ? "1" : "2";
        entry.accountNumber = (primaryMember.accountNumber || entry.accountNumber.trim()).padStart(7, "0");
        entry.accountHolder = (primaryMember.accountHolder || primaryMember.user.name).substring(0, 30).padEnd(30, " ");
        entry.memberCode = primaryMemberCode;
      }
    }

    // Webフリコム形式の固定長120文字データを生成
    const mergedList = Array.from(mergedMap.values()).sort((a, b) =>
      a.memberCode.localeCompare(b.memberCode)
    );

    const lines = mergedList.map((entry) => {
      const amount = String(entry.paymentAmount).padStart(10, "0");
      const memberCode = entry.memberCode.padEnd(20, " ");
      const dummy = "".padEnd(44, " ");
      const line = `2${entry.bankCode}${entry.branchCode}${entry.accountType}${entry.accountNumber}${entry.accountHolder}${amount}${memberCode}${dummy}`;
      return line.substring(0, 120);
    });

    const totalAmount = mergedList.reduce((sum, e) => sum + e.paymentAmount, 0);
    const header = "1".padEnd(120, " ");
    const trailer = `9${String(mergedList.length).padStart(6, "0")}${String(totalAmount).padStart(12, "0")}`.padEnd(120, " ");

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
