import { prisma } from "../lib/prisma";

async function main() {
  // mlmPurchaseとOrderのマッチング状況を確認
  const sample = await prisma.$queryRawUnsafe(`
    SELECT 
      mp.id::text as purchase_id,
      mp."mlmMemberId"::text,
      mp."productCode",
      mp."purchaseMonth",
      mp."purchasedAt",
      o.id::text as order_id,
      o."orderNumber",
      o."orderedAt"
    FROM mlm_purchases mp
    LEFT JOIN mlm_members mm ON mm.id = mp."mlmMemberId"
    LEFT JOIN users u ON u.id = mm."userId"
    LEFT JOIN orders o ON o."userId" = u.id
      AND LEFT(o."orderedAt"::text, 7) = mp."purchaseMonth"
    WHERE mp.order_id IS NULL
    AND mp."productCode" IN ('1000','2000')
    ORDER BY mp."createdAt" DESC
    LIMIT 10
  `) as any[];
  console.log("Null order_id sample with potential matches:", JSON.stringify(sample, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
