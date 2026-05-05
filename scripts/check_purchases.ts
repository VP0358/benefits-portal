import { prisma } from "../lib/prisma";

async function main() {
  // mlm_purchasesの件数確認
  const count = await prisma.mlmPurchase.count();
  console.log("Total mlmPurchase records:", count);

  // 最新10件確認
  const recent = await prisma.mlmPurchase.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      mlmMemberId: true,
      productCode: true,
      productName: true,
      purchaseMonth: true,
      purchasedAt: true,
      createdAt: true,
    }
  });
  console.log("Recent 10 records:", JSON.stringify(recent, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  // order_idがnullでない件数
  const withOrderId = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM mlm_purchases WHERE order_id IS NOT NULL`);
  console.log("Records with order_id:", JSON.stringify(withOrderId));

  // order_idがnullの件数
  const withoutOrderId = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM mlm_purchases WHERE order_id IS NULL`);
  console.log("Records without order_id (batch):", JSON.stringify(withoutOrderId));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
