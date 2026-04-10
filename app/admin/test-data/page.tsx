"use client";

import { useState } from "react";

export default function TestDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleGenerateMLMData = async () => {
    if (!confirm("30名のテストMLMアカウントを作成します。既存のテストデータは削除されます。よろしいですか？")) {
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/admin/test-data/mlm", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data.logs || `✅ ${data.count}名のテストデータを作成しました！\n\nトップリーダー: ${data.topLeader}\n\n📋 ログイン情報:\nメール: test001@viola-test.local ~ test030@viola-test.local\nパスワード: test1234`);
      } else {
        setResult(`❌ エラー: ${data.error}\n${data.details || ''}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setResult(`❌ エラーが発生しました: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProducts = async () => {
    if (!confirm("商品マスタ初期データ（5件）を投入します。よろしいですか？")) {
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/admin/products/seed", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        const resultText = data.results
          .map((r: any) => `${r.status === 'created' ? '✅' : '⏭️'} ${r.code} - ${r.name}: ${r.message}`)
          .join('\n');
        
        setResult(`${data.message}\n\n${resultText}`);
      } else {
        setResult(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setResult(`❌ エラーが発生しました: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-flask mr-2"></i>
          テストデータ管理
        </h1>
        <p className="mt-2 text-gray-600">
          開発・テスト用のダミーデータを生成・管理します
        </p>
      </div>

      {/* MLMテストデータ生成 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-users mr-2"></i>
          MLMテストアカウント生成
        </h2>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-blue-500 text-xl mr-3 mt-1"></i>
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-2">
                  30名のテストMLMアカウントを作成します
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 会員コード自動生成（6桁-枝番形式）</li>
                  <li>• マトリックス構造（1人の下に最大3人配置）</li>
                  <li>• 紹介関係の自動紐付け</li>
                  <li>• 銀行情報・住所情報付き</li>
                  <li>• ログイン情報: test001@viola-test.local ~ test030@viola-test.local / パスワード: test1234</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateMLMData}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                生成中...
              </>
            ) : (
              <>
                <i className="fas fa-play"></i>
                30名のMLMアカウント作成
              </>
            )}
          </button>
        </div>
      </div>

      {/* 商品マスタデータ投入 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-box mr-2"></i>
          商品マスタ初期データ投入
        </h2>
        
        <div className="space-y-4">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-start">
              <i className="fas fa-info-circle text-green-500 text-xl mr-3 mt-1"></i>
              <div>
                <p className="text-sm font-semibold text-green-800 mb-2">
                  商品マスタ初期データ（5件）を投入します
                </p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• 1000 - [新規]VIOLA Pure 翠彩-SUMISAI-</li>
                  <li>• 2000 - VIOLA Pure 翠彩-SUMISAI-</li>
                  <li>• 4000 - 出荷事務手数料</li>
                  <li>• 5000 - 概要書面1部</li>
                  <li>• s1000 - 登録料</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleSeedProducts}
            disabled={loading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                投入中...
              </>
            ) : (
              <>
                <i className="fas fa-database"></i>
                商品データ投入
              </>
            )}
          </button>
        </div>
      </div>

      {/* 実行結果 */}
      {result && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
            <i className="fas fa-terminal mr-2"></i>
            実行結果
          </h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}

      {/* 確認リンク */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-link mr-2"></i>
          確認リンク
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/mlm-members"
            className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <i className="fas fa-users text-blue-600 text-xl"></i>
            <div>
              <div className="font-semibold text-gray-800">MLM会員一覧</div>
              <div className="text-xs text-gray-600">作成したアカウントを確認</div>
            </div>
          </a>

          <a
            href="/admin/mlm-organization"
            className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <i className="fas fa-sitemap text-green-600 text-xl"></i>
            <div>
              <div className="font-semibold text-gray-800">組織図</div>
              <div className="text-xs text-gray-600">組織構造を確認</div>
            </div>
          </a>

          <a
            href="/admin/products"
            className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <i className="fas fa-box text-purple-600 text-xl"></i>
            <div>
              <div className="font-semibold text-gray-800">商品管理</div>
              <div className="text-xs text-gray-600">商品データを確認</div>
            </div>
          </a>

          <a
            href="/admin/bonus"
            className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <i className="fas fa-coins text-yellow-600 text-xl"></i>
            <div>
              <div className="font-semibold text-gray-800">報酬計算</div>
              <div className="text-xs text-gray-600">ボーナス計算を実行</div>
            </div>
          </a>
        </div>
      </div>
    </main>
  );
}
