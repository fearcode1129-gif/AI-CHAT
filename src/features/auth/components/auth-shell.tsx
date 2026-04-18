import Link from "next/link";

type AuthShellProps = {
  title: string;
  description: string;
  footerPrompt: string;
  footerLinkText: string;
  footerHref: "/sign-in" | "/sign-up";
  children: React.ReactNode;
};

export function AuthShell({
  title,
  description,
  footerPrompt,
  footerLinkText,
  footerHref,
  children
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,117,246,0.14),_transparent_35%),linear-gradient(180deg,_#f8f9fb_0%,_#eef2f6_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full max-w-md rounded-[32px] bg-white/88 p-8 shadow-float ring-1 ring-[var(--outline-soft)] backdrop-blur-xl">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
              AI Workspace
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text-primary">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{description}</p>
          </div>

          {children}

          <p className="mt-6 text-center text-sm text-text-secondary">
            {footerPrompt}{" "}
            <Link href={footerHref} className="font-semibold text-primary transition hover:text-primary-hover">
              {footerLinkText}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
