# ⚠️ データベースマイグレーション必須

## 🔄 Prismaスキーマの変更内容

以下のフィールドとEnumが追加されました：

### 1. 新しいEnum型

#### `PaymentMethod`（支払い方法）
```prisma
enum PaymentMethod {
  credit_card    // クレジットカード（クレディックス）
  bank_transfer  // 口座振替（三菱UFJファクター）
  bank_payment   // 銀行振込
}
```

#### `PurchaseStatus`（購入ステータス）
```prisma
enum PurchaseStatus {
  autoship       // オートシップ
  one_time       // 都度購入
  new_member     // 新規登録者
  cooling_off    // クーリングオフ
  canceled       // キャンセル
}
```

### 2. MlmMemberテーブルの変更

```prisma
model MlmMember {
  // 追加フィールド:
  autoshipStartDate DateTime?           // オートシップ開始日（新規）
  paymentMethod     PaymentMethod @default(credit_card)  // 支払い方法（新規）
  
  // 既存フィールドは変更なし
}
```

### 3. MlmPurchaseテーブルの変更

```prisma
model MlmPurchase {
  // 追加フィールド:
  purchaseStatus  PurchaseStatus @default(one_time)  // 購入ステータス（新規）
  
  // 新しいインデックス:
  @@index([purchaseStatus])
}
```

---

## 🚀 マイグレーション実行手順（本番環境）

### ⚠️ 重要: Vercelでのデプロイ前に必須

Vercelにデプロイする前に、以下のマイグレーション手順を実行してください：

### ステップ1: ローカルでマイグレーションファイル生成

```bash
cd /path/to/benefits-portal
npx prisma migrate dev --name add_payment_and_purchase_status
```

これにより `prisma/migrations/` ディレクトリに新しいマイグレーションファイルが作成されます。

### ステップ2: 本番データベースに適用

```bash
npx prisma migrate deploy
```

または、Vercelのデプロイ時に自動実行されるように `package.json` の `postinstall` スクリプトを確認：

```json
{
  "scripts": {
    "postinstall": "prisma generate || true"
  }
}
```

以下のように変更すると、デプロイ時に自動マイグレーションされます（推奨しません）：

```json
{
  "scripts": {
    "postinstall": "prisma generate && prisma migrate deploy || true"
  }
}
```

### ステップ3: Prisma Clientの再生成

```bash
npx prisma generate
```

---

## 🔧 既存データの更新（必要に応じて）

マイグレーション後、既存の `MlmMember` レコードにデフォルト値が設定されます：

- `paymentMethod`: `credit_card`（クレジットカード）
- `autoshipStartDate`: `NULL`

既存の `MlmPurchase` レコードにデフォルト値が設定されます：

- `purchaseStatus`: `one_time`（都度購入）

### 既存会員の支払い方法を一括更新する場合

```sql
-- 例: 口座情報が登録されている会員を口座振替に変更
UPDATE mlm_members 
SET payment_method = 'bank_transfer'
WHERE id IN (
  SELECT m.id 
  FROM mlm_members m
  JOIN users u ON m.user_id = u.id
  JOIN mlm_registrations r ON u.id = r.user_id
  WHERE r.bank_account_number IS NOT NULL
);
```

---

## 📋 新機能

### 1. クレディックス決済CSV出力
- **URL**: `/api/admin/export/credix-payment?month=YYYY-MM`
- **条件**: オートシップ有効 AND 支払い方法がクレジットカード AND 休止月ではない
- **管理画面**: `/admin/export` → 💳 クレディックス タブ

### 2. 三菱UFJファクター口座振替CSV出力
- **URL**: `/api/admin/export/mufg-payment?month=YYYY-MM`
- **条件**: オートシップ有効 AND 支払い方法が口座振替 AND 休止月ではない
- **管理画面**: `/admin/export` → 🏦 三菱UFJ タブ

---

## ✅ 確認事項

マイグレーション完了後、以下を確認してください：

1. **Prisma Studioで確認**
   ```bash
   npx prisma studio
   ```
   - `MlmMember` テーブルに `paymentMethod` フィールドがあるか
   - `MlmPurchase` テーブルに `purchaseStatus` フィールドがあるか

2. **本番環境で確認**
   - https://www.viola-pure.xyz/admin/export にアクセス
   - 💳 クレディックス タブと 🏦 三菱UFJ タブが表示されるか
   - 対象月を選択してCSVダウンロードが動作するか

---

## ⚠️ トラブルシューティング

### エラー: `Unknown argument: paymentMethod`

**原因**: Prisma Clientが再生成されていない

**解決策**:
```bash
npx prisma generate
npm run build
```

### エラー: `Column 'payment_method' does not exist`

**原因**: マイグレーションが適用されていない

**解決策**:
```bash
npx prisma migrate deploy
```

---

## 📞 サポート

マイグレーションに問題がある場合は、以下の情報を含めて連絡してください：

1. エラーメッセージ（全文）
2. 実行したコマンド
3. Neonダッシュボードのスキーマ状態

---

**最終更新日**: 2026-04-08  
**バージョン**: 2.0.0 - 支払い方法・購入ステータス追加
