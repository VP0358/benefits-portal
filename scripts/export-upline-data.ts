/**
 * export-upline-data.ts
 * DBからuplineId/referrerId/memberCodeを全件取得してCSVに出力する
 * 
 * 実行方法:
 * npx tsx scripts/export-upline-data.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("DBから会員データ取得中...");
  
  const members = await prisma.mlmMember.findMany({
    select: {
      id: true,
      memberCode: true,
      status: true,
      uplineId: true,
      referrerId: true,
      forceActive: true,
      forceLevel: true,
      currentLevel: true,
    },
  });

  console.log(`取得件数: ${members.length}`);

  // CSV出力
  const outputPath = path.join(process.cwd(), "scripts", "upline-data-from-db.csv");
  const lines = ["memberCode,status,uplineId,referrerId,forceActive,forceLevel,currentLevel"];
  
  for (const m of members) {
    lines.push([
      m.memberCode,
      m.status,
      m.uplineId?.toString() ?? "",
      m.referrerId?.toString() ?? "",
      m.forceActive ? "1" : "0",
      m.forceLevel?.toString() ?? "",
      m.currentLevel.toString(),
    ].join(","));
  }

  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
  console.log(`出力完了: ${outputPath}`);
  
  // 統計
  const withUpline = members.filter(m => m.uplineId !== null).length;
  const withReferrer = members.filter(m => m.referrerId !== null).length;
  const diffCount = members.filter(m => 
    m.uplineId !== null && m.referrerId !== null && 
    m.uplineId.toString() !== m.referrerId.toString()
  ).length;
  
  console.log(`\n統計:`);
  console.log(`  全会員: ${members.length}`);
  console.log(`  uplineIdあり: ${withUpline}`);
  console.log(`  referrerIdあり: ${withReferrer}`);
  console.log(`  uplineId≠referrerId: ${diffCount}`);
  
  // 差異のある会員を表示
  const diffs = members.filter(m => 
    m.uplineId !== null && m.referrerId !== null && 
    m.uplineId.toString() !== m.referrerId.toString()
  );
  console.log(`\nuplineId≠referrerIdの会員（最大20件）:`);
  for (const m of diffs.slice(0, 20)) {
    console.log(`  ${m.memberCode}: uplineId=${m.uplineId}, referrerId=${m.referrerId}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
