import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronRight, Gamepad2, Heart, Map, MoreHorizontal, Pencil, Plus, Search, Shapes, Sparkles, Tag, UserRound, X } from "lucide-react";
import "./tag-pool.css";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Select } from "@/shared/ui/Select";
import { ContextMenu, ContextMenuTrigger, ContextMenuButton, ContextMenuContent, ContextMenuItem } from "@/shared/ui/ContextMenu";
import { TagRelationTree, type ParentEdge } from "./TagRelationTree";
import type { components } from "@/shared/types/openapi";

export interface PoolTag {
  id: string;
  name: string;
  category: string;
  aliases: string[];
  parents: string[];
  excludes: string[];
  enabled: boolean;
  source?: "discord" | "custom";
  deleted?: boolean;
  discordSources?: components["schemas"]["DiscordTagSourceResponse"][];
}

interface TagPoolBrowserProps {
  tags: PoolTag[];
  parentEdges?: ParentEdge[];
  categories: string[];
  canManage: boolean;
  onSave: (tag: PoolTag) => void | { tag: PoolTag; error?: string } | Promise<void | { tag: PoolTag; error?: string }>;
  onSearch?: (tag: PoolTag) => void;
  onFilter?: (query: string, category: string) => void;
  selectedIds?: string[];
  disabledIds?: string[];
  onToggle?: (tag: PoolTag) => void;
  extraDetails?: (tag: PoolTag) => ReactNode;
  busy?: boolean;
  error?: string;
  hideHeader?: boolean;
  listFooter?: ReactNode;
  toolbar?: ReactNode;
  relationEditor?: (draft: PoolTag, onChange: (draft: PoolTag) => void) => ReactNode;
}

const buttonClass = "od-inline-action od-inline-action-ghost min-h-10 justify-center disabled:opacity-50";
const categoryIcons = { 癖好: Heart, 作品: BookOpen, 角色: UserRound, 特质: Sparkles, 情节: Shapes, 背景: Map, 玩法: Gamepad2 };
const nameCollator = new Intl.Collator("zh-CN-u-co-pinyin", { numeric: true, sensitivity: "base" });

function CategoryIcon({ category }: { category: string }) {
  const Icon = categoryIcons[category as keyof typeof categoryIcons] ?? Tag;
  return <Icon size={16} aria-hidden="true" />;
}

