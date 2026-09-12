import { Settings, SquarePen } from "lucide-react";

interface AISearchPageHeaderProps {
  disabled: boolean;
  onNewConversation: () => void;
  onOpenSettings: () => void;
}

export function AISearchPageHeader({
  disabled,
  onNewConversation,
  onOpenSettings,
}: AISearchPageHeaderProps) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-5xl shrink-0 justify-end">
      <div className="flex items-center gap-1">
        <button type="button" onClick={onNewConversation} disabled={disabled}
          className="group inline-flex h-9 w-9 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
          aria-label="新建对话">
          <SquarePen className="h-4.5 w-4.5 transition-transform duration-200 group-hover:-rotate-6" />
        </button>
        <button type="button" onClick={onOpenSettings} data-tour="ai-search-settings"
          className="group inline-flex h-9 w-9 items-center justify-center text-(--od-text-tertiary) transition-colors hover:text-(--od-accent) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--od-accent)"
          aria-label="模型设置">
          <Settings className="h-4.5 w-4.5 transition-transform duration-300 group-hover:rotate-45" />
        </button>
      </div>
    </header>
  );
}
