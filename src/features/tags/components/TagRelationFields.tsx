import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Checkbox } from "@/shared/ui/Checkbox";
import { customTagsApi, tagError } from "../api/customTagsApi";
import type { PoolTag } from "./TagPoolBrowser";

export function TagRelationFields({ draft, tags, onChange }: {
  draft: PoolTag; tags: PoolTag[]; onChange: (tag: PoolTag) => void;
}) {
  return <div className="space-y-5">
    <RelationField label="上级标签" ids={draft.parents} selfId={draft.id} tags={tags} onChange={(parents) => onChange({ ...draft, parents })} />
    <RelationField label="互斥标签" ids={draft.excludes} selfId={draft.id} tags={tags} onChange={(excludes) => onChange({ ...draft, excludes })} />
  </div>;
}

function RelationField({ label, ids, selfId, tags, onChange }: {
  label: string; ids: string[]; selfId: string; tags: PoolTag[]; onChange: (ids: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: Event) => {
      if (!fieldRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [input]);
  const results = useInfiniteQuery({
    queryKey: ["custom-tags", "relation-candidates", query],
    queryFn: ({ pageParam, signal }) => customTagsApi.pool({ q: query, selectable: false, include_deleted: false, offset: pageParam }, signal),
    enabled: open,
    initialPageParam: 0,
    getNextPageParam: (page, pages) => page.length === 100 ? pages.flat().length : undefined,
  });
  const candidates = results.data?.pages?.flat().filter((tag) => tag.source === "custom" && tag.id !== selfId) ?? [];
  return <div ref={fieldRef} className={`text-sm ${dragging ? "outline-2 outline-dashed outline-(--od-accent) outline-offset-4" : ""}`}
    onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); } }}
    onDragOver={(event) => {
      if (!event.dataTransfer.types.includes("application/x-odysseia-tag")) return;
      event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDragging(true);
    }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={(event) => {
      setDragging(false);
      const id = event.dataTransfer.getData("application/x-odysseia-tag");
      if (!id) return;
      event.preventDefault();
      const tag = tags.find((item) => item.id === id && item.source !== "discord" && !item.deleted);
      if (!tag || id === selfId || ids.includes(id)) return;
      setNames((current) => ({ ...current, [id]: tag.name }));
      onChange([...ids, id]);
    }}>
    <p className="mb-2">{label}</p>
    {ids.length > 0 && <div className="mb-2 flex flex-wrap gap-1">{ids.map((id) => (
      <button key={id} type="button" className="od-pill-chip max-w-full bg-(--od-accent)/10 text-(--od-accent)"
        aria-label={`移除${label} ${names[id] ?? tags.find((tag) => tag.id === id)?.name ?? id}`} onClick={() => onChange(ids.filter((item) => item !== id))}>
        <span className="truncate">{names[id] ?? tags.find((tag) => tag.id === id)?.name ?? `#${id}`}</span><X size={12} className="shrink-0" />
      </button>
    ))}</div>}
    <label className="flex items-center gap-2 border-b border-(--od-border) focus-within:border-(--od-accent)">
      <Search size={14} className="shrink-0 text-(--od-text-tertiary)" />
      <input aria-label={`搜索${label}`} value={input} onFocus={() => setOpen(true)} onChange={(e) => { setInput(e.target.value); setOpen(true); }} placeholder="搜索标签名称或别名" className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
    </label>
    {open && <div className="mt-2 flex max-h-44 flex-col gap-1 overflow-y-auto">
      {results.isFetching && <p role="status" className="py-2 text-xs text-(--od-text-tertiary)">正在查找…</p>}
      {candidates.map((tag) => <Checkbox key={tag.id} className="flex min-h-10 items-center py-2" checked={ids.includes(tag.id)} label={`${tag.name} · ${tag.category_name}`}
        onChange={() => { setNames((current) => ({ ...current, [tag.id]: tag.name })); onChange(ids.includes(tag.id) ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]); }} />)}
      {results.isSuccess && !candidates.length && <p className="py-2 text-xs text-(--od-text-tertiary)">没有匹配的标签</p>}
      {results.isError && <p role="alert" className="py-2 text-xs text-(--od-error)">{tagError(results.error).message}</p>}
      {results.hasNextPage && <button type="button" className="od-inline-action od-inline-action-ghost" disabled={results.isFetchingNextPage} onClick={() => void results.fetchNextPage()}>加载更多</button>}
    </div>}
  </div>;
}
