import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

// middlewareからimportされるため、Prismaは遅延importする
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "member";
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;
        const prisma = await getPrisma();

        // 管理者チェック
        const admin = await prisma.admin.findUnique({ where: { email } });
        if (admin) {
          const ok = await compare(password, admin.passwordHash);
          if (!ok) return null;
          return {
            id: admin.id.toString(),
            email: admin.email,
            name: admin.name,
            role: "admin" as const,
          };
        }

        // 会員チェック
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          const ok = await compare(password, user.passwordHash);
          if (!ok) return null;
          if (user.status !== "active") return null;

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: "member" as const,
          };
        }

        return null;
      },
    }),
  ],
});
