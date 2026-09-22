import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ClipboardList, Pencil, Plus, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { customTagsApi, tagError, type TagTarget, type TargetTags, type CustomTagSnapshot } from "../api/customTagsApi";
import { useTagRole } from "../hooks/useTagRole";
import { LiveTagPool } from "./LiveTagPool";
import type { PoolTag } from "./TagPoolBrowser";
import { isTagsChangedError } from "@/shared/api/tagErrors";
import { TagsChangedNotice } from "./TagsChangedNotice";

const action = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-(--od-border) px-3 text-xs disabled:opacity-50";
const targetKey = (target: TagTarget, userId?: string) => ["custom-tags", "target", target.type, target.id, userId] as const;
const isEditableBinding = (tag: TargetTags["tags"][number]): tag is CustomTagSnapshot =>
  tag.binding_source === "local" && !tag.readonly;

function TagWarnings({ snapshot }: { snapshot: TargetTags }) {
  const name = (id: string) => snapshot.tags.find((tag) => tag.id === id)?.name ?? `#${id}`;
  if (!snapshot.over_limit && !snapshot.conflicting_pairs?.length) return null;
  return <div role="status" className="my-2 space-y-1 text-xs text-(--od-text-secondary)">
    {snapshot.over_limit && <p>当前标签超过 12 个，可删除本地标签；新增前需满足数量限制。</p>}
    {!!snapshot.conflicting_pairs?.length && <p>存在互斥标签：{snapshot.conflicting_pairs.map((pair) => pair.map(name).join(" / ")).join("；")}。可删除本地标签，新增前需消除冲突。</p>}
  </div>;
}

