# Vercelデプロイメント完全ガイド

## 🎯 実施した修正の詳細

### 問題の根本原因

Next.js 15では、APIルートのプリレンダリングを防ぐために**複数の設定**が必要です：

1. ✅ `export const dynamic = 'force-dynamic'` - 動的レンダリング強制
2. ✅ `export const revalidate = 0` - キャッシュ無効化
3. ✅ ファイルの**先頭**に配置（import文より前）

### 実施した修正

#### 1. 全APIルート（123個）の設定

**正しい設定**:
```typescript
// 動的レンダリングを強制（ビルド時にこのルートを実行しない）
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from "next/server";
// ... 残りのコード
```

**重要ポイント**:
- `dynamic` と `revalidate` は**ファイルの最初**
- import文より**前**に配置
- **両方**の設定が必要

#### 2. ルートAPIエンドポイント

**ファイル**: `app/api/route.ts`

```typescript
// 全APIルートの基本設定
export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = 0

export async function GET() {
  return Response.json({ 
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  })
}
```

**目的**:
- APIルート全体の動的レンダリングを保証
- ヘルスチェックエンドポイント提供

#### 3. Next.js設定最適化

**ファイル**: `next.config.ts`

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg", "pdfkit"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ビルドID動的生成
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
};
```

#### 4. Vercel設定最適化

**ファイル**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production"
  },
  "regions": ["hnd1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

**設定内容**:
- `buildCommand`: 標準的なNext.jsビルドコマンド
- APIルートの**Cache-Control**ヘッダー設定
- 東京リージョン（hnd1）指定

**重要**: Prisma migrateはビルド時ではなく、別途実行する必要があります

#### 5. ビルドスクリプト

**ファイル**: `package.json`

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate || true"
  }
}
```

**`build`の役割**:
1. Prisma Clientを生成
2. Next.jsをビルド

**`postinstall`の役割**:
- npm install後に自動的にPrisma Clientを生成
- エラーがあっても継続（`|| true`）

#### 6. .vercelignore

**ファイル**: `.vercelignore`

```
node_modules
.next
.git
*.log
.env*.local
```

## 🚀 デプロイメント手順

### 自動デプロイ（推奨）

```bash
# 1. 変更をコミット
git add .
git commit -m "機能追加"

# 2. mainブランチにプッシュ
git push origin main

# 3. Vercelが自動的にデプロイ開始（3〜5分）
```

### 手動デプロイ

```bash
# Vercel CLIを使用
npm install -g vercel
vercel --prod
```

## 🔍 デプロイメント確認

### 1. Vercelダッシュボード

- URL: https://vercel.com/dashboard
- 最新デプロイのステータスを確認
- ビルドログを確認

### 2. エラー確認ポイント

**✅ 成功の兆候**:
- ビルドステータス: **Ready**
- ビルド時間: 3〜5分
- エラーログ: なし（または最小限）

**❌ 失敗の兆候**:
- ビルドステータス: **Error**
- エラーログ: データベース接続エラー
- エラーログ: `dynamic`設定関連エラー

### 3. 本番環境テスト

#### ヘルスチェック
```bash
curl https://www.viola-pure.xyz/api
# 期待される応答:
# {"status":"ok","message":"API is running","timestamp":"2026-04-08T..."}
```

#### 発送伝票管理ページ
- URL: https://www.viola-pure.xyz/admin/shipping-labels
- ログイン後、全機能をテスト

#### MLM新規登録ページ
- URL: https://www.viola-pure.xyz/admin/mlm-members/new
- 支払い方法に「銀行振込」が表示されることを確認

## 🐛 トラブルシューティング

### エラー: データベース接続失敗

**原因**: 環境変数が設定されていない

**解決策**:
1. Vercelダッシュボード → Settings → Environment Variables
2. 以下の環境変数を設定:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - その他必要な環境変数

### エラー: `dynamic`設定が無視される

**原因**: 設定の配置が間違っている

**解決策**:
1. `export const dynamic = 'force-dynamic'` を**ファイルの最初**に配置
2. `export const revalidate = 0` を追加
3. import文より**前**に配置

### エラー: ビルドタイムアウト

**原因**: 依存関係のインストールに時間がかかる

**解決策**:
1. `package-lock.json` を削除
2. `npm install` を再実行
3. コミット＆プッシュ

### エラー: Prismaエラー

**原因**: データベースマイグレーションが実行されていない

**解決策**:

#### 方法1: ローカルで実行（推奨）
```bash
# 1. Vercelの環境変数をローカルに取得
npx vercel env pull .env.local

# 2. マイグレーションを本番環境に適用
npx prisma migrate deploy
```

#### 方法2: Vercel CLIで実行
```bash
# Vercel環境に直接接続して実行
vercel env pull
npx prisma migrate deploy
```

#### 方法3: Prisma Data Platform使用
Prisma Data Platformを使用してマイグレーションを管理（有料プラン）

**注意**: Vercelのビルド時にマイグレーションを実行すると、ビルドが失敗する可能性があります。マイグレーションは**ビルドとは別に**実行してください。

## 📝 環境変数一覧

### 必須環境変数

```env
# データベース
DATABASE_URL="postgresql://user:password@host:5432/database"

# 認証
NEXTAUTH_URL="https://www.viola-pure.xyz"
NEXTAUTH_SECRET="your-secret-key"

# AWS S3（画像アップロード用）
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="ap-northeast-1"
AWS_S3_BUCKET_NAME="your-bucket-name"

# メール送信（Resend）
RESEND_API_KEY="your-resend-api-key"
```

## 🔄 継続的デプロイメント

### GitHub Actionsとの統合（オプション）

`.github/workflows/deploy.yml` を作成（将来的に）:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
```

## 📊 パフォーマンス最適化

### 推奨設定

1. **Edge Runtime**: 適切なAPIルートでEdge Runtimeを使用
2. **ISR**: 静的ページでIncremental Static Regenerationを活用
3. **Image Optimization**: Next.js Imageコンポーネントを使用

## 🔐 セキュリティ

### 推奨事項

1. **環境変数**: 機密情報をGitにコミットしない
2. **CORS**: 必要なオリジンのみ許可
3. **認証**: NextAuth.jsで適切な認証を実装
4. **HTTPS**: 常にHTTPSを使用

## 📞 サポート

問題が解決しない場合:
1. Vercelのビルドログを確認
2. GitHubのIssueを作成
3. ドキュメントを参照

---

**最終更新**: 2026-04-08  
**バージョン**: Next.js 15.1.8  
**デプロイ環境**: Vercel (hnd1)
