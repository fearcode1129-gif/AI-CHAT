import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      plan: string;
      avatarUrl: string | null;
    };
  }

  interface User {
    plan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    avatarUrl?: string | null;
  }
}