export function TargetTagSection({ target, ownerId, children, onSearch, targetLabel = target.type === "thread" ? "帖子" : "书单" }: { target: TagTarget; ownerId?: string | null; children?: ReactNode; onSearch: (tag: { id: string; name: string }) => void; targetLabel?: string }) {
  const { user, isAuthenticated } = useAuth();
  const role = useTagRole();
  const client = useQueryClient();
  const [editing, setEditing] = useState<{ snapshot: TargetTags; mode: "manage" | "propose" } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState(true);
  const canEdit = !!user?.id && (String(user.id) === ownerId || role.data?.is_management_member === true || role.data?.is_bot_admin === true);
  const snapshot = useQuery({
    queryKey: targetKey(target, user?.id), queryFn: () => customTagsApi.target(target),
    enabled: isAuthenticated, staleTime: 0,
  });
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["custom-tags", "target", target.type, target.id] }),
      client.invalidateQueries({ queryKey: ["custom-tags", "proposals", target.type, target.id] }),
      ...["search", "authors", "discovery", "follows", "booklists", "notifications"].map((key) => client.invalidateQueries({ queryKey: [key] })),
    ]);
  }
  const change = useMutation({ mutationFn: (operation: () => Promise<unknown>) => operation(), onSuccess: refresh });
  const open = useMutation({
    mutationFn: async (mode: "manage" | "propose") => ({ snapshot: await customTagsApi.target(target), mode }),
    onSuccess: (data) => { client.setQueryData(targetKey(target, user?.id), data.snapshot); setEditing(data); },
  });
  const proposals = useInfiniteQuery({
    queryKey: ["custom-tags", "proposals", target.type, target.id, user?.id, canEdit && reviewQueue],
    queryFn: ({ pageParam }) => customTagsApi.proposals(target, canEdit && reviewQueue, pageParam),
    enabled: historyOpen && isAuthenticated, initialPageParam: 0,
    getNextPageParam: (page, pages) => page.length === 100 ? pages.flat().length : undefined,
  });
  if (!isAuthenticated) return <div className="mb-6 flex flex-wrap gap-2">{children}</div>;
  const custom = (snapshot.data?.tags ?? []).filter(isEditableBinding);
  return <div className="mb-6 space-y-3">
    <div className="flex flex-wrap items-center gap-2">
    {children}
    {custom.map((tag) => <div key={tag.binding_id} className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-(--od-border-strong) bg-transparent pl-2.5 pr-1 text-xs leading-4 text-(--od-text-secondary)">
      <button type="button" className="min-h-7 min-w-0 break-words py-1 text-left hover:text-(--od-accent) focus-visible:outline-2 focus-visible:outline-(--od-accent)" title={tag.category_name ?? undefined}
        aria-label={`搜索标签${tag.name}`} onClick={() => onSearch(tag)}># {tag.name}{!tag.enabled && "（停用）"}</button>
      {([1, -1] as const).map((vote) => <button key={vote} type="button" disabled={change.isPending} aria-label={`${vote === 1 ? "赞同" : "反对"}标签${tag.name}`} aria-pressed={tag.my_vote === vote}
        className={`inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-full px-1 text-xs leading-4 hover:text-(--od-accent) ${tag.my_vote === vote ? "text-(--od-accent)" : "text-(--od-text-tertiary)"}`}
        onClick={() => change.mutate(() => customTagsApi.vote(target, tag.binding_id, tag.my_vote === vote ? 0 : vote))}>
        {vote === 1 ? <ThumbsUp size={12} className="block shrink-0" /> : <ThumbsDown size={12} className="block shrink-0" />}<span className="tabular-nums">{vote === 1 ? tag.upvotes : tag.downvotes}</span>
      </button>)}
    </div>)}
    </div>
    {snapshot.data && <TagWarnings snapshot={snapshot.data} />}
    <div role="group" aria-label="标签操作" className="flex flex-wrap items-center gap-x-3 gap-y-1">
    {canEdit && <button className="od-pill-chip min-h-9 text-(--od-accent) disabled:opacity-50" disabled={open.isPending || !snapshot.data || role.isPending || role.isError} onClick={() => open.mutate("manage")}><Pencil size={14} />管理标签</button>}
    <button className="od-pill-chip min-h-9 text-(--od-accent) disabled:opacity-50" disabled={open.isPending || !snapshot.data} onClick={() => open.mutate("propose")}><Plus size={14} />提议标签</button>
    <button className="od-pill-chip min-h-9" onClick={() => setHistoryOpen(!historyOpen)} aria-expanded={historyOpen}><ClipboardList size={14} />{canEdit ? "申请记录" : "我的申请"}</button>
    </div>
    {snapshot.isPending && <p role="status" className="text-xs">正在读取标签…</p>}
    {[snapshot.error, role.error, change.error, open.error].filter(Boolean).map((error, index) => <p key={index} role="alert" className="mt-2 text-xs text-red-500">{tagError(error).message}</p>)}
    {(role.isError || snapshot.isError) && <button className={action} onClick={() => { void role.refetch(); void snapshot.refetch(); }}>重新读取</button>}
    {historyOpen && <div className="mt-3 w-full space-y-3 text-xs">
      {canEdit && <div role="group" aria-label="申请范围" className="flex gap-1">
        {[{ value: true, label: "待审核" }, { value: false, label: "我的申请" }].map((option) =>
          <button key={option.label} type="button" aria-pressed={reviewQueue === option.value} onClick={() => setReviewQueue(option.value)}
            className={`od-pill-chip min-h-8 ${reviewQueue === option.value ? "bg-(--od-accent)/10 text-(--od-accent)" : "text-(--od-text-tertiary)"}`}>{option.label}</button>)}
      </div>}
      {proposals.isPending && <p role="status">正在读取申请…</p>}
      {proposals.isSuccess && (proposals.data?.pages?.flat().length ?? 0) === 0 && <p>暂无申请</p>}
      {proposals.data?.pages?.flat().map((proposal) => <div key={proposal.id} className="flex flex-wrap items-center gap-2 border-b border-(--od-border) pb-2">
        <span title={`标签 ID：${proposal.tag_id}`}>{proposal.tag_name} · {{ pending: "待审核", approved: "已通过", rejected: "已拒绝", failed: "生效失败" }[proposal.status]}</span>
        <time dateTime={proposal.created_at}>{new Date(proposal.created_at).toLocaleString()}</time>
        {proposal.status === "pending" && <span>截止 {new Date(proposal.due_at).toLocaleString()}</span>}
        {proposal.reason && <span>{proposal.reason === "tag_merged" ? "标签已合并，原申请已结束，请重新选择标签提交。" : proposal.reason}</span>}
        {canEdit && proposal.status === "pending" && <><button className={action} disabled={change.isPending} onClick={() => change.mutate(() => customTagsApi.review(target, proposal.id, true))}><Check size={14} />同意</button><button className={action} disabled={change.isPending} onClick={() => change.mutate(() => customTagsApi.review(target, proposal.id, false))}><X size={14} />拒绝</button></>}
      </div>)}
      {proposals.isError && <p role="alert">{tagError(proposals.error).message}<button className={action} onClick={() => void proposals.refetch()}>重试</button></p>}
      {proposals.hasNextPage && <button className={action} disabled={proposals.isFetchingNextPage} onClick={() => void proposals.fetchNextPage()}>更多申请</button>}
    </div>}
    {editing && <TagSelectionDialog key={`${target.type}/${target.id}/${editing.mode}`} target={target} targetLabel={targetLabel} initial={editing.snapshot} canEdit={editing.mode === "manage" && canEdit} onClose={() => setEditing(null)} onSaved={refresh} />}
  </div>;
}

