# VIOLA Pure 福利厚生ポータル

VIOLA Pure株式会社の福利厚生・MLM管理システム

## 🚀 本番環境

- **本番URL**: https://www.viola-pure.xyz
- **管理画面**: https://www.viola-pure.xyz/admin
- **デプロイ**: Vercel自動デプロイ（main branch）
- **GitHub**: https://github.com/VP0358/benefits-portal

## 📋 実装済み機能

### ✅ MLM管理機能（完全実装）
- **MLM会員管理**: 会員一覧、詳細編集、オートシップ設定、支払方法管理
- **MLM会員新規登録**: フルスペック登録フォーム（会員区分、ステータス、個人情報、銀行情報、組織階層、オートシップ設定、郵便番号自動住所補完）
  - **支払い方法**: クレジットカード（クレディックス）、口座振替（三菱UFJファクター）、銀行振込の3種類対応
- **MLM組織図・リスト**: 
  - 会員コード検索、マトリックス/ユニレベル切替
  - ツリー表示（最大5階層、循環参照対策）
  - リスト表示（フラットテーブル、レベル・ステータスバッジ）
  - ダウンライン一覧レポート（CSV出力）
  - 購入履歴集計レポート（CSV出力）
  - 紹介実績積算レポート（期間・ソートタイプ選択、CSV出力）
- **商品購入管理**:
  - 5つの主要機能タブ（購入入力、購入一覧、ステータス別検索、商品別一覧、購入者別一覧）
  - 商品購入入力（商品コード選択、年月・数量・金額・ポイント入力）
  - 購入一覧（商品コード別・月別集計、数量/金額/ポイント表示）
  - ステータス別検索（オートシップ/定期購入/入会時等/キャンセル/欠品/欠品欠1/社販/その他）
  - 商品別購入一覧（商品ID・期間指定、注文ID・氏名・会員コード・数量・金額・ポイント）
  - 購入者別記録一覧（会員ID・期間指定、注文確認日・商品・数量・金額）
  - CSV一括出力（各タブ別、Excel対応BOM付きUTF-8）
- **受注・発送状況管理**:
  - 検索フィルター（注文日範囲、会員コード、ステータス、配送方法、商品検索）
  - 一覧表示（注文情報、会員情報、商品明細、配送情報）
  - 編集機能（ステータス、配送業者、追跡番号、発送ステータス更新）
  - CSV出力（検索条件対応、Excel互換BOM付き）
  - PDF発送ラベル生成（注文番号、配送先、差出人、商品明細）
  - 発送完了処理（ワンクリック発送済み更新）
  - 注文削除機能（確認ダイアログ付き）
- **発送伝票管理（完全実装）**:
  - **検索フィルター**: 発送日、到着日、入会日、受注方法（手書/ハガキ/通常/海外）、配達番号指定、配送希望日指定、記録(伝票)番号
  - **クイック入力**: 生年月日(西暦/令和)、受注方法、配達方法、配送希望日、記録番号
  - **注文者情報**: 会員ID、法人名、法人代表者、注文者名・電話番号・FAX、生年月日、初回接触方法、お客様ランク（連続/定期/その他/会員/カード/準会員/コンビニ/その他配達）
  - **配送先情報**: 配送先名、法人名、電話番号、FAX、郵便番号、住所、配送センター（手渡し/第14Bigセンター/第2Bigセンター）、配送業者、配達時間（午前中/12-14時/14-16時等）
  - **配送オプション**: 配達方法（金券/手渡し/オートシップ/クーリング・オフ/交換/キャンセル/他発注/合わせ予約/追加/社員配達/Web/プレゼント/中途解約）、オートシップNo、金券番号、追跡番号
  - **商品明細テーブル**: 商品コード・品名・単価・数量・ポイント・ポイント小計・小計、商品追加・削除機能
  - **自動計算**: 小計(税抜)、小計(10%)、内訳、ポイント合計
  - **操作機能**: 伝票作成、編集、削除（確認ダイアログ）、PDF印刷、CSV出力（Excel対応BOM付きUTF-8）
  - **マスタデータ**: 配達方法14種、お客様ランク8種、受注方法4種、配達時間14種、配送センター4種
