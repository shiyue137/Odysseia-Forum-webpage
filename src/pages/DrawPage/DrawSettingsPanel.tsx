import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, Tags } from "lucide-react";

interface DrawSettingsPanelProps {
  isOpen: boolean;
  recipe: { scopeMode: "all" | "preferences" | "custom"; channelIds: string[]; includeTags: string[]; excludeTags: string[]; tagLogic: "and" | "or" };
  channels: { id: string; name: string }[];
  tagGroups: { id: string; name: string; tags: string[] }[];
  revealEnabled: boolean;
  onRestorePreferences: () => void;
  onScopeModeChange: (mode: "all" | "preferences" | "custom") => void;
  onTagLogicChange: (logic: "and" | "or") => void;
  onToggleChannel: (id: string) => void;
  onToggleTag: (tag: string) => void;
  onRevealEnabledChange: (enabled: boolean) => void;
}

export function DrawSettingsPanel({ isOpen, recipe, channels, tagGroups, revealEnabled, onRestorePreferences, onScopeModeChange, onTagLogicChange, onToggleChannel, onToggleTag, onRevealEnabledChange }: DrawSettingsPanelProps) {
  return (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="mt-4 w-full max-w-2xl overflow-hidden"
      >
        <div className="space-y-4 py-4">
          {/* 抽卡范围 */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                基础卡池
              </p>
              <button
                type="button"
                onClick={onRestorePreferences}
                className="inline-flex items-center gap-1 text-xs text-(--od-text-tertiary) transition-colors hover:text-(--od-accent)"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                恢复我的偏好
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["all", "全社区"],
                ["preferences", "偏好频道"],
                ["custom", "自选频道"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onScopeModeChange(mode)}
                  className={`rounded-2xl border-0 px-3 py-3 text-sm transition-colors ${
                    recipe.scopeMode === mode
                      ? "bg-(--od-accent)/10 text-(--od-accent)"
                      : "bg-transparent text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-accent)"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {recipe.scopeMode === "custom" && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                自选频道
              </p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto py-2">
                {channels.map((channel) => {
                  const active = recipe.channelIds.includes(channel.id);
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => onToggleChannel(channel.id)}
                      className={`rounded-full border-0 px-3 py-1.5 text-xs transition-colors ${
                        active
                          ? "bg-(--od-accent)/10 text-(--od-accent)"
                          : "bg-transparent text-(--od-text-secondary) hover:bg-(--od-interactive-hover) hover:text-(--od-accent)"
                      }`}
                    >
                      {channel.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-(--od-text-label)">
                <Tags className="h-3.5 w-3.5" />
                Tag 配方
              </p>
              <div className="flex items-center gap-1 text-xs">
                {([['or', '任一'], ['and', '全部']] as const).map(([logic, label]) => (
                  <button
                    key={logic}
                    type="button"
                    onClick={() => onTagLogicChange(logic)}
                    className={`rounded-lg px-2 py-1 transition-colors ${
                      recipe.tagLogic === logic
                        ? 'text-(--od-accent)'
                        : 'text-(--od-text-tertiary) hover:text-(--od-accent)'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-2 text-[11px] text-(--od-text-tertiary)">
              点击切换：包含 → 排除 → 不限
            </p>
            <div className="od-chrome-surface max-h-64 space-y-4 overflow-y-auto rounded-2xl p-3">
              {tagGroups.length > 0 ? tagGroups.map((group) => (
                <section key={group.id}>
                  <h3 className="mb-2 text-[11px] font-semibold text-(--od-text-tertiary)">{group.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => {
                      const included = recipe.includeTags.includes(tag);
                      const excluded = recipe.excludeTags.includes(tag);
                      return (
                        <button
                          key={`${group.id}-${tag}`}
                          type="button"
                          onClick={() => onToggleTag(tag)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            included
                              ? 'border-emerald-500/40 text-emerald-300'
                              : excluded
                                ? 'border-rose-500/40 text-rose-300'
                                : 'border-white/8 text-(--od-text-secondary) hover:border-(--od-accent)/30 hover:text-(--od-accent)'
                          }`}
                        >
                          {included ? '+ ' : excluded ? '− ' : ''}{tag}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )) : (
                <span className="text-xs text-(--od-text-tertiary)">当前卡池暂时没有可用 Tag</span>
              )}
            </div>
          </div>

          {/* 揭晓动画开关 */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-sm font-medium text-(--od-text-primary)">
                揭晓动画
              </p>
              <p className="text-xs text-(--od-text-tertiary) mt-0.5">
                关闭后抽卡结果将直接展示在页面底部
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={revealEnabled}
              onClick={() => onRevealEnabledChange(!revealEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                revealEnabled ? "bg-(--od-accent)" : "bg-(--od-border)"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                  revealEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
  );
}
