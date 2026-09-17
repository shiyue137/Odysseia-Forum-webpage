import type { Booklist } from "@/entities/booklist/types";
import { CustomTagChip } from "@/features/tags/components/CustomTagChip";
import { customTagsEnabled } from "@/shared/config/tags";

export function BooklistTagList({ booklist, className = "" }: { booklist: Booklist; className?: string }) {
  const tags = booklist.custom_tags ?? [];
  if (!customTagsEnabled || tags.length === 0) return null;
  return <div className={`mb-3 flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
    {tags.slice(0, 4).map((tag) => <CustomTagChip key={tag.id} tag={tag} searchType={booklist.is_tournament ? "tournament" : "booklist"} />)}
    {tags.length > 4 && <span className="text-[10px] text-(--od-text-tertiary)" title={tags.slice(4).map((tag) => tag.name).join("、")}>+{tags.length - 4}</span>}
  </div>;
}
