import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { AppShell } from "@/features/chat/components/app-shell";

export default async function Page() {
  const session = await getServerAuthSession();

  if (!session?.user?.id || !session.user.email) {
    redirect("/sign-in");
  }

  return (
    <AppShell
      currentUser={{
        id: session.user.id,
        name: session.user.name || "未命名用户",
        email: session.user.email,
        avatarUrl: session.user.avatarUrl,
        plan: session.user.plan
      }}
    />
  );
}
