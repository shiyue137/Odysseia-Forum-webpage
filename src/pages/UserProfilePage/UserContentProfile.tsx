import { Hash, LayoutGrid } from "lucide-react";

export function UserContentProfile({
  threadsCount,
  tags,
  channels,
}: {
  threadsCount: number;
  tags: Array<[string, number]>;
  channels: Array<[string, number]>;
}) {
  if (tags.length === 0 && channels.length === 0) return null;
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
      <p className="text-[11px] font-medium text-(--od-text-tertiary)">基于当前加载的 {threadsCount} 篇作品</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tags.map(([tag, count]) => <span key={`tag-${tag}`} className="inline-flex items-center gap-1.5 rounded-full bg-(--od-surface-soft) px-3 py-1.5 text-xs text-(--od-text-secondary)"><Hash className="h-3 w-3 text-(--od-accent)" /><span className="max-w-36 truncate">{tag}</span><span className="tabular-nums text-(--od-text-tertiary)">{count}</span></span>)}
        {channels.map(([channel, count]) => <span key={`channel-${channel}`} className="inline-flex items-center gap-1.5 rounded-full bg-(--od-surface-soft) px-3 py-1.5 text-xs text-(--od-text-secondary)"><LayoutGrid className="h-3 w-3 text-(--od-accent)" /><span className="max-w-36 truncate">{channel}</span><span className="tabular-nums text-(--od-text-tertiary)">{count}</span></span>)}
      </div>
    </div>
  );
}
