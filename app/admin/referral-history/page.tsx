import { redirect } from "next/navigation";

// 紹介者変更履歴ページは廃止されました
// 携帯契約一覧ページへリダイレクト
export default function ReferralHistoryPage() {
  redirect("/admin/contracts");
}
