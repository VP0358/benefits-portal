"use client";

import { useState, useEffect } from "react";

type OrgType = "matrix" | "unilevel";
type ViewMode = "tree" | "list";

type MemberNode = {
  id: string;
  memberCode: string;
  name: string;
  level: number;
  status: string;
  directDownlines?: MemberNode[];
  lastMonthPoints?: number;
  currentMonthPoints?: number;
};

export default function MlmOrganizationPage() {
  const [orgType, setOrgType] = useState<OrgType>("matrix");
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [searchCode, setSearchCode] = useState("");
  const [searchType, setSearchType] = useState<"memberCode" | "name" | "email" | "phone">("memberCode");
  const [loading, setLoading] = useState(false);
  const [rootMember, setRootMember] = useState<MemberNode | null>(null);
  const [listData, setListData] = useState<MemberNode[]>([]);

  // ダウンラインレポート用
  const [reportSearchCode, setReportSearchCode] = useState("");
  const [reportOrgType, setReportOrgType] = useState<OrgType>("matrix");
  
  // 購入レポート用
  const [purchaseSearchCode, setPurchaseSearchCode] = useState("");
  const [purchaseOrgType, setPurchaseOrgType] = useState<OrgType>("matrix");
  const [purchaseStartMonth, setPurchaseStartMonth] = useState("");
  const [purchaseEndMonth, setPurchaseEndMonth] = useState("");

  // 紹介実績積算用
  const [refStartDate, setRefStartDate] = useState("");
  const [refEndDate, setRefEndDate] = useState("");
  const [refSortType, setRefSortType] = useState("clean");

  const handleSearch = async () => {
    if (!searchCode) {
      alert("検索キーワードを入力してください");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        [searchType]: searchCode,
        type: orgType
      });
      
      const res = await fetch(
        `/api/admin/mlm-organization/tree?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        if (viewMode === "tree") {
          setRootMember(data.root);
        } else {
          setListData(data.list || []);
        }
      } else {
        alert("会員が見つかりませんでした");
        setRootMember(null);
        setListData([]);
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
      alert("エラーが発生しました");
    }
    setLoading(false);
  };

  const handleDownloadDownlineReport = async () => {
    if (!reportSearchCode) {
      alert("対象会員コードを入力してください");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/mlm-organization/downline-report?memberCode=${reportSearchCode}&type=${reportOrgType}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `downline_report_${reportSearchCode}_${reportOrgType}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        alert("ダウンロードしました");
      } else {
        alert("レポート生成に失敗しました");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("エラーが発生しました");
    }
  };

  const handleDownloadPurchaseReport = async () => {
    if (!purchaseSearchCode || !purchaseStartMonth || !purchaseEndMonth) {
      alert("すべての項目を入力してください");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/mlm-organization/purchase-report?memberCode=${purchaseSearchCode}&type=${purchaseOrgType}&startMonth=${purchaseStartMonth}&endMonth=${purchaseEndMonth}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `purchase_report_${purchaseSearchCode}_${purchaseStartMonth}_${purchaseEndMonth}.csv`;
        link.click();
        alert("ダウンロードしました");
      } else {
        alert("レポート生成に失敗しました");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("エラーが発生しました");
    }
  };

  const handleDownloadReferralReport = async () => {
    if (!refStartDate || !refEndDate) {
      alert("期間を入力してください");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/mlm-organization/referral-report?startDate=${refStartDate}&endDate=${refEndDate}&sortType=${refSortType}`
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `referral_report_${refStartDate}_${refEndDate}.csv`;
        link.click();
        alert("ダウンロードしました");
      } else {
        alert("レポート生成に失敗しました");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("エラーが発生しました");
    }
  };

  const renderTreeNode = (node: MemberNode, depth: number = 0): JSX.Element => {
    const indent = depth * 40;
    const hasChildren = node.directDownlines && node.directDownlines.length > 0;

    return (
      <div key={node.id} className="mb-2">
        <div
          className="flex items-center gap-3 p-3 bg-white rounded-lg shadow hover:shadow-md transition"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            {node.level}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-800">
              {node.memberCode} - {node.name}
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>
                ステータス:{" "}
                <span
                  className={
                    node.status === "active"
                      ? "text-green-600 font-semibold"
                      : "text-red-600"
                  }
                >
                  {node.status === "active" ? "アクティブ" : "非アクティブ"}
                </span>
              </div>
              {(node.lastMonthPoints !== undefined || node.currentMonthPoints !== undefined) && (
                <div className="flex gap-3 mt-1">
                  {node.lastMonthPoints !== undefined && (
                    <span className="text-purple-600 font-medium">
                      先月: {node.lastMonthPoints.toLocaleString()}pt
                    </span>
                  )}
                  {node.currentMonthPoints !== undefined && (
                    <span className="text-pink-600 font-medium">
                      今月: {node.currentMonthPoints.toLocaleString()}pt
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {hasChildren && (
            <div className="text-sm text-gray-600">
              <i className="fas fa-users mr-1"></i>
              {node.directDownlines!.length}名
            </div>
          )}
        </div>
        {hasChildren && (
          <div className="mt-2">
            {node.directDownlines!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          <i className="fas fa-sitemap mr-2"></i>
          組織図・リスト
        </h1>
        <p className="mt-2 text-gray-600">
          MLM組織のマトリックス・ユニレベル構造を表示します
        </p>
      </div>

      {/* 組織図表示 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-chart-tree mr-2"></i>
          組織図表示
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              検索タイプ
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as typeof searchType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="memberCode">会員コード</option>
              <option value="name">氏名</option>
              <option value="email">メールアドレス</option>
              <option value="phone">電話番号</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              検索キーワード
            </label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder={
                searchType === "memberCode" ? "例: 123456-01" :
                searchType === "name" ? "例: 山田太郎" :
                searchType === "email" ? "例: user@example.com" :
                "例: 090-1234-5678"
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              組織区分
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setOrgType("matrix")}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
                  orgType === "matrix"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                マトリックス
              </button>
              <button
                onClick={() => setOrgType("unilevel")}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
                  orgType === "unilevel"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ユニレベル
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              表示形式
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("tree")}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
                  viewMode === "tree"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ツリー
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
                  viewMode === "list"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                リスト
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
        >
          <i className="fas fa-search mr-2"></i>
          {loading ? "検索中..." : "組織図を表示"}
        </button>

        {/* 組織図表示エリア */}
        {viewMode === "tree" && rootMember && (
          <div className="mt-6">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-2">
                <i className="fas fa-info-circle mr-2"></i>
                {orgType === "matrix" ? "マトリックス組織図" : "ユニレベル組織図"}
              </h3>
              <p className="text-sm text-gray-600">
                {orgType === "matrix"
                  ? "直下のマトリックス配置を表示しています"
                  : "紹介ラインのユニレベル構造を表示しています"}
              </p>
            </div>
            {renderTreeNode(rootMember)}
          </div>
        )}

        {viewMode === "list" && listData.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 p-4 bg-green-50 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-2">
                <i className="fas fa-list mr-2"></i>
                リスト表示（全{listData.length}名）
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">レベル</th>
                    <th className="px-4 py-3 text-left">会員コード</th>
                    <th className="px-4 py-3 text-left">氏名</th>
                    <th className="px-4 py-3 text-center">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {listData.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-blue-600">
                        LV{member.level}
                      </td>
                      <td className="px-4 py-3">{member.memberCode}</td>
                      <td className="px-4 py-3">{member.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            member.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {member.status === "active" ? "アクティブ" : "非アクティブ"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !rootMember && listData.length === 0 && (
          <div className="mt-6 p-8 bg-gray-50 rounded-lg text-center text-gray-500">
            会員コードを入力して「組織図を表示」ボタンをクリックしてください
          </div>
        )}
      </div>

      {/* ダウンラインレポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-download mr-2"></i>
          ダウンラインレポート
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              対象会員コード
            </label>
            <input
              type="text"
              value={reportSearchCode}
              onChange={(e) => setReportSearchCode(e.target.value)}
              placeholder="例: 123456-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              組織区分
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setReportOrgType("matrix")}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition text-sm ${
                  reportOrgType === "matrix"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                マトリックス
              </button>
              <button
                onClick={() => setReportOrgType("unilevel")}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition text-sm ${
                  reportOrgType === "unilevel"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                ユニレベル
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleDownloadDownlineReport}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              <i className="fas fa-file-excel mr-2"></i>
              CSV出力
            </button>
          </div>
        </div>
      </div>

      {/* 購入レポート */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-shopping-cart mr-2"></i>
          購入レポート
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              対象会員コード
            </label>
            <input
              type="text"
              value={purchaseSearchCode}
              onChange={(e) => setPurchaseSearchCode(e.target.value)}
              placeholder="例: 123456-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              開始月
            </label>
            <input
              type="month"
              value={purchaseStartMonth}
              onChange={(e) => setPurchaseStartMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              終了月
            </label>
            <input
              type="month"
              value={purchaseEndMonth}
              onChange={(e) => setPurchaseEndMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              組織区分
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPurchaseOrgType("matrix")}
                className={`flex-1 px-2 py-2 rounded-lg font-semibold transition text-xs ${
                  purchaseOrgType === "matrix"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                M
              </button>
              <button
                onClick={() => setPurchaseOrgType("unilevel")}
                className={`flex-1 px-2 py-2 rounded-lg font-semibold transition text-xs ${
                  purchaseOrgType === "unilevel"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                U
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleDownloadPurchaseReport}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              <i className="fas fa-file-excel mr-2"></i>
              CSV出力
            </button>
          </div>
        </div>
      </div>

      {/* 紹介実績積算ダウンロード */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
          <i className="fas fa-users mr-2"></i>
          紹介実績積算ダウンロード
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              対象期間開始
            </label>
            <input
              type="date"
              value={refStartDate}
              onChange={(e) => setRefStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              対象期間終了
            </label>
            <input
              type="date"
              value={refEndDate}
              onChange={(e) => setRefEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ソート・タイプ
            </label>
            <select
              value={refSortType}
              onChange={(e) => setRefSortType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="clean">クリーンタイプ</option>
              <option value="standard">スタンダード</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleDownloadReferralReport}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              <i className="fas fa-download mr-2"></i>
              ダウンロード
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