- **ボーナス一覧**: 月別合計表示、CSV出力（2025年9月〜2026年2月）
- **ボーナス計算処理**: 
  - 調整金・過不足金CRUD（手動入力・Excel一括アップロード）
  - 貯金ボーナス設定編集（登録時・オートシップ・ボーナス率）
  - ボーナス計算実行・削除機能
- **ボーナス計算結果**:
  - 取得者一覧（30+項目：ダイレクトB、ユニレベルB、ランクアップB、シェアB、組織構築B、貯金B、繰越金、調整金、支払調整前取得額、調整率、取得額合計、税金、手数料、支払額、グループデータ、レベル情報等）
  - 支払対象者一覧
  - CAP調整計算
  - CSV一括出力
- **ボーナス関連レポート**:
  - Webフリコム形式データ出力（固定長120文字）
  - レベル昇格・降格者一覧
  - 繰越金リスト
  - 調整金リスト
- **ボーナスユーティリティ**:
  - 支払調書PDF作成（A4を4分割、A6フォーマット）
  - 購入一覧（商品別月別集計）
  - ボーナス明細書備考入力
  - 貯金B入力内容一覧
  - 更新履歴テーブル
- **商品管理**: 商品一覧、詳細編集
- **注文管理**: 注文一覧、詳細確認
- **発送伝票管理**: 発送ラベル作成、一覧管理

### ✅ 携帯契約管理機能
- **VP未来phone申し込み**: 新規申込受付
- **携帯契約一覧**: 契約状態管理
- **紹介者報酬計算**: 月次報酬計算
- **紹介者変更履歴**: 変更履歴追跡

### ✅ 旅行サブスク管理機能
- **旅行サブスク一覧**: サブスク契約管理

### ✅ データエクスポート機能
- **CSV/振込データ出力**:
  - MLM会員CSV
  - ボーナス取得者CSV
  - 携帯契約CSV
  - 旅行サブスクCSV
  - Credix決済CSV（クレジットカード）
  - 三菱UFJファクター決済CSV（口座振替）
  - Webフリコム振込データ（固定長120文字）

### ✅ PDF生成機能
- **会員登録完了通知PDF**: 会員情報、契約日、紹介者、口座情報、ログイン情報
- **納品書PDF**: 注文番号、購入者情報、商品明細、送料、税金内訳、合計金額
- **支払調書PDF**: A4を4分割（A6フォーマット）、印刷対象選択可能

### ✅ UI/UX改善
- **サイドバーデザイン刷新**: ダークグレー、グループ化、FontAwesomeアイコン、未読バッジ
- **統合ダッシュボード**: タブ化（MLM、携帯契約、旅行サブスク、データエクスポート、その他）

## 🗄️ データベーススキーマ

### 新規追加テーブル
- `bonus_adjustments`: 調整金管理
- `bonus_shortage_payments`: 過不足金管理
- `savings_bonus_config`: 貯金ボーナス設定履歴

### 拡張テーブル・Enum
- `bonus_runs`: CAP調整額追加
- `bonus_results`: 30+項目追加（強制レベル、条件、貯金ポイント等）
- `mlm_members`: 調整金・過不足金リレーション、銀行情報、法人情報、個人情報拡張
- `Product`: 商品コード（code）追加
- `PurchaseStatus`: ステータス拡張（out_of_stock, out_of_stock_minus_1, company_sale, other追加）

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15.2.9 (App Router)
- **UI**: TailwindCSS, FontAwesome, Lucide React
- **認証**: NextAuth.js v5
- **データベース**: PostgreSQL (Neon)
- **ORM**: Prisma 7.6.0
- **PDF生成**: jsPDF, jspdf-autotable, PDFKit
- **デプロイ**: Vercel (hnd1リージョン)

