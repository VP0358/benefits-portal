#!/usr/bin/env node
/**
 * 会員マスタ修正スクリプト
 * 実行方法: DATABASE_URL="..." node scripts/fix-member-data.mjs
 *
 * CSVファイル「member_mst.csv」の内容をDBに反映する:
 *  1. status（ステータス）
 *  2. currentLevel（称号レベル）
 *  3. conditionAchieved（条件達成）
 *  4. referrerId（紹介者ID）← CSVの「紹介者ID」列
 *  5. uplineId（直上者ID）  ← CSVの「直上者ID」列
 *  6. forceLevel（強制レベル）
 *  7. forceActive（強制ACT）
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// CSVから読み取った正規データ（全60件）
// memberCode: DB上の memberCode（例: "12345601"）
// status: active / autoship / withdrawn
// currentLevel: 0〜5
// conditionAchieved: true / false
// referrerCode: 紹介者のmemberCode
// uplineCode: 直上者のmemberCode
// forceLevel: null=未設定, 1〜5
// forceActive: null=未選択, true=強制ACT
// ─────────────────────────────────────────────
const csvData = [
  { memberCode: "10234001", status: "active",    currentLevel: 0, conditionAchieved: false, referrerCode: "93713603", uplineCode: "93713603", forceLevel: null, forceActive: null },
  { memberCode: "10486501", status: "active",    currentLevel: 0, conditionAchieved: false, referrerCode: "28860601", uplineCode: "28860601", forceLevel: null, forceActive: null },
  { memberCode: "10492201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "39333301", uplineCode: "39333303", forceLevel: null, forceActive: null },
  { memberCode: "10580001", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "42845502", uplineCode: "42845502", forceLevel: null, forceActive: null },
  { memberCode: "10637501", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "48344003", uplineCode: "48344003", forceLevel: null, forceActive: null },
  { memberCode: "10749901", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "72395501", uplineCode: "72395502", forceLevel: null, forceActive: null },
  { memberCode: "10885801", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "51556601", uplineCode: "51556601", forceLevel: null, forceActive: null },
  { memberCode: "10885802", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "10885801", uplineCode: "10885801", forceLevel: null, forceActive: null },
  { memberCode: "10885803", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "10885801", uplineCode: "10885801", forceLevel: null, forceActive: null },
  { memberCode: "10900401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "21532702", uplineCode: "21532702", forceLevel: null, forceActive: null },
  { memberCode: "10905501", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "47356803", uplineCode: "47356803", forceLevel: null, forceActive: null },
  { memberCode: "11003401", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "42845502", uplineCode: "42845502", forceLevel: null, forceActive: null },
  { memberCode: "11005201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "48344003", uplineCode: "99922101", forceLevel: null, forceActive: null },
  { memberCode: "11304301", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "48598901", uplineCode: "48598901", forceLevel: null, forceActive: null },
  { memberCode: "11494201", status: "active",    currentLevel: 0, conditionAchieved: false, referrerCode: "86820603", uplineCode: "86820603", forceLevel: null, forceActive: null },
  { memberCode: "11583401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "44504701", uplineCode: "72612801", forceLevel: null, forceActive: null },
  { memberCode: "11643601", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "44356701", uplineCode: "44356701", forceLevel: null, forceActive: null },
  { memberCode: "11703501", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "93713604", uplineCode: "93713604", forceLevel: null, forceActive: null },
  { memberCode: "11818101", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12654601", uplineCode: "12654601", forceLevel: null, forceActive: null },
  { memberCode: "11934401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "15226301", uplineCode: "34637001", forceLevel: null, forceActive: null },
  { memberCode: "12091201", status: "autoship",  currentLevel: 1, conditionAchieved: true,  referrerCode: "89144401", uplineCode: "89144401", forceLevel: null, forceActive: null },
  { memberCode: "12091202", status: "autoship",  currentLevel: 1, conditionAchieved: true,  referrerCode: "12091201", uplineCode: "12091201", forceLevel: null, forceActive: null },
  { memberCode: "12226601", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "98274001", uplineCode: "25067802", forceLevel: null, forceActive: null },
  { memberCode: "12234101", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "66415903", uplineCode: "66415903", forceLevel: null, forceActive: null },
  { memberCode: "12376001", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "37606501", uplineCode: "37606501", forceLevel: null, forceActive: null },
  { memberCode: "12409201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "47015001", uplineCode: "47015001", forceLevel: null, forceActive: null },
  { memberCode: "12409202", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12409201", uplineCode: "12409201", forceLevel: null, forceActive: null },
  { memberCode: "12409203", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12409201", uplineCode: "12409201", forceLevel: null, forceActive: null },
  { memberCode: "12564301", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "16521701", uplineCode: "16521702", forceLevel: null, forceActive: null },
  { memberCode: "12654601", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "93713602", uplineCode: "93713602", forceLevel: null, forceActive: null },
  { memberCode: "12654602", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "12654601", uplineCode: "12654601", forceLevel: null, forceActive: null },
  { memberCode: "12877601", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "93488801", uplineCode: "93488801", forceLevel: null, forceActive: null },
  { memberCode: "13192101", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "84341601", uplineCode: "84341601", forceLevel: null, forceActive: null },
  { memberCode: "13229201", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "65708001", uplineCode: "26621002", forceLevel: null, forceActive: null },
  { memberCode: "13229202", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "13229201", uplineCode: "13229201", forceLevel: null, forceActive: null },
  { memberCode: "13229203", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "13229201", uplineCode: "13229201", forceLevel: null, forceActive: null },
  { memberCode: "13229204", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "13229201", uplineCode: "13229201", forceLevel: null, forceActive: null },
  { memberCode: "13341801", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "15978301", uplineCode: "65708002", forceLevel: null, forceActive: null },
  { memberCode: "13379501", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "70114501", uplineCode: "70114501", forceLevel: null, forceActive: null },
  { memberCode: "13451401", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "55165901", uplineCode: "55165901", forceLevel: null, forceActive: null },
  { memberCode: "13706101", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "47356802", uplineCode: "47356802", forceLevel: null, forceActive: null },
  { memberCode: "13941301", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "21532701", uplineCode: "21532701", forceLevel: null, forceActive: null },
  { memberCode: "13941302", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "13941301", uplineCode: "13941301", forceLevel: null, forceActive: null },
  { memberCode: "14047101", status: "autoship",  currentLevel: 1, conditionAchieved: true,  referrerCode: "15226301", uplineCode: "15226301", forceLevel: null, forceActive: null },
  { memberCode: "14076701", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "22482301", uplineCode: "42165901", forceLevel: null, forceActive: null },
  { memberCode: "14142101", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "65466502", uplineCode: "65466502", forceLevel: null, forceActive: null },
  { memberCode: "14247201", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "38974401", uplineCode: "38974401", forceLevel: null, forceActive: null },
  { memberCode: "14248301", status: "autoship",  currentLevel: 0, conditionAchieved: false, referrerCode: "42845501", uplineCode: "42845501", forceLevel: null, forceActive: null },
  { memberCode: "14260001", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "25290001", uplineCode: "25290001", forceLevel: null, forceActive: null },
  { memberCode: "14260002", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "14260001", uplineCode: "14260001", forceLevel: null, forceActive: null },
  { memberCode: "14372601", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "63893701", uplineCode: "63893701", forceLevel: null, forceActive: null },
  { memberCode: "14420501", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "66767001", uplineCode: "66767001", forceLevel: null, forceActive: null },
  { memberCode: "14454201", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "14857601", uplineCode: "14857601", forceLevel: null, forceActive: null },
  { memberCode: "14578101", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "57251401", uplineCode: "57251401", forceLevel: null, forceActive: null },
  { memberCode: "14676801", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "15978301", uplineCode: "26621001", forceLevel: null, forceActive: null },
  { memberCode: "14733701", status: "active",    currentLevel: 0, conditionAchieved: true,  referrerCode: "42845502", uplineCode: "42845502", forceLevel: null, forceActive: null },
  { memberCode: "14840001", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "11583401", uplineCode: "80518201", forceLevel: null, forceActive: null },
  { memberCode: "14857601", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "93713602", uplineCode: "93713602", forceLevel: null, forceActive: null },
  { memberCode: "14857602", status: "withdrawn", currentLevel: 0, conditionAchieved: true,  referrerCode: "14857601", uplineCode: "14857601", forceLevel: null, forceActive: null },
  { memberCode: "14987301", status: "autoship",  currentLevel: 0, conditionAchieved: true,  referrerCode: "93713604", uplineCode: "93713604", forceLevel: null, forceActive: null },
];

async function main() {
  console.log("=== 会員データ修正スクリプト開始 ===\n");

  // 全会員をmemberCodeで一括取得
  const allMembers = await prisma.mlmMember.findMany({
    select: {
      id: true,
      memberCode: true,
      referrerId: true,
      uplineId: true,
      status: true,
      currentLevel: true,
      conditionAchieved: true,
      forceLevel: true,
      forceActive: true,
    }
  });

  const memberCodeMap = new Map(allMembers.map(m => [m.memberCode, m]));
  console.log(`DB上の全会員数: ${allMembers.length}名\n`);

  let updateCount = 0;
  let skipCount   = 0;
  let missingCount = 0;

  const changes = [];

  for (const csv of csvData) {
    const member = memberCodeMap.get(csv.memberCode);
    if (!member) {
      console.log(`⚠️  DB未存在: ${csv.memberCode}`);
      missingCount++;
      continue;
    }

    // 紹介者・直上者を memberCode で引く
    const referrerMember = csv.referrerCode ? memberCodeMap.get(csv.referrerCode) : null;
    const uplineMember   = csv.uplineCode   ? memberCodeMap.get(csv.uplineCode)   : null;

    const updates = {};
    const diffs   = [];

    // ① ステータス
    if (member.status !== csv.status) {
      diffs.push(`status: ${member.status} → ${csv.status}`);
      updates.status = csv.status;
    }

    // ② currentLevel
    if (member.currentLevel !== csv.currentLevel) {
      diffs.push(`currentLevel: ${member.currentLevel} → ${csv.currentLevel}`);
      updates.currentLevel = csv.currentLevel;
    }

    // ③ conditionAchieved
    if (member.conditionAchieved !== csv.conditionAchieved) {
      diffs.push(`conditionAchieved: ${member.conditionAchieved} → ${csv.conditionAchieved}`);
      updates.conditionAchieved = csv.conditionAchieved;
    }

    // ④ referrerId（紹介者）
    if (referrerMember) {
      const csvRefId = referrerMember.id;
      if (member.referrerId !== csvRefId) {
        diffs.push(`referrerId: ${member.referrerId} → ${csvRefId} (${csv.referrerCode})`);
        updates.referrerId = csvRefId;
      }
    } else if (csv.referrerCode) {
      console.log(`  ⚠️  紹介者 ${csv.referrerCode} がDBに存在しません (${csv.memberCode})`);
    }

    // ⑤ uplineId（直上者）
    if (uplineMember) {
      const csvUpId = uplineMember.id;
      if (member.uplineId !== csvUpId) {
        diffs.push(`uplineId: ${member.uplineId} → ${csvUpId} (${csv.uplineCode})`);
        updates.uplineId = csvUpId;
      }
    } else if (csv.uplineCode) {
      console.log(`  ⚠️  直上者 ${csv.uplineCode} がDBに存在しません (${csv.memberCode})`);
    }

    // ⑥ forceLevel
    if (member.forceLevel !== csv.forceLevel) {
      diffs.push(`forceLevel: ${member.forceLevel} → ${csv.forceLevel}`);
      updates.forceLevel = csv.forceLevel;
    }

    // ⑦ forceActive（nullは false 扱い）
    const dbForceActive = member.forceActive ?? false;
    const csvForceActive = csv.forceActive ?? false;
    if (dbForceActive !== csvForceActive) {
      diffs.push(`forceActive: ${dbForceActive} → ${csvForceActive}`);
      updates.forceActive = csvForceActive;
    }

    if (Object.keys(updates).length === 0) {
      skipCount++;
      continue;
    }

    changes.push({ memberCode: csv.memberCode, updates, diffs });
  }

  // 差分サマリー表示
  console.log(`=== 変更対象: ${changes.length}件 / 変更なし: ${skipCount}件 / DB未存在: ${missingCount}件 ===\n`);
  for (const c of changes) {
    console.log(`📝 ${c.memberCode}:`);
    for (const d of c.diffs) {
      console.log(`   - ${d}`);
    }
  }

  if (changes.length === 0) {
    console.log("\n✅ 変更不要です。DBはCSVと一致しています。");
    await prisma.$disconnect();
    return;
  }

  // 実際に更新
  console.log("\n=== DB更新実行中... ===\n");
  for (const c of changes) {
    const member = memberCodeMap.get(c.memberCode);
    try {
      await prisma.mlmMember.update({
        where: { id: member.id },
        data: c.updates,
      });
      updateCount++;
      console.log(`  ✅ 更新完了: ${c.memberCode}`);
    } catch (e) {
      console.error(`  ❌ 更新失敗: ${c.memberCode} - ${e.message}`);
    }
  }

  console.log(`\n=== 完了: ${updateCount}件更新 / ${missingCount}件DB未存在 ===`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
