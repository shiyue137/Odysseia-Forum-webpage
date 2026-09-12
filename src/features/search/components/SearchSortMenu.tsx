import {
  useEffect, useLayoutEffect, useRef, useState, useId,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { PreferencesSortUi } from "@/features/preferences/lib/preferencesMapper";

const options: { value: PreferencesSortUi; label: string }[] = [
  { value: "last_active_desc", label: "最近活跃" },
  { value: "created_desc", label: "最新发布" },
  { value: "reply_desc", label: "回复数" },
  { value: "reaction_desc", label: "反应数" },
  { value: "relevance", label: "相关度" },
];

interface SearchSortMenuProps {
  value: string;
  defaultValue?: string;
  saving: boolean;
  saveDisabled: boolean;
  onChange: (value: PreferencesSortUi) => void;
  onSaveDefault: (value: PreferencesSortUi) => void;
}

export function SearchSortMenu({
  value, defaultValue, saving, saveDisabled, onChange, onSaveDefault,
}: SearchSortMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const panelId = useId();

  const close = () => {
    setOpen(false);
    triggerRef.current!.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const panel = panelRef.current!;
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8)),
        top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - panel.offsetHeight - 8)),
        maxHeight: window.innerHeight - 16,
      });
    };
    reposition();
    panelRef.current!.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        !triggerRef.current!.contains(event.target as Node) &&
        !panelRef.current!.contains(event.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
      onBlur={(event) => {
        if (
          !triggerRef.current!.contains(event.relatedTarget) &&
          !panelRef.current?.contains(event.relatedTarget)
        ) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        aria-label="选择排序方式"
        className="flex min-h-10 cursor-pointer items-center gap-1 text-sm text-(--od-text-primary)"
      >
        {options.find((option) => option.value === value)?.label}
        <ChevronDown className="h-4 w-4 text-(--od-text-tertiary)" />
      </button>
      {open && createPortal(<div
        ref={panelRef}
        id={panelId}
        role="group"
        aria-label="排序选项"
        style={position}
        className="od-floating-panel-solid fixed z-[9999] w-60 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl p-1"
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={value === option.value}
              className="min-h-10 flex-1 rounded-lg px-3 text-left text-sm text-(--od-text-primary) hover:bg-(--od-interactive-hover) aria-pressed:text-(--od-accent)"
              onClick={() => {
                onChange(option.value);
                close();
              }}
            >
              {option.label}
            </button>
            <button
              type="button"
              disabled={saveDisabled || saving || defaultValue === option.value}
              aria-label={`将${option.label}设为默认排序`}
              className="min-h-10 rounded-lg px-2 text-xs text-(--od-accent) hover:bg-(--od-interactive-hover) disabled:cursor-default disabled:text-(--od-text-tertiary)"
              onClick={() => onSaveDefault(option.value)}
            >
              {defaultValue === option.value ? "默认" : saving ? "保存中" : "设为默认"}
            </button>
          </div>
        ))}
      </div>, document.body)}
    </div>
  );
}
