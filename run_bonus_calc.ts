/**
 * ローカル実行スクリプト: 2026-04のボーナス計算を実行する
 * 使用方法: npx tsx run_bonus_calc.ts
 */
import { executeBonusCalculation } from "./lib/bonus-calculation-engine";

const bonusMonth = "2026-04";
const paymentAdjustmentRate = null; // 調整率なし（旧システムと同じ）

async function main() {
  console.log(`\n🚀 ${bonusMonth} ボーナス計算開始...`);

  try {
    const result = await executeBonusCalculation(bonusMonth, paymentAdjustmentRate, (msg) => {
      console.log(`  [PROGRESS] ${msg}`);
    });

    console.log("\n✅ 計算完了!");
    console.log(`  bonusRunId: ${result.bonusRunId}`);
    console.log(`  totalMembers: ${result.totalMembers}`);
    console.log(`  totalActiveMembers: ${result.totalActiveMembers}`);
    console.log(`  totalBonusAmount: ¥${result.totalBonusAmount.toLocaleString()}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  }
}

main();
