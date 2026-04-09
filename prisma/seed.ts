import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";
import { join } from "path";

// .env.localを明示的に読み込み
config({ path: join(process.cwd(), '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPasswordHash = await hash("AdminPass123!", 10);
  const memberPasswordHash = await hash("MemberPass123!", 10);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@example.com" },
    update: { name: "管理者", passwordHash: adminPasswordHash, role: "super_admin" },
    create: { name: "管理者", email: "admin@example.com", passwordHash: adminPasswordHash, role: "super_admin" },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: { name: "VIOLAさん", passwordHash: memberPasswordHash, memberCode: "M0001", status: "active" },
    create: { memberCode: "M0001", name: "VIOLAさん", email: "member@example.com", passwordHash: memberPasswordHash, status: "active" },
  });

  await prisma.pointWallet.upsert({
    where: { userId: member.id },
    update: { autoPointsBalance: 50000, manualPointsBalance: 10000, externalPointsBalance: 18541, availablePointsBalance: 78541 },
    create: { userId: member.id, autoPointsBalance: 50000, manualPointsBalance: 10000, externalPointsBalance: 18541, availablePointsBalance: 78541 },
  });

  const menus = [
    { title: "VPphone", subtitle: "契約・確認", iconType: "smartphone", linkUrl: "https://example.com/vpphone", sortOrder: 1 },
    { title: "旅行", subtitle: "旅行利用", iconType: "plane", linkUrl: "https://example.com/travel", sortOrder: 2 },
    { title: "肌診断", subtitle: "全国代理店", iconType: "smile", linkUrl: "https://example.com/skin", sortOrder: 3 },
    { title: "ショッピング", subtitle: "商品購入", iconType: "cart", linkUrl: "https://example.com/shop", sortOrder: 4 },
    { title: "相談窓口", subtitle: "お問い合わせ", iconType: "message", linkUrl: "https://example.com/support", sortOrder: 5 },
    { title: "細胞浴予約", subtitle: "予約ページ", iconType: "jar", linkUrl: "https://example.com/reserve", sortOrder: 6 },
  ];

  for (const menu of menus) {
    await prisma.menu.upsert({ where: { title: menu.title }, update: { ...menu, isActive: true, isHighlight: false }, create: { ...menu, isActive: true, isHighlight: false } });
  }

  const products = [
    { name: "美容クリーム", description: "会員向け美容クリーム", price: 6800 },
    { name: "健康サプリ", description: "会員向け健康サプリメント", price: 4800 },
    { name: "リラクゼーションチケット", description: "福利厚生利用チケット", price: 12000 },
  ];

  for (const product of products) {
    await prisma.product.upsert({ where: { name: product.name }, update: { ...product, isActive: true }, create: { ...product, isActive: true } });
  }

  // MLM商品マスター（MlmProduct）を追加
  const mlmProducts = [
    { productCode: "s1000", name: "登録料", price: 3300, pv: 0, isRegistration: true },
    { productCode: "1000", name: "[新規]VIOLA Pure 翠彩-SUMISAI-", price: 16500, pv: 150, isRegistration: true },
    { productCode: "2000", name: "VIOLA Pure 翠彩-SUMISAI-", price: 16500, pv: 150, isRegistration: false },
    { productCode: "4000", name: "出荷事務手数料", price: 880, pv: 0, isRegistration: false },
    { productCode: "5000", name: "概要書面1部", price: 550, pv: 0, isRegistration: false },
  ];

  for (const mlmProduct of mlmProducts) {
    await prisma.mlmProduct.upsert({
      where: { productCode: mlmProduct.productCode },
      update: mlmProduct,
      create: mlmProduct,
    });
  }

  await prisma.siteSetting.upsert({ where: { settingKey: "siteTitle" }, update: { settingValue: "福利厚生ポータル" }, create: { settingKey: "siteTitle", settingValue: "福利厚生ポータル" } });
  await prisma.siteSetting.upsert({ where: { settingKey: "faviconUrl" }, update: { settingValue: null }, create: { settingKey: "faviconUrl", settingValue: null } });

  // ボーナス計算設定の初期化（レベル別設定）
  const bonusSettings = await prisma.bonusSettings.findFirst();
  if (!bonusSettings) {
    await prisma.bonusSettings.create({
      data: {
        directBonusAmount: 2000,
        // LV.1（3段目まで）
        unilevelLv1Rate1: 15.0,
        unilevelLv1Rate2: 7.0,
        unilevelLv1Rate3: 3.0,
        // LV.2（5段目まで）
        unilevelLv2Rate1: 15.0,
        unilevelLv2Rate2: 7.0,
        unilevelLv2Rate3: 3.0,
        unilevelLv2Rate4: 1.0,
        unilevelLv2Rate5: 1.0,
        // LV.3（7段目まで）
        unilevelLv3Rate1: 15.0,
        unilevelLv3Rate2: 8.0,
        unilevelLv3Rate3: 5.0,
        unilevelLv3Rate4: 4.0,
        unilevelLv3Rate5: 2.0,
        unilevelLv3Rate6: 1.0,
        unilevelLv3Rate7: 1.0,
        // LV.4（7段目まで）
        unilevelLv4Rate1: 15.0,
        unilevelLv4Rate2: 9.0,
        unilevelLv4Rate3: 6.0,
        unilevelLv4Rate4: 5.0,
        unilevelLv4Rate5: 3.0,
        unilevelLv4Rate6: 2.0,
        unilevelLv4Rate7: 1.0,
        // LV.5（7段目まで）
        unilevelLv5Rate1: 15.0,
        unilevelLv5Rate2: 10.0,
        unilevelLv5Rate3: 7.0,
        unilevelLv5Rate4: 6.0,
        unilevelLv5Rate5: 4.0,
        unilevelLv5Rate6: 3.0,
        unilevelLv5Rate7: 2.0,
        // 組織構築ボーナス（レベル別）
        structureLv3Rate: 3.0,
        structureLv4Rate: 3.5,
        structureLv5Rate: 4.0,
        // その他
        activeThresholdPoints: 150,
        serviceFeeAmount: 440,
        minPayoutAmount: 2560,
      },
    });
  }

  // 貯金ボーナス設定の初期化
  const savingsConfig = await prisma.savingsBonusConfig.findFirst();
  if (!savingsConfig) {
    await prisma.savingsBonusConfig.create({
      data: {
        registrationRate: 20.0,
        autoshipRate: 5.0,
        bonusRate: 3.0,
      },
    });
  }

  console.log("✅ Seed完了");
  console.log({ admin: admin.email, member: member.email });
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
