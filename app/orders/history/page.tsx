import OrderHistoryList from "./ui/order-history-list";
import Link from "next/link";

export default function OrderHistoryPage() {
  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-20">
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-green-700 text-xl font-bold">‹</Link>
        <span className="font-bold text-green-900 text-base">📦 福利厚生使用履歴</span>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5">
        {/* 説明文 */}
        <p className="text-xs text-gray-500 mb-4 px-1">
          福利厚生サービスのご利用履歴です。タップすると詳細をご確認いただけます。
        </p>
        <OrderHistoryList />
      </main>
    </div>
  );
}
