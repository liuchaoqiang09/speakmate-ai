import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/lib/db/prisma";

/**
 * NextAuth v4 配置：邮箱 + 密码，JWT Session。
 * 密钥只从环境变量 NEXTAUTH_SECRET 读取。
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "EmailPassword",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const profile = await prisma.profile.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            displayName: true,
            passwordHash: true,
          },
        });

        if (!profile) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          profile.passwordHash
        );
        if (!passwordMatches) {
          return null;
        }

        return {
          id: profile.id,
          email: profile.email,
          name: profile.displayName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};
