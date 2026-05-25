export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/fix-member-master
 * 会員マスタ（紹介者・直上者・ステータス・条件）をCSVマスタに基づき修正する
 * 管理者専用
 */

// ─────────────────────────────────────────────
// CSVから読み取った正規データ（全60件）
// memberCode: DB上の memberCode
// status: active / autoship / withdrawn
// currentLevel: 0〜5
// conditionAchieved: true / false
// referrerCode: 紹介者のmemberCode (CSVの「紹介者ID」列)
// uplineCode:   直上者のmemberCode (CSVの「直上者ID」列)
// ─────────────────────────────────────────────
const CSV_DATA = [
  { memberCode: "10234001", status: "active",    currentLevel: 0, conditionAchieved: false, referrerCode: "93713603", uplineCode: "93713603" },
  { memberCode: "10486501", status: "active",    currentLevel: 0, conditionAchieved: false, referrerCode: "28860601", uplineCode: "28860601" },
  { memberCode: "10492201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "39333301", uplineCode: "39333303" },
  { memberCode: "10580001", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "42845502", uplineCode: "42845502" },
  { memberCode: "10637501", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "48344003", uplineCode: "48344003" },
  { memberCode: "10749901", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "72395501", uplineCode: "72395502" },
  { memberCode: "10885801", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "51556601", uplineCode: "51556601" },
  { memberCode: "10885802", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "10885801", uplineCode: "10885801" },
  { memberCode: "10885803", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "10885801", uplineCode: "10885801" },
  { memberCode: "10900401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "21532702", uplineCode: "21532702" },
  { memberCode: "10905501", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "47356803", uplineCode: "47356803" },
  { memberCode: "11003401", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "42845502", uplineCode: "42845502" },
  { memberCode: "11005201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "48344003", uplineCode: "99922101" },
  { memberCode: "11304301", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "48598901", uplineCode: "48598901" },
  { memberCode: "11494201", status: "active",    currentLevel: 0, conditionAchieved: false, referrerCode: "86820603", uplineCode: "86820603" },
  { memberCode: "11583401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "44504701", uplineCode: "72612801" },
  { memberCode: "11643601", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "44356701", uplineCode: "44356701" },
  { memberCode: "11703501", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "93713604", uplineCode: "93713604" },
  { memberCode: "11818101", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12654601", uplineCode: "12654601" },
  { memberCode: "11934401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "15226301", uplineCode: "34637001" },
  { memberCode: "12091201", status: "autoship",  currentLevel: 1, conditionAchieved: true,  referrerCode: "89144401", uplineCode: "89144401" },
  { memberCode: "12091202", status: "autoship",  currentLevel: 1, conditionAchieved: true,  referrerCode: "12091201", uplineCode: "12091201" },
  { memberCode: "12226601", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "98274001", uplineCode: "25067802" },
  { memberCode: "12234101", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "66415903", uplineCode: "66415903" },
  { memberCode: "12376001", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "37606501", uplineCode: "37606501" },
  { memberCode: "12409201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "47015001", uplineCode: "47015001" },
  { memberCode: "12409202", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12409201", uplineCode: "12409201" },
  { memberCode: "12409203", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12409201", uplineCode: "12409201" },
  { memberCode: "12564301", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "16521701", uplineCode: "16521702" },
  { memberCode: "12654601", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "93713602", uplineCode: "93713602" },
  { memberCode: "12654602", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12654601", uplineCode: "12654601" },
  { memberCode: "12877601", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "93488801", uplineCode: "93488801" },
  { memberCode: "13192101", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "84341601", uplineCode: "84341601" },
  { memberCode: "13229201", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "65708001", uplineCode: "26621002" },
  { memberCode: "13229202", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "13229201", uplineCode: "13229201" },
  { memberCode: "13229203", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "13229201", uplineCode: "13229201" },
  { memberCode: "13229204", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "13229201", uplineCode: "13229201" },
  { memberCode: "13341801", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "15978301", uplineCode: "65708002" },
  { memberCode: "13379501", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "70114501", uplineCode: "70114501" },
  { memberCode: "13451401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "55165901", uplineCode: "55165901" },
  { memberCode: "13706101", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "47356802", uplineCode: "47356802" },
  { memberCode: "13941301", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "21532701", uplineCode: "21532701" },
  { memberCode: "13941302", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "13941301", uplineCode: "13941301" },
  { memberCode: "14047101", status: "autoship",  currentLevel: 1, conditionAchieved: true,  referrerCode: "15226301", uplineCode: "15226301" },
  { memberCode: "14076701", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "22482301", uplineCode: "42165901" },
  { memberCode: "14142101", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "65466502", uplineCode: "65466502" },
  { memberCode: "14247201", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "38974401", uplineCode: "38974401" },
  { memberCode: "14248301", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "42845501", uplineCode: "42845501" },
  { memberCode: "14260001", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "25290001", uplineCode: "25290001" },
  { memberCode: "14260002", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "14260001", uplineCode: "14260001" },
  { memberCode: "14372601", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "63893701", uplineCode: "63893701" },
  { memberCode: "14420501", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "66767001", uplineCode: "66767001" },
  { memberCode: "14454201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "14857601", uplineCode: "14857601" },
  { memberCode: "14578101", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "57251401", uplineCode: "57251401" },
  { memberCode: "14676801", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "15978301", uplineCode: "26621001" },
  { memberCode: "14733701", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "42845502", uplineCode: "42845502" },
  { memberCode: "14840001", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "11583401", uplineCode: "80518201" },
  { memberCode: "14857601", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "93713602", uplineCode: "93713602" },
  { memberCode: "14857602", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "14857601", uplineCode: "14857601" },
  { memberCode: "14987301", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "93713604", uplineCode: "93713604" },
];

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 全会員をmemberCodeで一括取得（CSVにある会員 + 紹介者・直上者として参照される会員も含め全員）
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true,
      memberCode: true,
      referrerId: true,
      uplineId: true,
      status: true,
      currentLevel: true,
      conditionAchieved: true,
    }
  });

  const memberCodeMap = new Map(allMembers.map((m) => [m.memberCode, m]));

  const results: {
    memberCode: string;
    status: "updated" | "skipped" | "not_found" | "error";
    changes: string[];
    error?: string;
  }[] = [];

  for (const csv of CSV_DATA) {
    const member = memberCodeMap.get(csv.memberCode);
    if (!member) {
      results.push({ memberCode: csv.memberCode, status: "not_found", changes: [] });
      continue;
    }

    const referrerMember = csv.referrerCode ? memberCodeMap.get(csv.referrerCode) : null;
    const uplineMember   = csv.uplineCode   ? memberCodeMap.get(csv.uplineCode)   : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    const changes: string[] = [];

    // ① status
    if (member.status !== csv.status) {
      changes.push(`status: ${member.status} → ${csv.status}`);
      updates.status = csv.status;
    }

    // ② currentLevel
    if (member.currentLevel !== csv.currentLevel) {
      changes.push(`currentLevel: ${member.currentLevel} → ${csv.currentLevel}`);
      updates.currentLevel = csv.currentLevel;
    }

    // ③ conditionAchieved
    if (member.conditionAchieved !== csv.conditionAchieved) {
      changes.push(`conditionAchieved: ${member.conditionAchieved} → ${csv.conditionAchieved}`);
      updates.conditionAchieved = csv.conditionAchieved;
    }

    // ④ referrerId（紹介者）
    if (referrerMember) {
      if (member.referrerId !== referrerMember.id) {
        changes.push(`referrerId: ${member.referrerId} → ${referrerMember.id} (${csv.referrerCode})`);
        updates.referrerId = referrerMember.id;
      }
    }

    // ⑤ uplineId（直上者）
    if (uplineMember) {
      if (member.uplineId !== uplineMember.id) {
        changes.push(`uplineId: ${member.uplineId} → ${uplineMember.id} (${csv.uplineCode})`);
        updates.uplineId = uplineMember.id;
      }
    }

    if (Object.keys(updates).length === 0) {
      results.push({ memberCode: csv.memberCode, status: "skipped", changes: [] });
      continue;
    }

    try {
      await prisma.mlmMember.update({
        where: { id: member.id },
        data: updates,
      });
      results.push({ memberCode: csv.memberCode, status: "updated", changes });
    } catch (e) {
      results.push({
        memberCode: csv.memberCode,
        status: "error",
        changes,
        error: String(e),
      });
    }
  }

  const summary = {
    total:    CSV_DATA.length,
    updated:  results.filter(r => r.status === "updated").length,
    skipped:  results.filter(r => r.status === "skipped").length,
    notFound: results.filter(r => r.status === "not_found").length,
    errors:   results.filter(r => r.status === "error").length,
  };

  console.log(`✅ fix-member-master 完了: 更新${summary.updated}件 / スキップ${summary.skipped}件 / 未存在${summary.notFound}件 / エラー${summary.errors}件`);

  return NextResponse.json({ summary, results });
}

/**
 * GET /api/admin/fix-member-master
 * ドライラン: 実際には更新せず差分のみ返す
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true,
      memberCode: true,
      referrerId: true,
      uplineId: true,
      status: true,
      currentLevel: true,
      conditionAchieved: true,
    }
  });

  const memberCodeMap = new Map(allMembers.map((m) => [m.memberCode, m]));

  const diffs: {
    memberCode: string;
    name?: string;
    changes: string[];
    referrerNotFound?: string;
    uplineNotFound?: string;
  }[] = [];

  for (const csv of CSV_DATA) {
    const member = memberCodeMap.get(csv.memberCode);
    if (!member) {
      diffs.push({ memberCode: csv.memberCode, changes: ["⚠️ DBに存在しない"] });
      continue;
    }

    const referrerMember = csv.referrerCode ? memberCodeMap.get(csv.referrerCode) : null;
    const uplineMember   = csv.uplineCode   ? memberCodeMap.get(csv.uplineCode)   : null;

    const changes: string[] = [];

    if (member.status !== csv.status)
      changes.push(`status: ${member.status} → ${csv.status}`);

    if (member.currentLevel !== csv.currentLevel)
      changes.push(`currentLevel: ${member.currentLevel} → ${csv.currentLevel}`);

    if (member.conditionAchieved !== csv.conditionAchieved)
      changes.push(`conditionAchieved: ${member.conditionAchieved} → ${csv.conditionAchieved}`);

    if (referrerMember && member.referrerId !== referrerMember.id)
      changes.push(`referrerId: ${member.referrerId} → ${referrerMember.id} (${csv.referrerCode})`);

    if (uplineMember && member.uplineId !== uplineMember.id)
      changes.push(`uplineId: ${member.uplineId} → ${uplineMember.id} (${csv.uplineCode})`);

    if (changes.length > 0) {
      diffs.push({
        memberCode: csv.memberCode,
        changes,
        referrerNotFound: !referrerMember && csv.referrerCode ? csv.referrerCode : undefined,
        uplineNotFound:   !uplineMember   && csv.uplineCode   ? csv.uplineCode   : undefined,
      });
    }
  }

  return NextResponse.json({
    dryRun: true,
    totalCsvRecords: CSV_DATA.length,
    diffCount: diffs.length,
    diffs,
  });
}
