import {
  BellOff,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";

import { ThreadListItem } from "@/features/threads/components/ThreadListItem";
import { ThreadCard } from "@/features/threads/components/ThreadCard";
import type { FollowedThread, Thread } from "@/entities/thread/types";
import type { FollowSort } from "@/features/follows/lib/sortFollows";
import { useListEntranceAnimation } from "@/shared/hooks/useListEntranceAnimation";
import { Select } from "@/shared/ui/Select";
import { LayoutModeToggle } from "@/shared/ui/LayoutModeToggle";
import { useLayoutPreference } from "@/shared/hooks/useLayoutPreference";
import { useCardGridClass } from "@/shared/hooks/useSettings";

type FollowStatusFilter = "current" | "past" | "all";

type FollowChannelOption = {
  id: string;
  name: string;
};

interface MeFollowsSectionProps {
  channelOptions: FollowChannelOption[];
  followStatus: FollowStatusFilter;
  hasAnyResults: boolean;
  isError: boolean;
  isLoading: boolean;
  selectedChannel?: string | null;
  searchQuery: string;
  sort: FollowSort;
  threads: FollowedThread[];
  onClearChannel: () => void;
  onPreview: (thread: Thread) => void;
  onRefresh: () => void;
  onSearchQueryChange: (value: string) => void;
  onSortChange: (sort: FollowSort) => void;
  onSetChannel: (channelId: string | null) => void;
  onSetFollowStatus: (status: FollowStatusFilter) => void;
  onUnfollow: (thread: Thread) => void;
  unfollowPendingThreadId?: string | null;
}

export function MeFollowsSection({
  channelOptions,
  followStatus,
  hasAnyResults,
  isError,
  isLoading,
  selectedChannel,
  searchQuery,
  sort,
  threads,
  onClearChannel,
  onPreview,
  onRefresh,
  onSearchQueryChange,
  onSortChange,
  onSetChannel,
  onSetFollowStatus,
  onUnfollow,
  unfollowPendingThreadId,
}: MeFollowsSectionProps) {
  const animateIn = useListEntranceAnimation(isLoading);
  const [layoutMode, setLayoutMode] = useLayoutPreference("me-follows", "list");
  const gridClass = useCardGridClass();

  const emptyMessage = selectedChannel
    ? "这个频道里暂时没有符合筛选的关注内容。"
    : followStatus === "past"
      ? "还没有历史关注记录。"
      : followStatus === "all"
        ? "还没有关注记录，去 Discord 里参与帖子后会自动出现在这里。"
        : "还没有当前关注内容，去 Discord 里参与帖子后会自动出现在这里。";

  return (
    <section aria-label="关注作品">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="w-full max-w-xs">
          <label htmlFor="follow-search" className="sr-only">
            搜索已加载的关注内容
          </label>
          <div className="mb-3 flex min-h-10 items-center gap-2 border-b border-(--od-shell-line) px-1">
            <Search className="h-4 w-4 shrink-0 text-(--od-text-tertiary)" />
            <input
              id="follow-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="搜索当前已加载的关注"
              className="min-w-0 flex-1 !bg-transparent py-2 text-sm text-(--od-text-primary) outline-hidden placeholder:text-(--od-text-tertiary)"
            />
          </div>
          <label htmlFor="follow-channel-filter" className="sr-only">
            频道筛选
          </label>
          <Select
            id="follow-channel-filter"
            value={selectedChannel || ""}
            aria-label="频道筛选"
            onChange={(value) => onSetChannel(value || null)}
            options={[{ value: "", label: "全频道" }, ...channelOptions.map((channel) => ({ value: channel.id, label: channel.name }))]}
          />
          <label htmlFor="follow-sort" className="sr-only">
            关注排序
          </label>
          <Select
            id="follow-sort"
            value={sort}
            aria-label="关注排序"
            onChange={(value) => onSortChange(value as FollowSort)}
            className="mt-2"
            options={[
              { value: "updated", label: "最近更新" },
              { value: "unread", label: "有更新优先" },
              { value: "followed-newest", label: "最近关注" },
              { value: "followed-oldest", label: "最早关注" },
              { value: "created", label: "最近创建" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <LayoutModeToggle value={layoutMode === "list" ? "list" : "grid"} onChange={setLayoutMode} />
          {(
            [
              { value: "current", label: "当前关注" },
              { value: "past", label: "历史关注" },
              { value: "all", label: "全部" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSetFollowStatus(option.value)}
              className={`od-inline-action ${
                followStatus === option.value
                  ? "od-inline-action-soft"
                  : "od-inline-action-ghost"
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onRefresh}
            className="od-inline-action od-inline-action-ghost"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
          {selectedChannel && (
            <button
              type="button"
              onClick={onClearChannel}
              className="od-inline-action od-inline-action-soft"
            >
              清除频道筛选
            </button>
          )}
        </div>
      </div>

      {selectedChannel && (
        <p className="mb-5 text-center text-sm leading-6 text-(--od-text-secondary)">
          现在只在当前频道里看关注内容，侧栏切频道会直接刷新这里的范围。
        </p>
      )}

      {isLoading ? (
        <p className="od-text-body">正在加载关注列表...</p>
      ) : isError ? (
        <p className="od-text-body text-(--od-text-emphasis)">
          关注列表加载失败了，稍后试试看。
        </p>
      ) : !hasAnyResults ? (
        <p className="od-text-body">{emptyMessage}</p>
      ) : threads.length === 0 ? (
        <p className="od-text-body">
          {searchQuery.trim()
            ? "当前已加载的关注内容里没有匹配结果。"
            : emptyMessage}
        </p>
      ) : (
        <div className={layoutMode === "list" ? "flex flex-col space-y-od-list-gap" : gridClass}>
          {threads.map((thread, index) => {
            const isCurrentFollow = Boolean(thread.active_flag);
            const isPending = unfollowPendingThreadId === thread.thread_id;

            const followAction = isCurrentFollow ? (
              <button
                type="button"
                disabled={isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  onUnfollow(thread);
                }}
                className="od-inline-action od-inline-action-ghost text-(--od-text-tertiary) hover:text-(--od-error) disabled:pointer-events-none disabled:opacity-55"
              >
                <BellOff className="h-3.5 w-3.5" />
                {isPending ? "取消中" : "取消关注"}
              </button>
            ) : (
              <span className="od-inline-action bg-(--od-surface-soft) text-(--od-text-tertiary)">
                <CheckCircle2 className="h-3.5 w-3.5" />
                已取消
              </span>
            );

            return layoutMode === "list" ? (
              <ThreadListItem
                key={thread.thread_id}
                thread={thread}
                index={index}
                onPreview={onPreview}
                animateIn={animateIn}
                trailingAction={followAction}
              />
            ) : (
              <div key={thread.thread_id} className="flex min-w-0 flex-col">
                <div className="min-h-0 flex-1">
                  <ThreadCard thread={thread} index={index} onPreview={onPreview} animateIn={animateIn} />
                </div>
                <div className="mt-2 flex justify-end">{followAction}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
