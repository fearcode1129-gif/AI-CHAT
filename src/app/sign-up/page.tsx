import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/auth";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export default async function SignUpPage() {
  const session = await getServerAuthSession();

  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <AuthShell
      title="创建你的工作台"
      description="注册后即可保留个人历史会话、上传资料和生成内容，所有数据都会围绕你的账号沉淀。"
      footerPrompt="已经有账号了？"
      footerLinkText="去登录"
      footerHref="/sign-in"
    >
      <SignUpForm />
    </AuthShell>
  );
}
