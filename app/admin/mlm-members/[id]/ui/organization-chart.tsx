"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MemberNode = {
  id: string;
  memberCode: string;
  name: string;
  level: number;
  status: string;
  directDownlines?: MemberNode[];
};

export default function OrganizationChart({
  memberCode,
}: {
  memberCode: string;
}) {
  const [rootMember, setRootMember] = useState<MemberNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrgChart = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/admin/mlm-organization/tree?memberCode=${encodeURIComponent(
            memberCode
          )}&type=unilevel`
        );
        if (res.ok) {
          const data = await res.json();
          setRootMember(data.root);
        } else {
          setError("組織図の取得に失敗しました");
        }
      } catch (err) {
        console.error("Error fetching organization:", err);
        setError("エラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchOrgChart();
  }, [memberCode]);

  // レベル別の色設定
  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-gray-400";
      case 1:
        return "bg-blue-500";
      case 2:
        return "bg-green-500";
      case 3:
        return "bg-yellow-500";
      case 4:
        return "bg-purple-500";
      case 5:
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0:
        return "未設定";
      case 1:
        return "LV.1";
      case 2:
        return "LV.2";
      case 3:
        return "LV.3";
      case 4:
        return "LV.4";
      case 5:
        return "LV.5";
      default:
        return `LV.${level}`;
    }
  };

  const renderTreeNode = (
    node: MemberNode,
    depth: number = 0
  ): JSX.Element => {
    const indent = depth * 40;
    const hasChildren =
      node.directDownlines && node.directDownlines.length > 0;

    return (
      <div key={node.id} className="mb-2">
        <div
          className="flex items-center gap-3 p-3 bg-white rounded-lg shadow hover:shadow-md transition"
          style={{ marginLeft: `${indent}px` }}
        >
          <div
            className={`w-10 h-10 ${getLevelColor(
              node.level
            )} text-white rounded-full flex items-center justify-center font-bold text-xs`}
          >
            {getLevelLabel(node.level)}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-800">
              <Link
                href={`/admin/mlm-members/${node.id}`}
                className="text-blue-600 hover:text-blue-700"
              >
                {node.memberCode}
              </Link>{" "}
              - {node.name}
            </div>
            <div className="text-xs text-gray-500">
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
            {node.directDownlines!.map((child) =>
              renderTreeNode(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 animate-pulse">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!rootMember) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">組織図データがありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {renderTreeNode(rootMember)}
    </div>
  );
}
