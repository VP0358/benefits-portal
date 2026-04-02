import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SignOutButton from "@/app/components/sign-out-button";
import ViolaLogo from "@/app/components/viola-logo";
import MenuCard from "./ui/menu-card";
import ReferralContractsButton from "./ui/referral-contracts-button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  if (session.user.role === "admin") redirect("/admin");

  const [user, menus, siteSettingsRows] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
      include: { pointWallet: true },
    }),
    prisma.menu.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.siteSetting.findMany({
      where: { settingKey: { in: ["btnBuyImageUrl", "btnPointsImageUrl", "btnReferralImageUrl"] } },
    }),
  ]);

  if (!user) redirect("/login");

  const siteSettings = Object.fromEntries(siteSettingsRows.map(r => [r.settingKey, r.settingValue]));
  const btnBuyImage = siteSettings.btnBuyImageUrl ?? null;
  const btnPointsImage = siteSettings.btnPointsImageUrl ?? null;
  const btnReferralImage = siteSettings.btnReferralImageUrl ?? null;

  return (
    <main className="min-h-screen bg-[#e6f2dc]">
      <div className="mx-auto max-w-md px-4 py-6 space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1">
              <ViolaLogo size="md" />
            </div>
            <div className="text-sm font-bold text-slate-800">こんにちは、{user.name}さん</div>
            <div className="text-xs text-slate-500">会員番号: {user.memberCode}</div>
          </div>
          <SignOutButton className="text-sm text-slate-500 rounded-xl border px-3 py-1.5 hover:bg-white transition-colors" />
        </div>

        {/* ポイントカード */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500 mb-1">利用可能ポイント</div>
          <div className="text-4xl font-bold text-slate-800">
            {(user.pointWallet?.availablePointsBalance ?? 0).toLocaleString()}
            <span className="text-lg font-normal text-slate-500 ml-1">pt</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            {[
              { label: "自動", val: user.pointWallet?.autoPointsBalance ?? 0 },
              { label: "手動", val: user.pointWallet?.manualPointsBalance ?? 0 },
              { label: "外部", val: user.pointWallet?.externalPointsBalance ?? 0 },
            ].map(item => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-3 text-center">
                <div className="text-xs text-slate-400">{item.label}</div>
                <div className="font-semibold text-slate-700 mt-0.5">{item.val.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/orders/checkout"
            className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors overflow-hidden">
            {btnBuyImage
              ? <img src={btnBuyImage} alt="商品を購入" className="h-full w-full object-cover" />
              : <><span>🛒</span><span>商品を購入</span></>
            }
          </Link>
          <Link href="/points/use"
            className="flex items-center justify-center gap-2 rounded-2xl bg-white border-2 border-slate-200 py-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors overflow-hidden">
            {btnPointsImage
              ? <img src={btnPointsImage} alt="ポイントを使う" className="h-full w-full object-cover" />
              : <><span>💳</span><span>ポイントを使う</span></>
            }
          </Link>
        </div>

        {/* 紹介バナー */}
        <Link href="/referral"
          className="flex items-center gap-4 rounded-2xl overflow-hidden shadow-sm hover:opacity-95 transition-opacity"
          style={btnReferralImage ? {} : { background: "linear-gradient(to right, #10b981, #14b8a6)" }}>
          {btnReferralImage ? (
            <img src={btnReferralImage} alt="友達・知人を紹介する" className="w-full h-auto object-cover" />
          ) : (
            <div className="flex items-center gap-4 p-5 w-full">
              <div className="text-3xl">🎁</div>
              <div>
                <div className="font-bold text-white text-sm">友達・知人を紹介する</div>
                <div className="text-xs text-emerald-100 mt-0.5">紹介URLをシェアして一緒に使おう！</div>
              </div>
              <div className="ml-auto text-white text-lg">›</div>
            </div>
          )}
        </Link>

        {/* 今月の直紹介 携帯契約件数ボタン */}
        <ReferralContractsButton />

        {/* 履歴・お知らせ */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/orders/history"
            className="rounded-2xl bg-white p-4 shadow-sm text-center hover:bg-slate-50 transition-colors">
            <div className="text-2xl mb-1">📦</div>
            <div className="text-sm font-semibold text-slate-700">注文履歴</div>
            <div className="text-xs text-slate-400 mt-0.5">購入した商品を確認</div>
          </Link>
          <Link href="/points/history"
            className="rounded-2xl bg-white p-4 shadow-sm text-center hover:bg-slate-50 transition-colors">
            <div className="text-2xl mb-1">📋</div>
            <div className="text-sm font-semibold text-slate-700">ポイント履歴</div>
            <div className="text-xs text-slate-400 mt-0.5">獲得・利用の記録</div>
          </Link>
        </div>

        {/* お知らせエリア */}
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📢</span>
            <h2 className="text-sm font-bold text-slate-800">お知らせ</h2>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
              <span className="text-xs text-slate-400 whitespace-nowrap mt-0.5">最新</span>
              <span>福利厚生ポータルへようこそ！各種サービスをご利用ください。</span>
            </div>
          </div>
        </div>

        {/* 福利厚生サービス メニュー */}
        {menus.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-600 mb-3 px-1">福利厚生サービス</h2>
            <div className="grid grid-cols-3 gap-3">
              {menus.map(menu => (
                <MenuCard
                  key={menu.id.toString()}
                  id={menu.id.toString()}
                  title={menu.title}
                  subtitle={menu.subtitle}
                  iconType={menu.iconType}
                  menuType={menu.menuType}
                  linkUrl={menu.linkUrl}
                  contentData={menu.contentData}
                  userName={user.name}
                  userPhone={user.phone ?? ""}
                  userEmail={user.email}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
