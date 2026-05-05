import { prisma } from "../lib/prisma";
async function main() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `) as any[];
  console.log(tables.map((t:any) => t.table_name).join('\n'));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
