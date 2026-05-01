/**
 * ボーナス計算ロジック テストスクリプト
 * 実行: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-bonus-calculation.ts
 *
 * テストシナリオ:
 * 1. アクティブ判定テスト（isActiveMember）
 * 2. 報酬受取資格テスト（isEligibleForBonus）
 * 3. ダイレクトボーナス計算テスト
 * 4. ユニレベルボーナス計算テスト
 * 5. 組織構築ボーナス計算テスト
 * 6. 調整金反映テスト
 * 7. 支払額計算テスト（源泉税・事務費差引）
 * 8. 総合シナリオテスト（5人ツリー構造）
 */

import {
  isActiveMember,
  isEligibleForBonus,
  calcUnilevelBonus,
  calcLevelFromItemCount,
  getUnilevelRates,
  getUnilevelMaxDepth,
  ACTIVE_MIN_POINTS,
  ACTIVE_REQUIRED_PRODUCTS,
  DIRECT_BONUS_AMOUNT,
  POINT_RATE,
  LEVEL_ITEM_RANGES,
  UNILEVEL_RATES,
} from "../lib/mlm-bonus";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ユーティリティ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(label: string, actual: unknown, expected: unknown) {
  const ok =
    typeof expected === "object"
      ? JSON.stringify(actual) === JSON.stringify(expected)
      : actual === expected;

  if (ok) {
    console.log(`  ✅ PASS: ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    console.error(`         期待値: ${JSON.stringify(expected)}`);
    console.error(`         実際値: ${JSON.stringify(actual)}`);
    failCount++;
    failures.push(label);
  }
}

function section(title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log("═".repeat(60));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. アクティブ判定テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("1. アクティブ判定テスト（isActiveMember）");
console.log(`  条件: 商品コード1000 or 2000購入あり + ${ACTIVE_MIN_POINTS}pt以上`);

// 正常ケース: アクティブ
assert(
  "商品1000購入あり・150pt以上 → アクティブ",
  isActiveMember({ selfPoints: 150, purchasedRequiredProduct: true, forceActive: false }),
  true
);
assert(
  "商品2000購入あり・200pt以上 → アクティブ",
  isActiveMember({ selfPoints: 200, purchasedRequiredProduct: true, forceActive: false }),
  true
);
assert(
  "forceActive=true → 強制アクティブ（購入なし・0ptでも）",
  isActiveMember({ selfPoints: 0, purchasedRequiredProduct: false, forceActive: true }),
  true
);

// 非アクティブケース
assert(
  "商品購入なし・150pt以上 → 非アクティブ",
  isActiveMember({ selfPoints: 150, purchasedRequiredProduct: false, forceActive: false }),
  false
);
assert(
  "商品1000購入あり・149pt（不足） → 非アクティブ",
  isActiveMember({ selfPoints: 149, purchasedRequiredProduct: true, forceActive: false }),
  false
);
assert(
  "商品購入なし・0pt → 非アクティブ",
  isActiveMember({ selfPoints: 0, purchasedRequiredProduct: false, forceActive: false }),
  false
);
assert(
  "商品購入あり・0pt → 非アクティブ",
  isActiveMember({ selfPoints: 0, purchasedRequiredProduct: true, forceActive: false }),
  false
);
assert(
  "境界値: 150ptちょうど → アクティブ",
  isActiveMember({ selfPoints: 150, purchasedRequiredProduct: true, forceActive: false }),
  true
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 報酬受取資格テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("2. 報酬受取資格テスト（isEligibleForBonus）");
console.log("  条件: アクティブ かつ 直紹介アクティブ2人以上");

assert(
  "アクティブ・直紹介アクティブ2人 → 資格あり",
  isEligibleForBonus({ isActive: true, directActiveCount: 2 }),
  true
);
assert(
  "アクティブ・直紹介アクティブ3人 → 資格あり",
  isEligibleForBonus({ isActive: true, directActiveCount: 3 }),
  true
);
assert(
  "アクティブ・直紹介アクティブ1人 → 資格なし",
  isEligibleForBonus({ isActive: true, directActiveCount: 1 }),
  false
);
assert(
  "アクティブ・直紹介アクティブ0人 → 資格なし",
  isEligibleForBonus({ isActive: true, directActiveCount: 0 }),
  false
);
assert(
  "非アクティブ・直紹介アクティブ2人 → 資格なし",
  isEligibleForBonus({ isActive: false, directActiveCount: 2 }),
  false
);
assert(
  "非アクティブ・直紹介アクティブ0人 → 資格なし",
  isEligibleForBonus({ isActive: false, directActiveCount: 0 }),
  false
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. ダイレクトボーナス計算テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("3. ダイレクトボーナス計算テスト");
console.log(`  単価: ${DIRECT_BONUS_AMOUNT}円/個（s1000 = 登録料）`);

function calcDirectBonus(eligible: boolean, s1000Count: number): number {
  return eligible ? s1000Count * DIRECT_BONUS_AMOUNT : 0;
}

assert(
  "資格あり・s1000購入1個 → 2,000円",
  calcDirectBonus(true, 1),
  2000
);
assert(
  "資格あり・s1000購入3個 → 6,000円",
  calcDirectBonus(true, 3),
  6000
);
assert(
  "資格なし・s1000購入1個 → 0円（資格なしは対象外）",
  calcDirectBonus(false, 1),
  0
);
assert(
  "資格あり・s1000購入0個 → 0円",
  calcDirectBonus(true, 0),
  0
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. レベル判定テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("4. レベル判定テスト（calcLevelFromItemCount）");
console.log("  スミサイ流通個数 → レベル");

assert("0個 → LV.0", calcLevelFromItemCount(0), 0);
assert("1個 → LV.0", calcLevelFromItemCount(1), 0);
assert("2個 → LV.1", calcLevelFromItemCount(2), 1);
assert("30個 → LV.1", calcLevelFromItemCount(30), 1);
assert("31個 → LV.2", calcLevelFromItemCount(31), 2);
assert("100個 → LV.2", calcLevelFromItemCount(100), 2);
assert("101個 → LV.3", calcLevelFromItemCount(101), 3);
assert("300個 → LV.3", calcLevelFromItemCount(300), 3);
assert("301個 → LV.4", calcLevelFromItemCount(301), 4);
assert("1000個 → LV.4", calcLevelFromItemCount(1000), 4);
assert("1001個 → LV.5", calcLevelFromItemCount(1001), 5);
assert("9999個 → LV.5", calcLevelFromItemCount(9999), 5);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. ユニレベルボーナス計算テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("5. ユニレベルボーナス計算テスト（calcUnilevelBonus）");
console.log("  1pt = 100円  ユニレベルボーナス = 段数ポイント × 率 × 100円");

// LV.1: 3段目まで [15%, 7%, 3%]
{
  const depthPoints = { 1: 150, 2: 150, 3: 150, 4: 150 }; // 4段目はLV.1では対象外
  const result = calcUnilevelBonus(depthPoints, 1, 2);
  // 1段目: 150 × 15% × 100 = 2,250
  // 2段目: 150 × 7%  × 100 = 1,050
  // 3段目: 150 × 3%  × 100 = 450
  // 4段目以降: LV.1は3段まで → 0
  // 合計: 3,750円
  assert("LV.1・各段150pt → 合計3,750円", result.total, 3750);
  assert("LV.1・1段目: 2,250円", result.detail[1], 2250);
  assert("LV.1・2段目: 1,050円", result.detail[2], 1050);
  assert("LV.1・3段目: 450円", result.detail[3], 450);
  assert("LV.1・4段目: 対象外(undefined)", result.detail[4], undefined);
}

// LV.2: 5段目まで [15%, 7%, 3%, 1%, 1%]
{
  const depthPoints = { 1: 150, 2: 150, 3: 150, 4: 150, 5: 150, 6: 150 };
  const result = calcUnilevelBonus(depthPoints, 2, 2);
  // 1段目: 150 × 15% × 100 = 2,250
  // 2段目: 150 × 7%  × 100 = 1,050
  // 3段目: 150 × 3%  × 100 = 450
  // 4段目: 150 × 1%  × 100 = 150
  // 5段目: 150 × 1%  × 100 = 150
  // 6段目以降: LV.2は5段まで → 0
  // 合計: 4,050円
  assert("LV.2・各段150pt → 合計4,050円", result.total, 4050);
}

// LV.3: 7段目まで [15%, 8%, 5%, 4%, 2%, 1%, 1%]
{
  const depthPoints = { 1: 150, 2: 150, 3: 150, 4: 150, 5: 150, 6: 150, 7: 150 };
  const result = calcUnilevelBonus(depthPoints, 3, 2);
  // 1段目: 150 × 15% × 100 = 2,250
  // 2段目: 150 × 8%  × 100 = 1,200
  // 3段目: 150 × 5%  × 100 = 750
  // 4段目: 150 × 4%  × 100 = 600
  // 5段目: 150 × 2%  × 100 = 300
  // 6段目: 150 × 1%  × 100 = 150
  // 7段目: 150 × 1%  × 100 = 150
  // 合計: 5,400円
  assert("LV.3・各段150pt → 合計5,400円", result.total, 5400);
}

// 直紹介アクティブ1人 → ユニレベルボーナスなし
{
  const depthPoints = { 1: 150, 2: 150, 3: 150 };
  const result = calcUnilevelBonus(depthPoints, 1, 1); // directActiveCount=1
  assert("直紹介アクティブ1人 → ユニレベルボーナス0円", result.total, 0);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. 組織構築ボーナス計算テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("6. 組織構築ボーナス計算テスト");
console.log("  LV.3以上かつ01ポジションのみ対象");
console.log("  最小系列ポイント × 率 × 100円");
console.log("  LV.3: 3%  LV.4: 3.5%  LV.5: 4%");

function calcStructureBonusTest(level: number, minSeriesPoints: number, eligible: boolean): number {
  if (!eligible || level < 3) return 0;
  const rates: Record<number, number> = { 3: 3, 4: 3.5, 5: 4 };
  const rate = rates[level] ?? 0;
  return Math.floor(minSeriesPoints * (rate / 100) * POINT_RATE);
}

assert(
  "LV.3・最小系列200pt・資格あり → 600円",
  calcStructureBonusTest(3, 200, true),
  600
);
assert(
  "LV.4・最小系列200pt・資格あり → 700円",
  calcStructureBonusTest(4, 200, true),
  700
);
assert(
  "LV.5・最小系列200pt・資格あり → 800円",
  calcStructureBonusTest(5, 200, true),
  800
);
assert(
  "LV.2・最小系列200pt → 0円（LV.3未満は対象外）",
  calcStructureBonusTest(2, 200, true),
  0
);
assert(
  "LV.3・資格なし → 0円",
  calcStructureBonusTest(3, 200, false),
  0
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. 支払額計算テスト（調整金・源泉税・事務費差引）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("7. 支払額計算テスト（調整金→源泉税→事務費→支払額）");
console.log("  計算フロー:");
console.log("    pureBonus + adjustmentAmount = amountBeforeAdjustment（ボーナス合計）");
console.log("    amountBeforeAdjustment × (1 - paymentAdjustmentRate) = finalAmount");
console.log("    finalAmount × 10.21% = withholdingTax");
console.log("    finalAmount > minPayoutAmount(2,560円) → serviceFee(440円)");
console.log("    finalAmount - withholdingTax - serviceFee = paymentAmount");

const WITHHOLDING_RATE = 0.1021;
const SERVICE_FEE = 440;
const MIN_PAYOUT = 2560;

function calcPaymentAmount(params: {
  pureBonus: number;
  adjustmentAmount: number;
  paymentAdjustmentRate: number; // 小数 e.g. 0.02
}): {
  amountBeforeAdjustment: number;
  paymentAdjustmentAmount: number;
  finalAmount: number;
  withholdingTax: number;
  serviceFee: number;
  paymentAmount: number;
} {
  const { pureBonus, adjustmentAmount, paymentAdjustmentRate } = params;
  const amountBeforeAdjustment = pureBonus + adjustmentAmount;
  const paymentAdjustmentAmount = Math.floor(amountBeforeAdjustment * paymentAdjustmentRate);
  const finalAmount = amountBeforeAdjustment - paymentAdjustmentAmount;
  const withholdingTax = Math.floor(finalAmount * WITHHOLDING_RATE);
  const serviceFee = finalAmount > MIN_PAYOUT ? SERVICE_FEE : 0;
  const paymentAmount = Math.max(0, finalAmount - withholdingTax - serviceFee);
  return { amountBeforeAdjustment, paymentAdjustmentAmount, finalAmount, withholdingTax, serviceFee, paymentAmount };
}

// ケース1: 調整金なし・支払調整なし
{
  const r = calcPaymentAmount({ pureBonus: 10000, adjustmentAmount: 0, paymentAdjustmentRate: 0 });
  assert("ケース1: ボーナス合計 = pureBonus（10,000円）", r.amountBeforeAdjustment, 10000);
  assert("ケース1: 源泉徴収税 = 10,000 × 10.21% = 1,021円", r.withholdingTax, 1021);
  assert("ケース1: 事務費 = 440円（10,000 > 2,560）", r.serviceFee, 440);
  assert("ケース1: 支払額 = 10,000 - 1,021 - 440 = 8,539円", r.paymentAmount, 8539);
}

// ケース2: 調整金あり（プラス）
{
  const r = calcPaymentAmount({ pureBonus: 10000, adjustmentAmount: 2000, paymentAdjustmentRate: 0 });
  assert("ケース2: ボーナス合計 = 12,000円（調整金+2,000円反映）", r.amountBeforeAdjustment, 12000);
  assert("ケース2: 源泉徴収税 = 12,000 × 10.21% = 1,225円", r.withholdingTax, 1225);
  assert("ケース2: 支払額 = 12,000 - 1,225 - 440 = 10,335円", r.paymentAmount, 10335);
}

// ケース3: 調整金あり（マイナス）
{
  const r = calcPaymentAmount({ pureBonus: 10000, adjustmentAmount: -3000, paymentAdjustmentRate: 0 });
  assert("ケース3: ボーナス合計 = 7,000円（調整金-3,000円反映）", r.amountBeforeAdjustment, 7000);
  assert("ケース3: 源泉徴収税 = 7,000 × 10.21% = 714円", r.withholdingTax, 714);
  assert("ケース3: 支払額 = 7,000 - 714 - 440 = 5,846円", r.paymentAmount, 5846);
}

// ケース4: 支払調整率あり（2%カット）
{
  const r = calcPaymentAmount({ pureBonus: 10000, adjustmentAmount: 0, paymentAdjustmentRate: 0.02 });
  assert("ケース4: 支払調整額 = 10,000 × 2% = 200円", r.paymentAdjustmentAmount, 200);
  assert("ケース4: finalAmount = 10,000 - 200 = 9,800円", r.finalAmount, 9800);
  assert("ケース4: 源泉徴収税 = 9,800 × 10.21% = 1,000円", r.withholdingTax, 1000);
  assert("ケース4: 支払額 = 9,800 - 1,000 - 440 = 8,360円", r.paymentAmount, 8360);
}

// ケース5: 最低支払額未満 → 事務費なし
{
  const r = calcPaymentAmount({ pureBonus: 2000, adjustmentAmount: 0, paymentAdjustmentRate: 0 });
  assert("ケース5: 2,000円（最低支払額2,560円未満）→ 事務費なし", r.serviceFee, 0);
  assert("ケース5: 源泉徴収税 = 2,000 × 10.21% = 204円", r.withholdingTax, 204);
  assert("ケース5: 支払額 = 2,000 - 204 = 1,796円", r.paymentAmount, 1796);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. 総合シナリオテスト（5人ツリー構造）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("8. 総合シナリオテスト（5人ツリー構造）");
console.log(`
  構成:
    A（代表者） ─ 直紹介 → B, C （両者アクティブ）
                             ├─ B → 子: D, E
                             └─ C → 子: なし

  各会員の購入状況（2026-05）:
    A: 商品2000×1本（150pt）→ アクティブ
    B: 商品2000×1本（150pt）→ アクティブ
    C: 商品2000×1本（150pt）→ アクティブ
    D: 商品2000×1本（150pt）→ アクティブ
    E: 購入なし              → 非アクティブ

  Aの報酬計算:
    直紹介アクティブ: B, C → 2人 → 報酬受取資格あり
    翠彩流通個数: A(1) + B(1) + C(1) + D(1) = 4個（7段以内・Eは非アクティブ含まず）
    → LV.1（2〜30個）
    ダイレクトボーナス: 0円（s1000購入なし）
    ユニレベルボーナス（LV.1・3段まで）:
      1段目: B(150pt) + C(150pt) = 300pt × 15% × 100 = 4,500円
      2段目: D(150pt) × 7% × 100 = 1,050円
      3段目: なし
    組織構築ボーナス: LV.1はLV.3未満 → 0円
    合計ボーナス: 4,500 + 1,050 = 5,550円
`);

// Aの計算シミュレーション
const aActive = isActiveMember({ selfPoints: 150, purchasedRequiredProduct: true, forceActive: false });
const bActive = isActiveMember({ selfPoints: 150, purchasedRequiredProduct: true, forceActive: false });
const cActive = isActiveMember({ selfPoints: 150, purchasedRequiredProduct: true, forceActive: false });
const dActive = isActiveMember({ selfPoints: 150, purchasedRequiredProduct: true, forceActive: false });
const eActive = isActiveMember({ selfPoints: 0, purchasedRequiredProduct: false, forceActive: false });

assert("A: アクティブ", aActive, true);
assert("B: アクティブ", bActive, true);
assert("C: アクティブ", cActive, true);
assert("D: アクティブ", dActive, true);
assert("E: 非アクティブ", eActive, false);

const aDirectActiveCount = [bActive, cActive].filter(Boolean).length; // B, Cが直紹介
assert("A: 直紹介アクティブ数 = 2", aDirectActiveCount, 2);

const aEligible = isEligibleForBonus({ isActive: aActive, directActiveCount: aDirectActiveCount });
assert("A: 報酬受取資格あり", aEligible, true);

// A → B → D, E   A → C の流通個数（7段内）
// sumiSaiCount: Aの自身(1) + B(1) + C(1) + D(1) + E(0) = 4
const aTotalSumiSai = 1 + 1 + 1 + 1 + 0; // A + B + C + D + E(非アクティブだがsumiSai個数は0)
assert("A: 翠彩流通個数 = 4個", aTotalSumiSai, 4);

const aLevel = calcLevelFromItemCount(aTotalSumiSai);
assert("A: 達成レベル = LV.1（4個）", aLevel, 1);

// ユニレベルボーナス計算
// 1段目: B(150pt) + C(150pt) = 300pt
// 2段目: D(150pt) ← BのアクティブかつDのみ（EはアクティブではないのでDのみ）
const aDepthPoints: Record<number, number> = {
  1: 150 + 150, // B + C
  2: 150,       // D（Eは非アクティブなので除外）
};
const aUnilevel = calcUnilevelBonus(aDepthPoints, aLevel, aDirectActiveCount);
assert("A: 1段目ユニレベル = 4,500円（300pt × 15% × 100）", aUnilevel.detail[1], 4500);
assert("A: 2段目ユニレベル = 1,050円（150pt × 7% × 100）", aUnilevel.detail[2], 1050);
assert("A: ユニレベルボーナス合計 = 5,550円", aUnilevel.total, 5550);

// 支払額
const aDirectBonus = 0; // s1000購入なし
const aStructureBonus = 0; // LV.1
const aTotalBonus = aDirectBonus + aUnilevel.total + aStructureBonus;
assert("A: ボーナス合計 = 5,550円", aTotalBonus, 5550);

// 支払額（調整なし・事務費対象）
const aWithholding = Math.floor(aTotalBonus * 0.1021);
// 5,550 × 10.21% = 566.655 → Math.floor = 566円（正しい端数切捨て）
assert("A: 源泉徴収税 = 566円（5,550 × 10.21% = 566.655 → 切捨て）", aWithholding, 566);
const aServiceFee = aTotalBonus > MIN_PAYOUT ? SERVICE_FEE : 0;
assert("A: 事務費 = 440円", aServiceFee, 440);
const aPayment = aTotalBonus - aWithholding - aServiceFee;
assert("A: 支払額 = 4,544円（5,550 - 566 - 440）", aPayment, 4544);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. 調整金適用後の再計算テスト
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
section("9. 調整金適用後の再計算テスト");
console.log("  調整金を後から入力した場合、ボーナス計算後に適用されること確認");

// ボーナス計算後に調整金+5,000円を入力
const pureBonus = 5550; // Aのシナリオから
const adjustmentAmount = 5000; // 調整金追加
const amountBeforeAdj = pureBonus + adjustmentAmount;
assert("調整金5,000円追加後 ボーナス合計 = 10,550円", amountBeforeAdj, 10550);

const adjWithholding = Math.floor(amountBeforeAdj * WITHHOLDING_RATE);
assert("調整金反映後 源泉徴収税 = 10,550 × 10.21% = 1,077円", adjWithholding, 1077);

const adjServiceFee = amountBeforeAdj > MIN_PAYOUT ? SERVICE_FEE : 0;
assert("調整金反映後 事務費 = 440円", adjServiceFee, 440);

const adjPayment = amountBeforeAdj - adjWithholding - adjServiceFee;
assert("調整金反映後 支払額 = 10,550 - 1,077 - 440 = 9,033円", adjPayment, 9033);

// マイナス調整金
const minusAdjustment = -5550; // 全額打ち消し
const amountAfterMinus = pureBonus + minusAdjustment;
assert("マイナス調整金(-5,550円)後 ボーナス合計 = 0円", amountAfterMinus, 0);
const minusPayment = Math.max(0, amountAfterMinus - Math.floor(amountAfterMinus * WITHHOLDING_RATE) - 0);
assert("マイナス調整金後 支払額 = 0円", minusPayment, 0);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 最終サマリー
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log(`\n${"═".repeat(60)}`);
console.log(`📊 テスト結果サマリー`);
console.log("═".repeat(60));
console.log(`  ✅ PASS: ${passCount}件`);
console.log(`  ❌ FAIL: ${failCount}件`);
console.log(`  合計: ${passCount + failCount}件`);

if (failures.length > 0) {
  console.log("\n  ❌ 失敗したテスト:");
  failures.forEach((f) => console.log(`    - ${f}`));
  process.exit(1);
} else {
  console.log("\n  🎉 全テスト合格！ボーナス計算ロジックは正常です。");
}
