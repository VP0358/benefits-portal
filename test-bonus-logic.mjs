/**
 * ボーナス計算ロジックのテスト
 */
import {
  calcLevelFromItemCount,
  getUnilevelMaxDepth,
  getUnilevelRates,
  calcUnilevelBonus,
  calcStructureBonus,
  calcRegistrationSavingsBonus,
  calcAutoshipSavingsBonus,
  calcBonusSavingsPoints,
  calcCashableSavingsPoints,
  checkLevelCondition,
  POINT_RATE,
} from './lib/mlm-bonus.ts';

console.log('🧪 ボーナス計算ロジックテスト開始\n');

// 1. レベル判定テスト
console.log('【1. レベル判定テスト】');
console.log('翠彩流通個数 25個 → レベル:', calcLevelFromItemCount(25));  // LV.1
console.log('翠彩流通個数 50個 → レベル:', calcLevelFromItemCount(50));  // LV.2
console.log('翠彩流通個数 150個 → レベル:', calcLevelFromItemCount(150)); // LV.3
console.log('翠彩流通個数 500個 → レベル:', calcLevelFromItemCount(500)); // LV.4
console.log('翠彩流通個数 1500個 → レベル:', calcLevelFromItemCount(1500)); // LV.5
console.log('');

// 2. ユニレベルボーナス段数制限テスト
console.log('【2. ユニレベルボーナス段数制限】');
for (let lv = 0; lv <= 5; lv++) {
  console.log(`LV.${lv} → ${getUnilevelMaxDepth(lv)}段目まで獲得可能`);
}
console.log('');

// 3. ユニレベルボーナス計算テスト
console.log('【3. ユニレベルボーナス計算（LV.3, 直接紹介3人）】');
const depthPoints = {
  1: 300,  // 1段目: 300pt
  2: 500,  // 2段目: 500pt
  3: 200,  // 3段目: 200pt
  4: 100,  // 4段目: 100pt
  5: 50,   // 5段目: 50pt
  6: 30,   // 6段目: 30pt
  7: 20,   // 7段目: 20pt
};
const unilevelResult = calcUnilevelBonus(depthPoints, 3, 3);
console.log('段別ボーナス:', unilevelResult.detail);
console.log('合計ボーナス: ¥' + unilevelResult.total.toLocaleString());
console.log('');

// 4. 組織構築ボーナステスト
console.log('【4. 組織構築ボーナス（LV.3, 最小系列500pt）】');
const structureBonus = calcStructureBonus(3, 500, true);
console.log('組織構築ボーナス: ¥' + structureBonus.toLocaleString());
console.log('');

// 5. 貯金ボーナステスト
console.log('【5. 貯金ボーナス（SAVpt）計算】');
const regSavings = calcRegistrationSavingsBonus(150);
console.log('登録時（150pt, 20%）: ' + regSavings + 'pt');

const asSavings = calcAutoshipSavingsBonus(150);
console.log('オートシップ（150pt, 5%）: ' + asSavings + 'pt');

const bonusSavings = calcBonusSavingsPoints(100000);
console.log('月次コミッション（¥100,000, 3%）: ' + bonusSavings + 'pt');

const cashable = calcCashableSavingsPoints(25000);
console.log('換金可能判定（25,000pt）:', cashable);
console.log('');

// 6. レベル達成条件テスト
console.log('【6. レベル達成条件チェック】');
const lv3Condition = checkLevelCondition({
  level: 3,
  isActive: true,
  seriesCount: 3,
  selfPurchaseCount: 2,
  seriesLevelAchievers: { 1: 1, 2: 0, 3: 0 },
});
console.log('LV.3条件達成:', lv3Condition ? '✅ OK' : '❌ NG');

console.log('\n✅ テスト完了');
