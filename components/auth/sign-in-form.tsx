"use client";

import { startTransition, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("邮箱或密码不正确。");
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
          placeholder="请输入密码"
          autoComplete="current-password"
          required
        />
      </label>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-pill bg-primary px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-highest disabled:text-text-muted"
      >
        {isSubmitting ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
