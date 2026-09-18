import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Merge } from "lucide-react";
import { Select } from "@/shared/ui/Select";
import { customTagsApi, tagError, type MergePreview } from "../api/customTagsApi";
import type { PoolTag } from "./TagPoolBrowser";

const action = "od-inline-action od-inline-action-ghost min-h-10 disabled:opacity-50";

export function TagMergeActions({ tag, tags }: { tag: PoolTag; tags: PoolTag[] }) {
  const client = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const candidates = tags.filter((item) => item.id !== tag.id && !item.deleted && item.name === tag.name &&
    (tag.source !== "discord" || item.source === "discord"));
  const preflight = useMutation({
    mutationFn: () => customTagsApi.mergePreview(tag.id, targetId),
    onSuccess: setPreview,
  });
  const execute = useMutation({
    mutationFn: (confirmed: MergePreview) => customTagsApi.merge(tag.id, {
      target_tag_id: confirmed.target_tag_id, version: confirmed.version,
    }),
    onSuccess: async () => {
      setPreview(null);
      setTargetId("");
      await Promise.all(["custom-tags", "search", "booklists", "authors", "discovery", "notifications"]
        .map((key) => client.invalidateQueries({ queryKey: [key] })));
    },
    onError: (error) => {
      if (tagError(error).code === "stale_merge") setPreview(null);
    },
  });
  if (tag.deleted || !candidates.length) return null;
  const busy = preflight.isPending || execute.isPending;
  return <fieldset disabled={busy} className="mt-5 space-y-3 border-t border-(--od-border) pt-4">
    <legend className="text-sm">合并同名标签</legend>
    <Select value={targetId} options={[{ value: "", label: "选择保留的标签" }, ...candidates.map((item) => ({
      value: item.id, label: `${item.name} · ${item.source === "discord" ? "DC" : item.category} · #${item.id}`,
    }))]} onChange={(id) => { setTargetId(id); setPreview(null); preflight.reset(); execute.reset(); }} />
    <button type="button" className={action} disabled={!targetId || busy} onClick={() => { setPreview(null); execute.reset(); preflight.mutate(); }}><Merge size={14} />{preflight.isPending ? "预检中…" : "预检合并"}</button>
    {preview && <div className="space-y-2 text-xs">
      <p>旧标签：{preview.source_name} #{preview.source_tag_id}</p>
      <p>保留标签：{preview.target_name} #{preview.target_tag_id}</p>
      <p>影响 {preview.binding_count} 个有效绑定、{preview.proposal_count} 个待审核申请、{preview.relation_count} 条关系。</p>
      <p>旧标签将被删除且不可恢复，待审核申请会结束。旧搜索 ID 不会自动替换。</p>
      {preview.conflicts.map((message, index) => <p role="alert" key={index} className="text-(--od-error)">{message}</p>)}
      <button type="button" className={`${action} text-(--od-error)`} disabled={!preview.can_merge || busy}
        onClick={() => {
          if (window.confirm(`确认将 #${preview.source_tag_id} 合并至 #${preview.target_tag_id}？旧标签不可恢复。`)) execute.mutate(preview);
        }}>确认合并</button>
    </div>}
    {execute.isSuccess && <p role="status" className="text-xs">合并完成，请使用保留的标签。</p>}
    {preflight.isError && <p role="alert" className="text-xs text-(--od-error)">{tagError(preflight.error).message}</p>}
    {execute.isError && <p role="alert" className="text-xs text-(--od-error)">{tagError(execute.error).code === "stale_merge" ? "标签已变化，请重新预检后确认。" : tagError(execute.error).message}</p>}
  </fieldset>;
}