function TagSelectionDialog({ target, targetLabel, initial, canEdit, onClose, onSaved }: {
  target: TagTarget; targetLabel: string; initial: TargetTags; canEdit: boolean; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(() => new Map(canEdit ? initial.tags.filter(isEditableBinding).map((tag) => [tag.id, tag.name]) : []));
  const [baseline, setBaseline] = useState(initial);
  const [conflict, setConflict] = useState<TargetTags | null>(null);
  const [conflictPending, setConflictPending] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  const existingIds = baseline.tags.map((tag) => tag.id);
  const readonlyIds = baseline.tags.filter((tag) => !isEditableBinding(tag)).map((tag) => tag.id);
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => { dialog.close(); opener?.focus({ preventScroll: true }); };
  }, []);
  const submit = useMutation({
    mutationFn: async () => {
      setFailures([]);
      if (canEdit) {
        try { await customTagsApi.replace(target, baseline.version, [...selected.keys()].filter((id) => !readonlyIds.includes(id))); }
        catch (error) {
          if (tagError(error).code === "stale_version") {
            setConflictPending(true);
            setConflict(await customTagsApi.target(target));
          }
          throw error;
        }
      } else {
        const failed: string[] = [];
        // 每个请求有独立结果，不自动重试已经成功的申请。
        for (const [id, name] of selected) {
          try {
            await customTagsApi.propose(target, id);
            setSelected((current) => { const next = new Map(current); next.delete(id); return next; });
          } catch (error) { failed.push(`${name}：${tagError(error).message}`); }
        }
        setFailures(failed);
        if (failed.length) { await onSaved(); return false; }
      }
      await onSaved();
      return true;
    },
    onSuccess: (done) => { if (done) onClose(); },
  });
  const reloadConflict = useMutation({ mutationFn: () => customTagsApi.target(target), onSuccess: setConflict });
  function toggle(tag: PoolTag) {
    if (readonlyIds.includes(tag.id) || (!canEdit && existingIds.includes(tag.id))) return;
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(tag.id)) next.delete(tag.id); else next.set(tag.id, tag.name);
      return next;
    });
  }
  return createPortal(<dialog ref={ref} aria-labelledby="tag-selection-title"
    className="tag-selection-dialog fixed inset-0 m-auto w-[min(1100px,calc(100vw-24px))] max-w-none overflow-hidden rounded-lg border border-(--od-border) bg-(--od-bg) p-0 text-(--od-text-primary) shadow-xl backdrop:bg-black/50"
    onCancel={(e) => { e.preventDefault(); if (!submit.isPending) onClose(); }}
    onKeyDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-(--od-border) px-4 py-3">
        <h2 id="tag-selection-title" className="text-base font-semibold">{canEdit ? "管理" : "提议"}{targetLabel}标签</h2>
        <button className={action} disabled={submit.isPending} aria-label="关闭标签选择" onClick={onClose}><X size={17} /></button>
      </header>
      <div className="min-h-0 flex-1 px-4 py-4 sm:px-6">
        <LiveTagPool selectedIds={[...selected.keys()]} disabledIds={canEdit ? readonlyIds : existingIds} onToggle={toggle} busy={submit.isPending}
          source={target.type === "thread" ? "custom" : undefined} />
      </div>
      <footer className="max-h-[35dvh] shrink-0 overflow-y-auto border-t border-(--od-border) p-4">
        <div className="mb-3 flex flex-wrap gap-2">{[...selected].map(([id, name]) => <button key={id} className={action} disabled={submit.isPending} onClick={() => setSelected((current) => { const next = new Map(current); next.delete(id); return next; })}>{name}<X size={12} /></button>)}</div>
        <p className="mb-2 text-xs text-(--od-text-tertiary)">已选本地标签 {selected.size} 个{canEdit && readonlyIds.length > 0 && ` · DC 同步标签 ${readonlyIds.length} 个（只读）`}{canEdit && " · 合计上限 12 个"}</p>
        <TagWarnings snapshot={baseline} />
        {conflictPending && <div role="alert" className="mb-3 text-sm">
          <p>标签已被修改。本地选择已保留，请核对最新集合后确认。</p>
          {conflict ? <><p className="my-2">最新标签：{conflict.tags.map((tag) => tag.name).join("、") || "无"}</p><button className={action} onClick={() => {
            const readonly = new Set(conflict.tags.filter((tag) => !isEditableBinding(tag)).map((tag) => tag.id));
            setSelected((current) => new Map([...current].filter(([id]) => !readonly.has(id))));
            setBaseline(conflict); setConflict(null); setConflictPending(false); submit.reset();
          }}>已核对，以当前选择替换</button></> :
            <button className={action} disabled={reloadConflict.isPending} onClick={() => reloadConflict.mutate()}>读取最新集合</button>}
          {reloadConflict.isError && <p>{tagError(reloadConflict.error).message}</p>}
        </div>}
        {submit.isError && <p role="alert" className="mb-2 text-sm text-red-500">{tagError(submit.error).message}</p>}
        {isTagsChangedError(submit.error) && <TagsChangedNotice />}
        {failures.map((failure) => <p role="alert" key={failure} className="mb-1 text-xs text-red-500">{failure}</p>)}
        <button className={`${action} bg-(--od-accent) text-white`} disabled={submit.isPending || conflictPending || (!canEdit && selected.size === 0)} onClick={() => submit.mutate()}>{submit.isPending ? "提交中…" : canEdit ? "保存标签" : "提交提议"}</button>
      </footer>
    </div>
  </dialog>, document.body);
}
