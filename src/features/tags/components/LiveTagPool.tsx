import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Trash2 } from "lucide-react";
import { customTagsApi, tagError } from "../api/customTagsApi";
import { useTagRole } from "../hooks/useTagRole";
import { TagPoolBrowser, type PoolTag } from "./TagPoolBrowser";
import { Checkbox } from "@/shared/ui/Checkbox";
import { WordLoader } from "@/shared/ui/loaders/WordLoader";
import { TagRelationFields } from "./TagRelationFields";
import { savePoolTag } from "../lib/savePoolTag";
import { customTagSearchQuery } from "@/shared/lib/searchTokenizer";

const action = "inline-flex min-h-10 items-center gap-2 rounded-md border border-(--od-border) px-3 text-xs disabled:opacity-50";

export function LiveTagPool({ selectedIds, disabledIds, onToggle, busy = false }: {
  selectedIds?: string[];
  disabledIds?: string[];
  onToggle?: (tag: PoolTag) => void;
  busy?: boolean;
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const role = useTagRole();
  const canManage = !onToggle && role.data?.is_bot_admin === true;
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const categories = useQuery({ queryKey: ["custom-tags", "categories"], queryFn: customTagsApi.categories });
  const relations = useQuery({ queryKey: ["custom-tags", "relations"], queryFn: customTagsApi.relations });
  const pool = useQuery({
    queryKey: ["custom-tags", "pool", !!onToggle, includeDeleted && canManage],
    queryFn: ({ signal }) => customTagsApi.poolAll({
      q: "", selectable: !!onToggle, include_deleted: includeDeleted && canManage,
    }, signal),
  });
  const items = pool.data ?? [];
  const filteredItems = onToggle ? items.filter((item) => item.source !== "discord") : items;
  const seenDiscordNames = new Set<string>();
  const tags: PoolTag[] = [];
  for (const item of filteredItems) {
    if (item.source === "discord") {
      if (seenDiscordNames.has(item.name)) continue;
      seenDiscordNames.add(item.name);
    }
    tags.push({
      id: item.id, name: item.name, category: item.category_name ?? "原生",
      enabled: item.enabled, deleted: !!item.deleted_at, source: item.source, aliases: item.aliases,
      parents: (relations.data ?? []).filter((edge) => edge.kind === "implies" && edge.source_id === item.id).map((edge) => edge.target_id),
      excludes: (relations.data ?? []).filter((edge) => edge.kind === "excludes" && (edge.source_id === item.id || edge.target_id === item.id)).map((edge) => edge.source_id === item.id ? edge.target_id : edge.source_id),
    });
  }
  const save = useMutation({
    mutationFn: async (tag: PoolTag) => {
      const categoryValue = categories.data?.find((item) => item.name === tag.category)?.value;
      if (!categoryValue) throw new Error("请选择有效分类");
      return savePoolTag(tag, categoryValue);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["custom-tags"] }),
  });
  const errors = [categories.error, relations.error, pool.error, save.error].filter(Boolean);

  if (pool.isLoading || categories.isLoading) {
    return (
      <div className="flex h-full min-h-60 flex-1 flex-col items-center justify-center py-16">
        <WordLoader className="scale-75 sm:scale-90 md:scale-100 opacity-90" />
        <p className="mt-8 animate-pulse text-xs tracking-wider text-(--od-text-tertiary)">
          正在载入标签池…
        </p>
      </div>
    );
  }

  return <div className="flex h-full min-h-0 flex-col">
    {!onToggle && role.isError && <p role="alert" className="p-4 text-sm">管理身份读取失败：{tagError(role.error).message} <button className={action} onClick={() => void role.refetch()}>重试</button></p>}
    <TagPoolBrowser tags={tags} categories={[...(categories.data ?? []).map((item) => item.name), ...(!onToggle ? ["原生"] : [])]}
      parentEdges={relations.data?.filter((edge) => edge.kind === "implies")}
      hideHeader
      toolbar={canManage ? <Checkbox checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} label="包含已删除标签" /> : undefined}
      listFooter={pool.isError ? <div className="flex min-h-10 items-center justify-center pt-4">
        <button className={action} onClick={() => void pool.refetch()}>重新加载</button>
      </div> : undefined}
      canManage={canManage} onSave={(tag) => save.mutateAsync(tag)} busy={busy || save.isPending}
      relationEditor={(draft, onChange) => <TagRelationFields draft={draft} tags={tags} onChange={onChange} />}
      onSearch={(tag) => navigate(`/search?${new URLSearchParams({ q: customTagSearchQuery(tag) })}`)}
      selectedIds={selectedIds} disabledIds={disabledIds} onToggle={onToggle}
      extraDetails={canManage ? (tag) => tag.source === "custom" ? <TagAdminActions key={tag.id} tag={tag} /> : null : undefined}
      error={errors.map((error) => tagError(error).message).join("；")} />
  </div>;
}

function TagAdminActions({ tag }: { tag: PoolTag }) {
  const client = useQueryClient();
  const [auditOpen, setAuditOpen] = useState(false);
  const audit = useInfiniteQuery({
    queryKey: ["custom-tags", "audit", tag.id],
    queryFn: ({ pageParam }) => customTagsApi.audit("tag", tag.id, pageParam),
    enabled: auditOpen, initialPageParam: 0,
    getNextPageParam: (page, pages) => page.length === 100 ? pages.flat().length : undefined,
  });
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["custom-tags"] });
      await client.invalidateQueries({ queryKey: ["search"] });
    },
  });
  return <fieldset disabled={mutation.isPending} className="mt-4 space-y-3">
    {tag.deleted ? <button className={action} onClick={() => mutation.mutate(() => customTagsApi.restore(tag.id))}><RotateCcw size={15} />恢复实体</button> :
      <button className={`${action} text-red-500`} onClick={() => {
        if (window.confirm(`删除“${tag.name}”会结束现有绑定与待审核申请。恢复实体不会恢复这些内容。确定删除？`)) mutation.mutate(() => customTagsApi.remove(tag.id));
      }}><Trash2 size={15} />删除标签</button>
    }
    <p className="break-all text-xs text-(--od-text-tertiary)">ID：{tag.id}</p>
    <button className={action} onClick={() => setAuditOpen(!auditOpen)} aria-expanded={auditOpen}>管理记录</button>
    {auditOpen && <div className="space-y-2 text-xs">{audit.data?.pages.flat().map((item) => <p key={item.id}>{new Date(item.created_at).toLocaleString()} · {item.type} · {item.actor_id ?? "系统"}</p>)}
      {audit.isError && <p role="alert">{tagError(audit.error).message}</p>}
      {audit.hasNextPage && <button className={action} disabled={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()}>更多记录</button>}
    </div>}
    {mutation.isError && <p role="alert" className="text-sm text-red-500">{tagError(mutation.error).message}</p>}
  </fieldset>;
}
