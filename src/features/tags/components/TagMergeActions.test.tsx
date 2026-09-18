import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { beforeEach, expect, it, vi } from "vitest";
import { TagMergeActions } from "./TagMergeActions";
import { customTagsApi, type MergePreview } from "../api/customTagsApi";
import type { PoolTag } from "./TagPoolBrowser";

vi.mock("../api/customTagsApi", async (original) => {
  const real = await original<typeof import("../api/customTagsApi")>();
  return { ...real, customTagsApi: { mergePreview: vi.fn(), merge: vi.fn() } };
});
vi.mock("@/shared/ui/Select", () => ({
  Select: ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) =>
    <select aria-label="保留标签" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>,
}));
const source: PoolTag = { id: "1", name: "纯爱", source: "custom", category: "情节", enabled: true, aliases: [], parents: [], excludes: [] };
const kept: PoolTag = { ...source, id: "90071992547409931", source: "discord" };
const preview: MergePreview = { source_tag_id: source.id, target_tag_id: kept.id, source_name: source.name, target_name: kept.name,
  version: "v1", can_merge: true, conflicts: [], binding_count: 8, proposal_count: 2, relation_count: 3 };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(customTagsApi.mergePreview).mockResolvedValue(preview);
});
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}><TagMergeActions tag={source} tags={[source, kept]} /></QueryClientProvider>);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: kept.id } });
  return invalidate;
}
it("只在预检并确认后写入，保留大整数 ID 与预检版本，刷新所有相关数据", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const invalidate = mount();
  fireEvent.click(screen.getByRole("button", { name: "预检合并" }));
  expect(await screen.findByText("影响 8 个有效绑定、2 个待审核申请、3 条关系。")).toBeInTheDocument();
  expect(customTagsApi.merge).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "确认合并" }));
  await waitFor(() => expect(customTagsApi.merge).toHaveBeenCalledWith("1", { target_tag_id: kept.id, version: "v1" }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["custom-tags"] }));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["booklists"] });
  confirm.mockRestore();
});
it("预检冲突禁止执行，版本过期移除确认入口且不自动重试", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.mocked(customTagsApi.mergePreview).mockResolvedValueOnce({ ...preview, can_merge: false, conflicts: ["关系冲突"] }).mockResolvedValue(preview);
  mount();
  fireEvent.click(screen.getByRole("button", { name: "预检合并" }));
  expect(await screen.findByText("关系冲突")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认合并" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "预检合并" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "确认合并" })).toBeEnabled());
  vi.mocked(customTagsApi.merge).mockRejectedValue(new AxiosError("conflict", undefined, undefined, undefined,
    { status: 409, data: { detail: { code: "stale_merge", message: "过期" } } } as never));
  fireEvent.click(screen.getByRole("button", { name: "确认合并" }));
  expect(await screen.findByText("标签已变化，请重新预检后确认。")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "确认合并" })).not.toBeInTheDocument();
  expect(customTagsApi.merge).toHaveBeenCalledTimes(1);
  confirm.mockRestore();
});
