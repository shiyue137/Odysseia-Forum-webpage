import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { PoolTag } from "./TagPoolBrowser";

export interface ParentEdge { source_id: string; target_id: string }

export function TagRelationTree({ selectedId, tags, edges, onSelect }: {
  selectedId: string; tags: PoolTag[]; edges: ParentEdge[]; onSelect: (tag: PoolTag) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    parents.set(edge.source_id, [...(parents.get(edge.source_id) ?? []), edge.target_id]);
    children.set(edge.target_id, [...(children.get(edge.target_id) ?? []), edge.source_id]);
  }
  function reachable(adjacency: Map<string, string[]>) {
    const visited = new Set<string>([selectedId]);
    const pending = [selectedId];
    while (pending.length) {
      for (const id of adjacency.get(pending.pop()!) ?? []) {
        if (!visited.has(id)) { visited.add(id); pending.push(id); }
      }
    }
    return visited;
  }
  const included = new Set([...reachable(parents), ...reachable(children)]);
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const collator = new Intl.Collator("zh-CN-u-co-pinyin", { numeric: true });
  const sort = (ids: string[]) => ids.sort((a, b) => collator.compare(byId.get(a)?.name ?? a, byId.get(b)?.name ?? b));
  const roots = sort([...included].filter((id) => !(parents.get(id) ?? []).some((parent) => included.has(parent))));
  function renderNode(id: string, path: string[] = []) {
    const tag = byId.get(id);
    const descendants = sort((children.get(id) ?? []).filter((child) => included.has(child) && !path.includes(child)));
    const expanded = !collapsed.includes(id);
    return <li key={[...path, id].join("/")} className="tag-pool-node">
      <div className={`tag-pool-row flex min-h-10 items-center rounded-md ${id === selectedId ? "tag-pool-row-selected" : ""}`}>
        {descendants.length ? <button type="button" aria-label={`${expanded ? "收起" : "展开"}${tag?.name ?? id}`} aria-expanded={expanded}
          className="inline-flex min-h-10 w-8 shrink-0 items-center justify-center text-(--od-text-tertiary) hover:text-(--od-accent) focus-visible:outline-2 focus-visible:outline-(--od-accent)"
          onClick={() => setCollapsed((current) => expanded ? [...current, id] : current.filter((item) => item !== id))}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button> : <span className="w-8 shrink-0" />}
        {tag ? <button type="button" aria-current={id === selectedId ? "true" : undefined} onClick={() => onSelect(tag)}
          className="min-h-10 min-w-0 flex-1 break-words py-1 pr-2 text-left text-sm hover:text-(--od-accent) focus-visible:outline-2 focus-visible:outline-(--od-accent)">
          {tag.name}<span className="ml-2 text-xs text-(--od-text-tertiary)">{tag.category}</span>
        </button> : <span className="min-w-0 break-all py-2 text-xs text-(--od-text-tertiary)">标签 #{id}（未加载）</span>}
      </div>
      {expanded && descendants.length > 0 && <ul className="tag-pool-children">{descendants.map((child) => renderNode(child, [...path, id]))}</ul>}
    </li>;
  }
  return <section className="mt-5" aria-label="标签关系树">
    <h3 className="mb-2 text-xs text-(--od-text-tertiary)">关系溯源</h3>
    <ul>{roots.map((id) => renderNode(id))}</ul>
  </section>;
}
