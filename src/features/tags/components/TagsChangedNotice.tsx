import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { refreshTagCandidates } from "../lib/refreshTagCandidates";

export function TagsChangedNotice() {
  const client = useQueryClient();
  const refresh = useMutation({ mutationFn: () => refreshTagCandidates(client) });
  return <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-(--od-text-secondary)">
    <p>标签已发生变化，请刷新候选并重新选择。原搜索条件未自动替换。</p>
    <button type="button" className="od-inline-action od-inline-action-ghost" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
      <RefreshCw size={14} />{refresh.isPending ? "刷新中…" : "刷新标签候选"}
    </button>
    {refresh.isSuccess && <span>候选已刷新，请移除失效的标签条件后重新选择。</span>}
    {refresh.isError && <span>候选刷新失败，请稍后重试。</span>}
  </div>;
}
