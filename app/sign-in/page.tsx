import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage() {
  const session = await getServerAuthSession();

  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <AuthShell
      title="欢迎回来"
      description="登录后继续你的会话、附件和知识资料，让工作台只保留属于你的内容脉络。"
      footerPrompt="还没有账号？"
      footerLinkText="立即注册"
      footerHref="/sign-up"
    >
      <SignInForm />
    </AuthShell>
  );
}
