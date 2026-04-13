import { Compass, Home, MessageSquareText, UserRound } from "lucide-react";

const tabs = [
  { id: "chat", label: "聊天", icon: MessageSquareText, active: true },
  { id: "discover", label: "发现", icon: Compass },
  { id: "home", label: "首页", icon: Home },
  { id: "mine", label: "我的", icon: UserRound }
];

export function MobileTabBar() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-20 flex h-[76px] items-center justify-around border-t border-[var(--outline-soft)] bg-card/88 px-4 backdrop-blur-xl lg:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            className={`flex min-w-[64px] flex-col items-center gap-1 text-xs transition ${
              tab.active ? "text-primary" : "text-text-muted"
            }`}
            aria-label={tab.label}
          >
            <Icon className={`h-4 w-4 ${tab.active ? "fill-primary/10" : ""}`} />
            <span className="font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
