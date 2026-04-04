import PointTransactionHistory from "./ui/point-usage-history";
import Link from "next/link";

export default function PointHistoryPage() {
  return (
    <div className="min-h-screen bg-[#e6f2dc] pb-20">
      <header className="sticky top-0 z-30 bg-white shadow-sm flex items-center gap-3 px-4 py-3">
        <Link href="/dashboard" className="text-green-700 text-xl font-bold">‹</Link>
        <span className="font-bold text-green-900 text-base">📊 ポイント履歴</span>
      </header>
      <main className="max-w-md mx-auto px-4 pt-5">
        <PointTransactionHistory />
      </main>
    </div>
  );
}
