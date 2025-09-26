// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./database";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 روز
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.error("❌ Missing username or password");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
          });

          if (!user) {
            console.error("❌ User not found:", credentials.username);
            return null;
          }

          // بررسی وضعیت فعال بودن کاربر
          if (!user.isActive) {
            console.error("❌ User account is deactivated:", credentials.username);
            throw new Error("Your account has been deactivated by administrator");
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            console.error("❌ Invalid password for user:", credentials.username);
            return null;
          }

          // کاربر معتبر
          return {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            isActive: user.isActive, // اضافه کردن isActive
          };
        } catch (error) {
          console.error("❌ Auth error:", error);
          throw error; // خطا را دوباره پرتاب کنید تا در صفحه login نمایش داده شود
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.isActive = (user as any).isActive; // اضافه کردن isActive به token
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        username: token.username as string,
        role: token.role as string,
        isActive: token.isActive as boolean, // اضافه کردن isActive به session
      };
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};