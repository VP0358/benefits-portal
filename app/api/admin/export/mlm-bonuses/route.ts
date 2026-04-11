// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/app/api/admin/route-guard";
import { getMlmDisplayName } from "@/lib/mlm-display-name";

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * GET /api/admin/export/mlm-bonuses?month=YYYY-MM
 * MLMボーナス結果CSV出力
 * 
 * 複数ポジション取得者は末尾-01に合算して出力する
 */
export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { searchParams } = req.nextUrl;
  const month = searchParams.get("month"); // YYYY-MM

  if (!month) {
    return new Response("対象月を指定してください", { status: 400 });
  }

  // ボーナス計算結果を取得
  const bonusRun = await prisma.bonusRun.findFirst({
    where: { bonusMonth: month },
    include: {
      results: {
        include: {
          mlmMember: {
            include: {
              user: {
                include: {
                  mlmRegistration: true,
                },
              },
            },
          },
        },
        orderBy: { mlmMember: { memberCode: "asc" } },
      },
    },
  });

  if (!bonusRun) {
    return new Response("指定された月のボーナス計算結果が見つかりません", { status: 404 });
  }

  // ── 複数ポジション合算処理 ──
  // memberCodeの先頭6桁をベースコードとして、同一人物の報酬を-01に合算
  type MergedBonus = {
    memberCode: string;
    name: string;
    email: string;
    bankCode: string;
    branchCode: string;
    bankAccountType: string;
    bankAccountNumber: string;
    bankAccountHolder: string;
    isActive: boolean;
    selfPurchasePoints: number;
    groupPoints: number;
    directActiveCount: number;
    achievedLevel: number;
    previousTitleLevel: number;
    newTitleLevel: number;
    directBonus: number;
    unilevelBonus: number;
    structureBonus: number;
    savingsBonus: number;
    totalBonus: number;
    positionCount: number; // 合算したポジション数
  };

  const mergedMap = new Map<string, MergedBonus>();

  for (const result of bonusRun.results) {
    if (result.totalBonus <= 0) continue; // ボーナスがない会員はスキップ

    const mc = result.mlmMember.memberCode;
    const normalized = mc.replace(/-/g, "");
    const baseCode = normalized.substring(0, normalized.length - 2);
    const reg = result.mlmMember.user.mlmRegistration;

    if (mergedMap.has(baseCode)) {
      // 既存エントリに合算
      const existing = mergedMap.get(baseCode)!;
      existing.selfPurchasePoints += result.selfPurchasePoints;
      existing.groupPoints += result.groupPoints;
      existing.directActiveCount += result.directActiveCount;
      existing.directBonus += result.directBonus;
      existing.unilevelBonus += result.unilevelBonus;
      existing.structureBonus += result.structureBonus;
      existing.savingsBonus += result.savingsBonus;
      existing.totalBonus += result.totalBonus;
      existing.positionCount += 1;
      // レベルは最高値を採用
      if (result.achievedLevel > existing.achievedLevel) {
        existing.achievedLevel = result.achievedLevel;
      }
      if (result.newTitleLevel > existing.newTitleLevel) {
        existing.newTitleLevel = result.newTitleLevel;
      }
      // いずれかのポジションがアクティブなら全体アクティブ
      if (result.isActive) existing.isActive = true;
    } else {
      // 新規エントリ（-01ポジション情報を使用）
      mergedMap.set(baseCode, {
        memberCode: `${baseCode}-01`,
        name: getMlmDisplayName(result.mlmMember.user.name, result.mlmMember.companyName),
        email: result.mlmMember.user.email,
        bankCode: result.mlmMember.bankCode ?? "",
        branchCode: result.mlmMember.branchCode ?? "",
        bankAccountType: reg?.bankAccountType ?? result.mlmMember.accountType ?? "",
        bankAccountNumber: reg?.bankAccountNumber ?? result.mlmMember.accountNumber ?? "",
        bankAccountHolder: reg?.bankAccountHolder ?? result.mlmMember.accountHolder ?? "",
        isActive: result.isActive,
        selfPurchasePoints: result.selfPurchasePoints,
        groupPoints: result.groupPoints,
        directActiveCount: result.directActiveCount,
        achievedLevel: result.achievedLevel,
        previousTitleLevel: result.previousTitleLevel,
        newTitleLevel: result.newTitleLevel,
        directBonus: result.directBonus,
        unilevelBonus: result.unilevelBonus,
        structureBonus: result.structureBonus,
        savingsBonus: result.savingsBonus,
        totalBonus: result.totalBonus,
        positionCount: 1,
      });
    }
  }

  // -01ポジションの正式データで上書き（名前・メール・銀行情報）
  for (const [baseCode, entry] of mergedMap.entries()) {
    const primaryMemberCode = `${baseCode}-01`;
    const primaryMember = await prisma.mlmMember.findUnique({
      where: { memberCode: primaryMemberCode },
      include: {
        user: { include: { mlmRegistration: true } },
      },
    });
    if (primaryMember) {
      entry.memberCode = primaryMemberCode;
      entry.name = getMlmDisplayName(primaryMember.user.name, primaryMember.companyName);
      entry.email = primaryMember.user.email;
      const reg = primaryMember.user.mlmRegistration;
      entry.bankCode = primaryMember.bankCode ?? entry.bankCode;
      entry.branchCode = primaryMember.branchCode ?? entry.branchCode;
      entry.bankAccountType = reg?.bankAccountType ?? primaryMember.accountType ?? entry.bankAccountType;
      entry.bankAccountNumber = reg?.bankAccountNumber ?? primaryMember.accountNumber ?? entry.bankAccountNumber;
      entry.bankAccountHolder = reg?.bankAccountHolder ?? primaryMember.accountHolder ?? entry.bankAccountHolder;
    }
  }

  const header = [
    "会員コード",
    "氏名",
    "メールアドレス",
    "銀行コード",
    "支店コード",
    "口座種別",
    "口座番号",
    "口座名義",
    "アクティブ",
    "自己購入pt",
    "グループpt",
    "直紹介アクティブ数",
    "達成レベル",
    "旧称号",
    "新称号",
    "ダイレクトボーナス",
    "ユニレベルボーナス",
    "組織構築ボーナス",
    "貯金ボーナス",
    "合計ボーナス",
    "ポジション数",
  ];

  const rows = Array.from(mergedMap.values())
    .sort((a, b) => a.memberCode.localeCompare(b.memberCode))
    .map(entry => [
      entry.memberCode,
      entry.name,
      entry.email,
      entry.bankCode,
      entry.branchCode,
      entry.bankAccountType,
      entry.bankAccountNumber,
      entry.bankAccountHolder,
      entry.isActive ? "○" : "×",
      entry.selfPurchasePoints,
      entry.groupPoints,
      entry.directActiveCount,
      entry.achievedLevel,
      entry.previousTitleLevel,
      entry.newTitleLevel,
      entry.directBonus,
      entry.unilevelBonus,
      entry.structureBonus,
      entry.savingsBonus,
      entry.totalBonus,
      entry.positionCount,
    ]);

  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].map(line => line.map(csvEscape).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mlm_bonuses_${month}.csv"`,
    },
  });
}
