import { Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { customTagSearchQuery } from "@/shared/lib/searchTokenizer";

export function CustomTagChip({ tag, searchType = "thread" }: { tag: { id: string; name: string; category_name?: string | null }; searchType?: "thread" | "booklist" | "tournament" }) {
  const navigate = useNavigate();
  return <button type="button" title={`自定义标签 · ${tag.category_name ?? ""} · ${tag.name}`}
    onClick={(event) => { event.stopPropagation(); navigate(`/search?${new URLSearchParams({ q: customTagSearchQuery(tag), ...(searchType !== "thread" ? { type: searchType } : {}) })}`); }}
    className="inline-flex max-w-full items-center gap-1 rounded border border-(--od-accent)/50 bg-transparent px-1.5 py-0.5 text-[10px] leading-4 text-(--od-accent) hover:border-(--od-accent)">
    <Tag size={10} className="shrink-0" /><span className="truncate">{tag.name}</span>
  </button>;
}
