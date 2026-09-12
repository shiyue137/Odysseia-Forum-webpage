import type { Booklist } from "@/entities/booklist/types";
import { BooklistCard } from "@/features/booklists/components/BooklistCard";
import { BooklistListItem } from "@/features/booklists/components/BooklistListItem";
import { TournamentListItem } from "@/features/tournaments/components/TournamentListItem";
import { AnimatedPagination } from "@/shared/ui/AnimatedPagination";
import { Search, SlidersHorizontal } from "lucide-react";

interface SearchCollectionResultsProps {
  results: Booklist[];
  isLoading: boolean;
  isError: boolean;
  isTournament: boolean;
  isList: boolean;
  gridClassName: string;
  collectLoading: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  onRetry: () => void;
  onOpen: (id: number) => void;
  onToggleCollect: (booklist: Booklist) => void;
  onPageChange: (page: number) => void;
}

export function SearchCollectionResults({
  results,
  isLoading,
  isError,
  isTournament,
  isList,
  gridClassName,
  collectLoading,
  pagination,
  onRetry,
  onOpen,
  onToggleCollect,
  onPageChange,
}: SearchCollectionResultsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-[1.35rem] bg-[color-mix(in_srgb,var(--od-surface-content)_62%,transparent)]"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <SlidersHorizontal className="h-10 w-10" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
          {isTournament ? "赛事搜索出错了" : "书单搜索出错了"}
        </h3>
        <p className="mb-6 text-(--od-text-secondary)">
          暂时拉不到{isTournament ? "赛事" : "书单"}结果，稍后再试试吧。
        </p>
        <button type="button" onClick={onRetry}
          className="od-inline-action od-inline-action-primary px-6 py-3 text-sm">
          重试搜索
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-(--od-text-tertiary) opacity-20">
          <Search className="mx-auto h-24 w-24" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-(--od-text-primary)">
          没有找到匹配{isTournament ? "赛事" : "书单"}
        </h3>
        <p className="text-(--od-text-secondary)">
          试试换个关键词，或者切回帖子分类继续探索。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className={isList ? "flex flex-col space-y-od-list-gap" : gridClassName}>
        {results.map((booklist) => {
          if (isTournament && isList) {
            return (
              <TournamentListItem
                key={booklist.id}
                tournament={booklist}
                onOpen={(item) => onOpen(item.id)}
                onToggleCollect={onToggleCollect}
                collectLoading={collectLoading}
              />
            );
          }

          const commonProps = {
            booklist,
            canManage: false,
            onOpen,
            onToggleCollect,
            onEdit: () => undefined,
            onDelete: () => undefined,
            collectLoading,
          };
          return isList ? (
            <BooklistListItem
              key={booklist.id}
              {...commonProps}
              ownerName={booklist.author?.display_name ||
                booklist.author?.global_name || booklist.author?.name || undefined}
              ownerAvatarUrl={booklist.author?.avatar_url ?? null}
              coverImageUrl={booklist.cover_image_url || null}
            />
          ) : (
            <BooklistCard key={booklist.id} {...commonProps} />
          );
        })}
      </div>
      <AnimatedPagination {...pagination} onChange={onPageChange} />
    </div>
  );
}
