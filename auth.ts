import { getServerSession } from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "@/server/db/db";

export const authOptions: any = {
  session: {
    strategy: "jwt" as const
  },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials: Record<string, string> | undefined) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email }
        });

        if (!user?.passwordHash) {
          return null;
        }

        const matches = await bcrypt.compare(password, user.passwordHash);

        if (!matches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          plan: user.plan
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }: { token: Record<string, unknown>; user?: { id: string; image?: string | null; plan?: string } | null }) {
      if (user) {
        token.id = user.id;
        token.plan = user.plan ?? "free";
        token.avatarUrl = user.image ?? null;
      }

      return token;
    },
    session({
      session,
      token
    }: {
      session: {
        user?: {
          id?: string;
          plan?: string;
          avatarUrl?: string | null;
        } & Record<string, unknown>;
      };
      token: Record<string, unknown>;
    }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.plan = String(token.plan ?? "free");
        session.user.avatarUrl =
          typeof token.avatarUrl === "string" ? token.avatarUrl : null;
      }

      return session;
    }
  }
};

export function getServerAuthSession(): Promise<any> {
  return getServerSession(authOptions as any) as Promise<any>;
}
