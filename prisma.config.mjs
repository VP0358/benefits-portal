import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // prisma generate 時に DATABASE_URL が未設定でも失敗しないよう ?? "" を使用
    // See: https://www.prisma.io/docs/orm/reference/prisma-config-reference
    url: process.env.DATABASE_URL ?? "",
  },
});