## 📁 ディレクトリ構成

```
app/
├── admin/                      # 管理画面
│   ├── bonus-summary/          # ボーナス一覧
│   ├── bonus-process/          # ボーナス計算処理
│   ├── bonus-results/          # ボーナス計算結果
│   ├── bonus-reports/          # ボーナス関連レポート
│   ├── bonus-utilities/        # ボーナスユーティリティ
│   ├── mlm-members/            # MLM会員管理
│   ├── mlm-members/new/        # MLM会員新規登録
│   ├── mlm-organization/       # MLM組織図・リスト
│   ├── products/               # 商品管理
│   ├── product-purchases/      # 商品購入管理
│   ├── orders/                 # 注文管理
│   ├── orders-shipping/        # 受注・発送状況
│   ├── contracts/              # 携帯契約管理
│   ├── travel-subscriptions/   # 旅行サブスク管理
│   └── export/                 # データエクスポート
├── api/                        # APIエンドポイント
│   └── admin/
│       ├── bonus-adjustments/  # 調整金API（CRUD、一括アップロード）
│       ├── bonus-shortages/    # 過不足金API（CRUD、一括アップロード）
│       ├── bonus-results/      # ボーナス結果詳細API
│       ├── bonus-reports/      # レポート生成API
│       ├── savings-bonus-config/ # 貯金B設定API
│       ├── mlm-members/        # MLM会員管理API
│       ├── mlm-organization/   # 組織ツリー・レポートAPI
│       ├── product-purchases/  # 商品購入管理API（入力、検索、CSV出力）
│       ├── orders-shipping/    # 受注・発送管理API（CRUD、CSV、PDF）
│       ├── pdf/                # PDF生成API
│       └── export/             # CSV/振込データ出力API
prisma/
├── schema.prisma               # データベーススキーマ
└── migrations/                 # マイグレーションファイル
```

## 🚢 デプロイ手順

### Vercel自動デプロイ
```bash
git add .
git commit -m "機能実装"
git push origin main
# → Vercel自動デプロイ（3-5分）
```

### マイグレーション実行（初回デプロイ時）
```bash
npx prisma migrate deploy
```

## 📝 開発ガイド

### ローカル開発
```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# DATABASE_URL, NEXTAUTH_SECRET 等を設定

# マイグレーション実行
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

### データベース操作
```bash
# Prisma Studio起動
npx prisma studio

# スキーマ反映
npx prisma generate

# マイグレーション作成
npx prisma migrate dev --name migration_name
```

## 📊 最新コミット履歴

- `3523565` 🔧 Security Fix: Next.js 15.2.9にアップグレード (CVE-2025-66478修正)
- `3505211` 📝 README更新: 最新コミット履歴
- `a18c61a` 🔧 Critical Fix: PrismaClient共通インスタンス使用に修正
- `3608436` 📝 DEPLOYMENT_GUIDE更新: Prisma migrate説明を修正
- `51be401` 🔧 Fix: vercel-buildコマンドを削除（Prisma migrate問題修正）
- `4b52740` 🔧 Ultimate Fix: revalidate設定追加 & Vercel最適化
- `93522e0` 🔧 Critical Fix: dynamic設定の位置修正 & Next.js 15.1.8にアップグレード

## 🔧 環境変数

```env
# データベース
DATABASE_URL="postgresql://..."

# 認証
NEXTAUTH_URL="https://www.viola-pure.xyz"
NEXTAUTH_SECRET="..."

# AWS S3（画像アップロード用）
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="ap-northeast-1"
AWS_S3_BUCKET_NAME="..."

# メール送信（Resend）
RESEND_API_KEY="..."
```

## 📞 サポート

問題や質問がある場合は、GitHubのIssueを作成してください。

## 📄 ライセンス

Copyright © 2026 VIOLA Pure株式会社. All rights reserved.
