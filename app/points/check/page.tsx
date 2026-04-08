/**
 * ポイント確認ページ
 * 会員ダッシュボードから「⭐ ポイント確認」タブで遷移
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import PointsCheckClient from "./ui/points-check-client";

export default async function PointsCheckPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = BigInt(session.user.id);

  // ユーザー情報取得
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      pointWallet: true
    }
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <PointsCheckClient 
      userName={user.name}
      memberCode={user.memberCode}
      availablePoints={user.pointWallet?.availablePoints ?? 0}
    />
  );
}
