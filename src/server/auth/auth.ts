import { getServerAuthSession } from "@/auth";

export async function requireUser() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  const plan = session?.user?.plan ?? "free";

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    session,
    userId,
    plan
  };
}
