import { prisma } from "../lib/prisma";

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'mlm_purchases' 
    ORDER BY ordinal_position
  `);
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