export function TagPoolBrowser({ tags, parentEdges, categories, canManage, onSave, onSearch, onFilter, selectedIds, disabledIds, onToggle, extraDetails, busy, error, hideHeader, listFooter, toolbar, relationEditor }: TagPoolBrowserProps) {
  const splitRef = useRef<HTMLDivElement>(null);
  const [splitPercent, setSplitPercent] = useState(58);
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [draft, setDraft] = useState<PoolTag | null>(null);
  const draftBaseline = useRef("");
  const draftChanged = draft !== null && JSON.stringify(draft) !== draftBaseline.current;
  const [searchTarget, setSearchTarget] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const selected = tags.find((tag) => tag.id === selectedId);
  // ponytail: 仅排序已加载的标签；完整分类排序需后端在分页前支持拼音排序。
  const visible = tags.filter((tag) =>
    (category === "全部" || tag.category === category) &&
    (!query.trim() || [tag.name, ...tag.aliases].some((name) => name.toLowerCase().includes(query.trim().toLowerCase()))),
  ).sort((a, b) => nameCollator.compare(a.name, b.name) || nameCollator.compare(a.id, b.id));

  function selectTag(tag: PoolTag) {
    if (draftChanged && !window.confirm("放弃当前未保存的标签编辑？")) return;
    setSelectedId(tag.id);
    setMobileDetail(true);
    setDraft(null);
    setSearchTarget(null);
  }

  function createTag(parent?: PoolTag) {
    if (draftChanged && !window.confirm("放弃当前未保存的标签编辑？")) return;
    setSaveError("");
    const initialCategory = parent && parent.category !== "未分类"
      ? parent.category : categories.find((name) => name !== "未分类") ?? "";
    const next = { id: "", name: "", category: initialCategory, aliases: [], parents: parent ? [parent.id] : [], excludes: [], enabled: true };
    draftBaseline.current = JSON.stringify(next);
    setDraft(next);
    setMobileDetail(true);
  }

  function addDraftRelation(tag: PoolTag, field: "parents" | "excludes") {
    setDraft((current) => current && current.id !== tag.id
      ? { ...current, [field]: [...new Set([...current[field], tag.id])] } : current);
    setMobileDetail(true);
  }

  function selectionDisabled(tag: PoolTag) {
    return busy || disabledIds?.includes(tag.id) || ((!tag.enabled || tag.deleted) && !selectedIds?.includes(tag.id));
  }

  function renderRow(tag: PoolTag) {
    const manageable = canManage && !tag.deleted;
    const row = (
        <div
          draggable={manageable && !busy}
          onDragStart={(event) => {
            event.dataTransfer.setData("application/x-odysseia-tag", tag.id);
            event.dataTransfer.effectAllowed = "copy";
          }}
          className={`tag-pool-row flex min-h-10 items-center rounded-md ${selectedId === tag.id ? "tag-pool-row-selected" : ""}`}
        >
          {onToggle && <Checkbox className="shrink-0 p-3" aria-label={`选择${tag.name}`}
            checked={!!(selectedIds?.includes(tag.id) || disabledIds?.includes(tag.id))}
            disabled={selectionDisabled(tag)}
            onChange={() => onToggle(tag)} />}
          {!onToggle && <span className="w-2 shrink-0" />}
          <button type="button" onClick={() => selectTag(tag)} aria-current={selectedId === tag.id ? "true" : undefined}
            className="flex min-h-10 min-w-0 flex-1 items-center gap-2 py-1 pr-2 text-left focus-visible:outline-2 focus-visible:outline-(--od-accent)">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-medium">{tag.name}</span>
              {query && <span className="text-xs text-(--od-text-tertiary)">{tag.aliases.filter(Boolean).join(" · ")}</span>}
            </span>
            {!tag.enabled && <span className="shrink-0 text-xs text-(--od-text-tertiary)">停用</span>}
            {disabledIds?.includes(tag.id) && <span className="shrink-0 text-xs text-(--od-text-tertiary)">已添加</span>}
          </button>
          {manageable && <ContextMenuButton disabled={busy} aria-label={`${tag.name}的管理操作`} className={`${buttonClass} w-10 shrink-0 px-0`}><MoreHorizontal size={16} /></ContextMenuButton>}
        </div>
    );
    return (
      <li key={tag.id} className="tag-pool-node">
        {manageable ? <ContextMenu>
          <ContextMenuTrigger>{row}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem icon={<Plus size={14} />} disabled={busy} onClick={() => createTag(tag)}>新增下级标签</ContextMenuItem>
            {draft && <ContextMenuItem icon={<ChevronDown size={14} />} disabled={busy || draft.id === tag.id || draft.parents.includes(tag.id)} onClick={() => addDraftRelation(tag, "parents")}>添加为上级标签</ContextMenuItem>}
            {draft && <ContextMenuItem icon={<X size={14} />} disabled={busy || draft.id === tag.id || draft.excludes.includes(tag.id)} onClick={() => addDraftRelation(tag, "excludes")}>添加为互斥标签</ContextMenuItem>}
          </ContextMenuContent>
        </ContextMenu> : row}
      </li>
    );
  }

  function relationLinks(ids: string[], selectable = false) {
    return ids.length ? (
      <div className="flex flex-wrap gap-2">{ids.map((id) => {
        const related = tags.find((tag) => tag.id === id);
        if (!related) return <span key={id} className="break-all text-xs text-(--od-text-tertiary)">标签 #{id}（未加载）</span>;
        return <div key={id} className="inline-flex items-center gap-1 rounded-full border border-(--od-border) px-2">
          {selectable && onToggle && <Checkbox aria-label={`选择${related.name}`} checked={!!(selectedIds?.includes(id) || disabledIds?.includes(id))}
            disabled={selectionDisabled(related)} onChange={() => onToggle(related)} />}
          <button type="button" className={buttonClass} onClick={() => selectTag(related)}>{related.name}<ChevronRight size={14} /></button>
        </div>;
      })}</div>
    ) : <p className="text-sm text-(--od-text-tertiary)">暂无</p>;
  }

  return (
    <div className="tag-pool-browser mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col">
      {!hideHeader && !onToggle && <header className="od-page-heading flex shrink-0 items-center justify-between gap-3">
        <div><h1 className="text-xl font-semibold">标签池</h1><p className="mt-1 text-xs text-(--od-text-tertiary)">{onFilter ? "已加载 " : ""}{tags.length} 个标签 · {categories.filter((name) => name !== "未分类").length} 个分类</p></div>
      </header>}
      {(canManage || toolbar) && <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pb-5 pt-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-(--od-text-tertiary)">{toolbar}</div>
        {canManage && <button type="button" disabled={busy} className="od-inline-action od-inline-action-primary min-h-10 disabled:opacity-50"
          onClick={() => createTag()}>
          <Plus size={17} />新增标签
        </button>}
      </div>}
      <div ref={splitRef} className="tag-pool-split" style={{ "--tag-pool-split": `${splitPercent}%` } as CSSProperties}>
        <section id="tag-pool-list" className={`${mobileDetail ? "hidden lg:block" : ""} tag-pool-pane min-w-0 lg:pr-5`}>
          <label className="flex min-h-10 items-center gap-2 border-b border-(--od-border) px-1 focus-within:border-(--od-accent)">
            <Search size={18} className="shrink-0 text-(--od-text-tertiary)" />
            <input aria-label="搜索标签名称或别名" placeholder="搜索名称或别名" value={query} onChange={(event) => { setQuery(event.target.value); onFilter?.(event.target.value, category); }}
              className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
            {query && <button type="button" className="p-2" aria-label="清空搜索" onClick={() => { setQuery(""); onFilter?.("", category); }}><X size={16} /></button>}
          </label>
          <div className="tag-pool-categories mt-3 flex gap-1 overflow-x-auto pb-2" aria-label="标签分类">
            {["全部", ...categories].map((name) => <button type="button" key={name} aria-pressed={category === name}
              onClick={() => { setCategory(name); onFilter?.(query, name); }}
              className={`od-pill-chip min-h-10 shrink-0 ${category === name ? "bg-(--od-accent)/10 font-semibold text-(--od-accent)" : ""}`}><CategoryIcon category={name} />{name}</button>)}
          </div>
          <div className="mt-5 flex items-center justify-between text-xs text-(--od-text-tertiary)"><span>{query ? "搜索结果" : category === "全部" ? "全部标签" : category}</span><span>{visible.length} 个</span></div>
          {categories.map((name) => {
            const groupRoots = visible.filter((tag) => tag.category === name);
            if (!groupRoots.length) return null;
            return <section key={name} className="tag-pool-group mt-4 pt-2" aria-label={`${name}标签`}>
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-(--od-text-secondary)"><CategoryIcon category={name} />{name}</h2>
              <ul>{groupRoots.map((tag) => renderRow(tag))}</ul>
            </section>;
          })}
          {!visible.length && <p className="py-16 text-center text-sm text-(--od-text-tertiary)">没有匹配的标签</p>}
          {listFooter}
        </section>
        <div
          role="separator"
          aria-label="调整标签列表与详情宽度"
          aria-orientation="vertical"
          aria-controls="tag-pool-list"
          aria-valuemin={35}
          aria-valuemax={70}
          aria-valuenow={splitPercent}
          tabIndex={0}
          className="tag-pool-separator hidden lg:block"
          onPointerDown={(event) => { event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const bounds = splitRef.current!.getBoundingClientRect();
            setSplitPercent(Math.round(Math.max(35, Math.min(70, (event.clientX - bounds.left) / bounds.width * 100))));
          }}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            setSplitPercent((value) => event.key === "Home" ? 35 : event.key === "End" ? 70 : Math.max(35, Math.min(70, value + (event.key === "ArrowRight" ? 2 : -2))));
          }}
        />
        <section className={`${mobileDetail ? "" : "hidden lg:block"} tag-pool-pane min-w-0 lg:pl-5`} aria-label="标签详情">
          <button type="button" className={`${buttonClass} mb-4 -ml-3 lg:hidden`} onClick={() => { setMobileDetail(false); setDraft(null); }}><ArrowLeft size={18} />返回标签池</button>
          {draft ? (
            <form onSubmit={async (event) => {
              event.preventDefault(); setSaveError("");
              const saved = { ...draft, name: draft.name.trim() };
              try {
                const result = await onSave(saved);
                if (result?.error) { setDraft(result.tag); setSaveError(result.error); return; }
                setSelectedId(result?.tag.id || saved.id || null); setDraft(null);
              } catch { /* 保留草稿，错误由请求所有者展示。 */ }
            }}>
              <fieldset disabled={busy}>
              <h2 className="mb-6 text-lg font-semibold">{draft.id ? "编辑标签" : "新增标签"}</h2>
              <label className="mb-5 block text-sm">标准名<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="od-ghost-input mt-2 min-h-11 w-full" /></label>
              <div className="mb-5 text-sm"><label htmlFor="pool-tag-category">分类</label><Select id="pool-tag-category" value={draft.category} options={categories.filter((name) => name !== "未分类" || (!!draft.id && draft.category === "未分类")).map((name) => ({ value: name, label: name }))} onChange={(category) => setDraft({ ...draft, category })} className="mt-2" /></div>
              <label className="mb-5 block text-sm">别名<textarea rows={2} placeholder="每行一个别名" value={draft.aliases.join("\n")} onChange={(event) => setDraft({ ...draft, aliases: event.target.value.split("\n") })} className="od-ghost-input mt-2 w-full resize-none" /></label>
              {relationEditor?.(draft, setDraft)}
              {draft.id && <Checkbox className="mt-4" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} label="启用" />}
              <div className="mt-6 flex gap-2"><button className={`${buttonClass} border border-(--od-border)`} type="submit"><Check size={17} />保存</button><button className={buttonClass} type="button" onClick={() => setDraft(null)}>取消</button></div>
              </fieldset>
              {saveError && <p role="alert" className="mt-3 text-sm text-(--od-error)">{saveError}</p>}
            </form>
          ) : selected ? (
            <>
              <p className="text-xs text-(--od-accent)">{selected.category}</p>
              <h2 className="mt-2 break-words text-xl font-semibold">{selected.name}</h2>
              <p className="mt-2 text-xs text-(--od-text-tertiary)">{selected.deleted ? "已删除" : selected.enabled ? "已启用" : "已停用"} · {selected.source === "discord" ? "Discord 原生标签" : "自定义标签"}</p>
              <dl className="mt-5 space-y-4">
                {!!selected.discordSources?.length && <div><dt className="mb-2 text-xs text-(--od-text-tertiary)">DC 来源</dt><dd className="space-y-2">
                  {selected.discordSources.map((source) => <div key={source.id} className="break-all text-xs">
                    <span>{source.name}</span><span className="ml-2 text-(--od-text-tertiary)">频道 {source.channel_id} · Discord 标签 {source.discord_tag_id}</span>
                  </div>)}
                </dd></div>}
                <div><dt className="mb-2 text-xs text-(--od-text-tertiary)">别名</dt><dd className="break-words text-sm">{selected.aliases.filter(Boolean).join(" · ") || "暂无"}</dd></div>
                <div><dt className="mb-2 text-xs text-(--od-text-tertiary)">上级标签</dt><dd>{relationLinks(selected.parents, true)}</dd></div>
                <div><dt className="mb-2 text-xs text-(--od-text-tertiary)">下级标签</dt><dd>{relationLinks(tags.filter((tag) => tag.parents.includes(selected.id)).map((tag) => tag.id), true)}</dd></div>
                <div><dt className="mb-2 text-xs text-(--od-text-tertiary)">互斥标签</dt><dd>{relationLinks(selected.excludes)}</dd></div>
              </dl>
              <TagRelationTree key={selected.id} selectedId={selected.id} tags={tags}
                edges={parentEdges ?? tags.flatMap((tag) => tag.parents.map((id) => ({ source_id: tag.id, target_id: id })))}
                onSelect={selectTag} />
              <div className="mt-5 flex flex-wrap gap-2">
                {!onToggle && <button type="button" className={`${buttonClass} border border-(--od-border)`} onClick={() => onSearch ? onSearch(selected) : setSearchTarget(selected.name)}><Search size={17} />搜索相关帖子</button>}
                {canManage && !selected.deleted && <button type="button" className={buttonClass} onClick={() => { setSaveError(""); draftBaseline.current = JSON.stringify(selected); setDraft({ ...selected }); }}><Pencil size={16} />编辑</button>}
              </div>
              {extraDetails?.(selected)}
              {searchTarget && <p role="status" className="mt-4 break-words text-sm text-(--od-text-secondary)">模拟搜索：{searchTarget}（未发送请求）</p>}
            </>
          ) : <div className="py-20 text-center text-sm text-(--od-text-tertiary)"><Tag className="mx-auto mb-4" size={28} />选择一个标签</div>}
        </section>
      </div>
      {error && <p role="alert" className="px-4 py-3 text-sm text-red-500">{error}</p>}
    </div>
  );
}
