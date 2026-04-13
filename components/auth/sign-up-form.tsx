"use client";

import { startTransition, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? "注册失败，请稍后重试。");
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setIsSubmitting(false);

    if (signInResult?.error) {
      setError("注册成功，但自动登录失败，请返回登录页继续。");
      return;
    }

    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-text-primary">用户名</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-2xl border border-[var(--outline-light)] bg-surface-low px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
          placeholder="请输入你的昵称"
          autoComplete="name"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-text-primary">邮箱</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-[var(--outline-light)] bg-surface-low px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-text-primary">密码</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-[var(--outline-light)] bg-surface-low px-4 py-3 text-sm text-text-primary outline-none transition focus:border-primary"
          placeholder="至少 8 位字符"
          autoComplete="new-password"
          required
        />
      </label>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-pill bg-primary px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-highest disabled:text-text-muted"
      >
        {isSubmitting ? "创建中..." : "创建账号"}
      </button>
    </form>
  );
}
