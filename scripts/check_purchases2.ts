import { prisma } from "../lib/prisma";

async function main() {
  const withOrderId = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM mlm_purchases WHERE order_id IS NOT NULL`) as any[];
  console.log("order_idあり:", withOrderId[0].cnt);

  const withoutOrderId = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM mlm_purchases WHERE order_id IS NULL`) as any[];
  console.log("order_idなし(バッチ):", withoutOrderId[0].cnt);

  // 伝票から作成されたレコードのサンプル（order_idあり）
  const withOrder = await prisma.$queryRawUnsafe(`
    SELECT id::text, mlm_member_id::text, "mlmMemberId"::text, order_id::text, "productCode", "purchaseMonth"
    FROM mlm_purchases 
    WHERE order_id IS NOT NULL 
    LIMIT 5
  `) as any[];
  console.log("order_idありサンプル:", JSON.stringify(withOrder, null, 2));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
