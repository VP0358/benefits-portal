# ボーナス管理機能 - データベースマイグレーションガイド

## 📋 変更内容

### 新規テーブル

#### 1. `bonus_adjustments` - ボーナス調整金
手動で入力する調整金を管理します。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | BigInt | 主キー |
| bonusRunId | BigInt | ボーナス計算実行ID |
| mlmMemberId | BigInt | MLM会員ID |
| amount | Int | 調整金額（円） |
| comment | String | コメント |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

#### 2. `bonus_shortage_payments` - ボーナス過不足金（源泉対象外）
過不足金を管理します。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | BigInt | 主キー |
| bonusRunId | BigInt | ボーナス計算実行ID |
| mlmMemberId | BigInt | MLM会員ID |
| amount | Int | 過不足金額（円） |
| comment | String | コメント |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

#### 3. `savings_bonus_config` - 貯金ボーナス設定
貯金ボーナスの計算率を管理します。

| カラム | 型 | デフォルト | 説明 |
|--------|-----|-----------|------|
| id | Int | - | 主キー |
| registrationRate | Float | 20.0 | 登録時の貯金率（%） |
| autoshipRate | Float | 5.0 | オートシップ時の貯金率（%） |
| bonusRate | Float | 3.0 | ボーナス取得時の貯金率（%） |
| updatedAt | DateTime | - | 更新日時 |
| createdAt | DateTime | - | 作成日時 |

### テーブル変更

#### 1. `bonus_runs` - ボーナス計算実行
**追加カラム:**
- `paymentAdjustmentRate` (Float): 支払い調整率（%）

#### 2. `bonus_results` - ボーナス計算結果
**追加カラム:**
- `rankUpBonus` (Int): ランクアップボーナス
- `shareBonus` (Int): シェアボーナス
- `carryoverAmount` (Int): 繰越金
- `adjustmentAmount` (Int): 調整金
- `otherPositionAmount` (Int): 他ポジション
- `amountBeforeAdjustment` (Int): 支払調整前取得額
- `paymentAdjustmentRate` (Float): 支払調整率（%）
- `paymentAdjustmentAmount` (Int): 支払調整額
- `finalAmount` (Int): 取得額（調整後）
- `consumptionTax` (Int): 10%消費税（内税）
- `withholdingTax` (Int): 源泉所得税
- `shortageAmount` (Int): 過不足金
- `otherPositionShortage` (Int): 他ポジション過不足金
- `serviceFee` (Int): 事務手数料
- `paymentAmount` (Int): 支払額
- `groupActiveCount` (Int): グループACT
- `minLinePoints` (Int): 最小系列pt
- `lineCount` (Int): 系列数
- `level1Lines` (Int): LV.1達成系列数
- `level2Lines` (Int): LV.2達成系列数
- `level3Lines` (Int): LV.3達成系列数
- `forceLevel` (Int): 強制レベル
- `conditionMet` (Boolean): 条件達成

## 🚀 マイグレーション手順

### ローカル環境

```bash
# 1. マイグレーションファイル生成
npx prisma migrate dev --name add_bonus_management_features

# 2. Prisma Clientの再生成
npx prisma generate
```

### 本番環境（Vercel）

```bash
# Vercelの環境変数に DATABASE_URL が設定されていることを確認

# 1. 本番データベースにマイグレーション適用
npx prisma migrate deploy

# 2. Vercelに再デプロイ（自動で prisma generate が実行される）
git push origin main
```

## 📝 初期データのセットアップ

### 貯金ボーナス設定のデフォルト値を登録

```sql
INSERT INTO savings_bonus_config (
  registrationRate, 
  autoshipRate, 
  bonusRate, 
  "createdAt", 
  "updatedAt"
) VALUES (
  20.0,  -- 登録時: 20%
  5.0,   -- オートシップ: 5%
  3.0,   -- ボーナス: 3%
  NOW(),
  NOW()
);
```

または、Prismaを使用：

```typescript
await prisma.savingsBonusConfig.create({
  data: {
    registrationRate: 20.0,
    autoshipRate: 5.0,
    bonusRate: 3.0
  }
});
```

## ⚠️ 注意事項

1. **既存データへの影響**: 新しいカラムはすべてデフォルト値が設定されているため、既存のデータには影響ありません。
2. **NULL許容**: `paymentAdjustmentRate`、`forceLevel` は NULL 許容です。
3. **リレーション**: `bonus_runs`、`mlm_members` との外部キー制約が設定されています。
4. **インデックス**: `bonusRunId`、`mlmMemberId` にインデックスが作成されます。

## 🔄 ロールバック

万が一問題が発生した場合：

```bash
# 最後のマイグレーションをロールバック
npx prisma migrate resolve --rolled-back <migration-name>
```
